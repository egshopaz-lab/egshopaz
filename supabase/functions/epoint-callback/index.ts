
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const MAX_BODY = 1_000_000;
const STATUSES = new Set(["new", "success", "returned", "error", "server_error"]);
type Json = Record<string, unknown>;

function reply(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function optional(value: unknown, max = 512): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim();
  return result ? result.slice(0, max) : null;
}

function required(value: unknown, max: number): string {
  const result = optional(value, max);
  if (!result) throw new Error("required_field_missing");
  return result;
}

function normalizeStatus(value: unknown): string {
  const status = required(value, 32).toLowerCase().replaceAll("-", "_");
  if (status === "failed") return "error";
  if (!STATUSES.has(status)) throw new Error("unknown_status");
  return status;
}

function normalizeAmount(value: unknown): string {
  const result = required(value, 32).replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(result) || Number(result) <= 0) throw new Error("invalid_amount");
  return Number(result).toFixed(2);
}

function bytesBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function signature(privateKey: string, data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`${privateKey}${data}${privateKey}`));
  return bytesBase64(new Uint8Array(digest));
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

function decode(data: string): Json {
  const binary = atob(data);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  const payload = JSON.parse(decoded) as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid_payload");
  return payload as Json;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1));
  if (!value || typeof value !== "object") return typeof value === "string" ? value.slice(0, 2_000) : value;
  const output: Json = {};
  for (const [key, item] of Object.entries(value as Json).slice(0, 100)) {
    output[key] = /^(cvv|cvc|pan|private_key|secret|signature|card_number)$/i.test(key) ? "[redacted]" : redact(item, depth + 1);
  }
  return output;
}

async function eventHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function adminKey(): string | null {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try { return (JSON.parse(keys) as Record<string, string>).default ?? null; } catch { /* fallback */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

async function fields(req: Request): Promise<{ data: string; signature: string }> {
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) throw new Error("body_too_large");
  const body = await req.text();
  if (body.length > MAX_BODY) throw new Error("body_too_large");
  let data: unknown;
  let signed: unknown;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const parsed = JSON.parse(body) as Json; data = parsed.data; signed = parsed.signature;
  } else {
    const parsed = new URLSearchParams(body); data = parsed.get("data"); signed = parsed.get("signature");
  }
  return {
    data: required(data, MAX_BODY).replace(/ /g, "+"),
    signature: required(signed, 256).replace(/ /g, "+"),
  };
}

async function callRpc(supabaseUrl: string, key: string, name: string, body: Json): Promise<unknown> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`Callback RPC ${name} failed`, response.status, (await response.text()).slice(0, 1_000));
    throw new Error("storage_error");
  }
  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = adminKey();
  if (!privateKey || !supabaseUrl || !key) return reply({ ok: false, error: "service_not_configured" }, 503);

  try {
    const input = await fields(req);
    const expected = await signature(privateKey, input.data);
    if (!constantTimeEqual(expected, input.signature)) return reply({ ok: false, error: "invalid_signature" }, 401);
    const payload = decode(input.data);
    const configuredPublicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
    const callbackPublicKey = optional(payload.public_key, 128);
    if (configuredPublicKey && callbackPublicKey && callbackPublicKey !== configuredPublicKey) {
      return reply({ ok: false, error: "invalid_public_key" }, 401);
    }

    const hash = await eventHash(`${input.data}.${input.signature}`);
    const status = normalizeStatus(payload.status);
    const orderId = optional(payload.order_id, 255);
    const cardId = optional(payload.card_id ?? payload.cart_id, 512);

    // Plain card registration callbacks do not contain an order_id.
    if (!orderId && cardId) {
      const result = await callRpc(supabaseUrl, key, "process_epoint_card_callback", {
        p_event_hash: hash, p_card_id: cardId, p_status: status,
        p_card_mask: optional(payload.card_mask, 64), p_message: optional(payload.message, 1_000),
        p_payload: redact(payload),
      });
      return reply({ ok: true, result });
    }
    if (!orderId) throw new Error("order_id_missing");

    const common = {
      p_event_hash: hash,
      p_merchant_order_id: orderId,
      p_amount: normalizeAmount(payload.amount),
      p_currency: (optional(payload.currency, 3) ?? "AZN").toUpperCase(),
      p_status: status,
      p_provider_transaction_id: optional(payload.transaction, 256),
      p_message: optional(payload.message, 1_000),
      p_payload: redact(payload),
    };
    if (!/^[A-Z]{3}$/.test(common.p_currency)) throw new Error("invalid_currency");

    let name = "process_epoint_callback";
    let body: Json = {
      ...common,
      p_bank_transaction_id: optional(payload.bank_transaction, 256),
      p_operation_code: optional(payload.operation_code, 128),
      p_response_code: optional(payload.response_code ?? payload.code, 128),
      p_rrn: optional(payload.rrn, 128),
      p_card_mask: optional(payload.card_mask, 64),
    };
    if (orderId.startsWith("trends_")) { name = "process_eg_trends_callback"; body = common; }
    if (orderId.startsWith("op_")) { name = "process_epoint_operation_callback"; body = common; }
    const result = await callRpc(supabaseUrl, key, name, body);
    return reply({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_request";
    console.error("Rejected Epoint callback", message);
    return reply({ ok: false, error: message === "storage_error" ? message : "invalid_request" }, message === "storage_error" ? 500 : 400);
  }
});

