const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const MAX_BODY_LENGTH = 1_000_000;
const ALLOWED_STATUSES = new Set(["new", "success", "returned", "error", "server_error"]);

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeBase64(value: string): string {
  return value.trim().replace(/ /g, "+");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function createSignature(privateKey: string, data: string): Promise<string> {
  const input = new TextEncoder().encode(`${privateKey}${data}${privateKey}`);
  const digest = await crypto.subtle.digest("SHA-1", input);
  return bytesToBase64(new Uint8Array(digest));
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return difference === 0;
}

function decodePayload(data: string): JsonRecord {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const payload: unknown = JSON.parse(decoded);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Callback payload must be a JSON object");
  }

  return payload as JsonRecord;
}

function optionalString(value: unknown, maxLength = 512): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function requiredString(value: unknown, maxLength: number): string {
  const normalized = optionalString(value, maxLength);
  if (!normalized) throw new Error("Required callback field is missing");
  return normalized;
}

function normalizeStatus(value: unknown): string {
  const status = requiredString(value, 32).toLowerCase().replaceAll("-", "_");
  if (status === "failed") return "error";
  if (!ALLOWED_STATUSES.has(status)) throw new Error("Unknown Epoint status");
  return status;
}

function normalizeAmount(value: unknown): string {
  const normalized = requiredString(value, 32).replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error("Invalid payment amount");
  }
  return Number(normalized).toFixed(2);
}

function redactPayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactPayload(item, depth + 1));
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? value.slice(0, 2_000) : value;
  }

  const result: JsonRecord = {};
  for (const [key, item] of Object.entries(value as JsonRecord).slice(0, 100)) {
    if (/^(cvv|cvc|pan|private_key|secret|signature)$/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = redactPayload(item, depth + 1);
    }
  }
  return result;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getAdminKey(): string | null {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy key during the 2026 key migration period.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

async function readRequestFields(req: Request): Promise<{ data: string; signature: string }> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_LENGTH) throw new Error("Request body is too large");

  const body = await req.text();
  if (body.length > MAX_BODY_LENGTH) throw new Error("Request body is too large");

  let data: unknown;
  let signature: unknown;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const parsed = JSON.parse(body) as JsonRecord;
    data = parsed.data;
    signature = parsed.signature;
  } else {
    const parsed = new URLSearchParams(body);
    data = parsed.get("data");
    signature = parsed.get("signature");
  }

  return {
    data: normalizeBase64(requiredString(data, MAX_BODY_LENGTH)),
    signature: normalizeBase64(requiredString(signature, 256)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = getAdminKey();
  if (!privateKey || !supabaseUrl || !adminKey) {
    console.error("Epoint callback is missing required server secrets");
    return jsonResponse({ ok: false, error: "service_not_configured" }, 503);
  }

  try {
    const { data, signature } = await readRequestFields(req);
    const expectedSignature = await createSignature(privateKey, data);
    if (!constantTimeEqual(expectedSignature, signature)) {
      return jsonResponse({ ok: false, error: "invalid_signature" }, 401);
    }

    const payload = decodePayload(data);
    const configuredPublicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
    const payloadPublicKey = optionalString(payload.public_key, 128);
    if (configuredPublicKey && payloadPublicKey !== configuredPublicKey) {
      return jsonResponse({ ok: false, error: "invalid_public_key" }, 401);
    }

    const merchantOrderId = requiredString(payload.order_id, 128);
    const amount = normalizeAmount(payload.amount);
    const status = normalizeStatus(payload.status);
    const currency = (optionalString(payload.currency, 3) ?? "AZN").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");

    const eventHash = await sha256Hex(`${data}.${signature}`);
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/process_epoint_callback`, {
      method: "POST",
      headers: {
        apikey: adminKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        p_event_hash: eventHash,
        p_merchant_order_id: merchantOrderId,
        p_amount: amount,
        p_currency: currency,
        p_status: status,
        p_provider_transaction_id: optionalString(payload.transaction, 256),
        p_bank_transaction_id: optionalString(payload.bank_transaction, 256),
        p_operation_code: optionalString(payload.operation_code, 128),
        p_response_code: optionalString(payload.response_code, 128),
        p_rrn: optionalString(payload.rrn, 128),
        p_card_mask: optionalString(payload.card_mask ?? payload.card_number, 64),
        p_message: optionalString(payload.message, 1_000),
        p_payload: redactPayload(payload),
      }),
    });

    if (!rpcResponse.ok) {
      const detail = (await rpcResponse.text()).slice(0, 1_000);
      console.error("Failed to persist verified Epoint callback", rpcResponse.status, detail);
      return jsonResponse({ ok: false, error: "storage_error" }, 500);
    }

    const result = await rpcResponse.json();
    return jsonResponse({ ok: true, result });
  } catch (error) {
    console.error("Rejected malformed Epoint callback", error instanceof Error ? error.message : error);
    return jsonResponse({ ok: false, error: "invalid_request" }, 400);
  }
});
