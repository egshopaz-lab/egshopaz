const EPOINT_REQUEST_URL = "https://epoint.az/api/1/request";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const EPOINT_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function publishableKey(): string | null {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try { return (JSON.parse(keys) as Record<string, string>).default ?? null; } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function adminKey(): string | null {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try { return (JSON.parse(keys) as Record<string, string>).default ?? null; } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const origins = new Set([
    new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az").origin,
    new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az").origin,
    new URL(Deno.env.get("PVZ_SITE_URL") ?? "https://pvz.egshop.az").origin,
    new URL(Deno.env.get("ADMIN_SITE_URL") ?? "https://admin.egshop.az").origin,
  ]);
  if (origins.has(origin)) return origin;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : null;
}

function response(body: JsonRecord, status: number, origin: string | null): Response {
  const cors = allowedOrigin(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...(cors ? { "Access-Control-Allow-Origin": cors, Vary: "Origin" } : {}) },
  });
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function signature(privateKey: string, data: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${privateKey}${data}${privateKey}`),
  );
  return base64(new Uint8Array(digest));
}

function userIdFromJwt(authorization: string): string | null {
  const token = authorization.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(decoded) as { sub?: unknown };
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

function safeRedirect(value: unknown): string {
  if (typeof value !== "string") throw new Error("epoint_redirect_missing");
  const url = new URL(value);
  const isEpoint = url.hostname === "epoint.az" || url.hostname.endsWith(".epoint.az");
  const isPashaEcomm = url.hostname === "ecomm.pashabank.az";
  if (!isEpoint && !isPashaEcomm) {
    throw new Error(`epoint_redirect_invalid_host:${url.hostname}`);
  }
  if (url.protocol === "http:") {
    url.protocol = "https:";
  }
  if (url.protocol !== "https:") {
    throw new Error(`epoint_redirect_invalid_protocol:${url.protocol}`);
  }
  return url.toString();
}

function epointDescription(serviceType: string, description: string): string {
  const descriptions: Record<string, string> = {
    product_order: "EG Shop sifarisi",
    pvz_registration: "EG Shop PVZ qeydiyyat haqqi",
    seller_package: "EG Shop reklam paketi",
    product_promotion: "EG Shop mehsul reklami",
    shop_promotion: "EG Shop magaza reklami",
    banner_promotion: "EG Shop banner reklami",
    slot_product: "EG Shop mehsul reklam slotu",
    slot_shop: "EG Shop magaza reklam slotu",
    slot_banner: "EG Shop banner reklam slotu",
  };
  const base = descriptions[serviceType] ?? description
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (base || "EG Shop odenisi").slice(0, 200);
}

async function markProviderFailure(
  supabaseUrl: string,
  secretKey: string,
  paymentId: string,
  message: string,
): Promise<void> {
  const result = await fetch(`${supabaseUrl}/rest/v1/payment_intents?id=eq.${paymentId}`, {
    method: "PATCH",
    headers: {
      apikey: secretKey,
      ...(secretKey.startsWith("eyJ") ? { Authorization: `Bearer ${secretKey}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "failed",
      failed_at: new Date().toISOString(),
      provider_message: message.slice(0, 500),
    }),
  });
  if (!result.ok) console.error("Could not persist Epoint failure", result.status);
}

function resultBase(serviceType: string): URL {
  if (serviceType === "product_order") {
    return new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az");
  }
  if (serviceType === "pvz_registration") {
    return new URL(Deno.env.get("PVZ_SITE_URL") ?? "https://pvz.egshop.az");
  }
  return new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  let paymentIdForFailure: string | null = null;
  let supabaseUrlForFailure: string | null = null;
  let secretKeyForFailure: string | null = null;
  const cors = allowedOrigin(origin);
  if (req.method === "OPTIONS") {
    if (origin && !cors) return response({ error: "origin_not_allowed" }, 403, null);
    return new Response(null, {
      status: 204,
      headers: {
        ...(cors ? { "Access-Control-Allow-Origin": cors, Vary: "Origin" } : {}),
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  if (origin && !cors) return response({ error: "origin_not_allowed" }, 403, null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const anonKey = publishableKey();
  const secretKey = adminKey();
  supabaseUrlForFailure = supabaseUrl ?? null;
  secretKeyForFailure = secretKey ?? null;
  const authorization = req.headers.get("authorization");
  if (!supabaseUrl || !publicKey || !privateKey || !anonKey || !secretKey) {
    return response({ error: "payment_not_configured" }, 503, origin);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return response({ error: "authentication_required" }, 401, origin);
  }

  try {
    const userResult = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    const fallbackUserId = userIdFromJwt(authorization);
    if (!userResult.ok && !fallbackUserId) return response({ error: "authentication_required" }, 401, origin);
    const user = userResult.ok ? await userResult.json() as { id?: string } : {};
    const userId = user.id ?? fallbackUserId;
    if (!userId) return response({ error: "authentication_required" }, 401, origin);

    const body = (await req.json()) as JsonRecord;
    const serviceType = typeof body.service_type === "string" ? body.service_type : "";
    const resourceId = typeof body.resource_id === "string" && body.resource_id ? body.resource_id : null;
    const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload
      : {};
    const language = ["az", "en", "ru"].includes(String(body.language)) ? String(body.language) : "az";

    const rpcResult = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_payment_intent`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        ...(secretKey.startsWith("eyJ") ? { Authorization: `Bearer ${secretKey}` } : {}),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        _user_id: userId,
        _service_type: serviceType,
        _resource_id: resourceId,
        _payload: payload,
      }),
    });
    if (!rpcResult.ok) {
      const detail = (await rpcResult.text()).slice(0, 1_000);
      console.error("Could not prepare payment", rpcResult.status, detail);
      return response({ error: "payment_intent_failed" }, 400, origin);
    }
    const rows = (await rpcResult.json()) as Array<{
      payment_id: string;
      merchant_order_id: string;
      amount: number | string;
      currency: string;
      description: string;
    }>;
    const payment = rows[0];
    if (!payment?.payment_id || !payment.merchant_order_id) throw new Error("payment_intent_missing");
    paymentIdForFailure = payment.payment_id;

    const base = resultBase(serviceType);
    const successUrl = new URL("/payment/success", base);
    const errorUrl = new URL("/payment/error", base);
    successUrl.searchParams.set("payment_id", payment.payment_id);
    errorUrl.searchParams.set("payment_id", payment.payment_id);

    const epointPayload = {
      public_key: publicKey,
      amount: Number(payment.amount).toFixed(2),
      currency: payment.currency,
      language,
      order_id: payment.merchant_order_id,
      description: epointDescription(serviceType, payment.description),
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    };
    const data = base64(new TextEncoder().encode(JSON.stringify(epointPayload)));
    const signed = await signature(privateKey, data);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("epoint_timeout"), EPOINT_TIMEOUT_MS);
    let epointResult: Response;
    try {
      epointResult = await fetch(EPOINT_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ data, signature: signed }),
        signal: controller.signal,
      });
    } catch (error) {
      const providerMessage = error instanceof Error && error.name === "AbortError"
        ? "Epoint request timed out"
        : "Epoint request failed";
      await markProviderFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    } finally {
      clearTimeout(timeout);
    }

    const epointText = await epointResult.text();
    let epoint: JsonRecord = {};
    try {
      epoint = epointText ? JSON.parse(epointText) as JsonRecord : {};
    } catch {
      const providerMessage = `Epoint returned non-JSON response (${epointResult.status})`;
      await markProviderFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    }
    if (!epointResult.ok || String(epoint.status).toLowerCase() !== "success") {
      console.error("Epoint rejected payment", epointResult.status, epoint);
      const providerMessage = String(epoint.message ?? epoint.error ?? epoint.status ?? "epoint_request_failed");
      await markProviderFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    }

    return response({
      payment_id: payment.payment_id,
      redirect_url: safeRedirect(epoint.redirect_url),
      amount: Number(payment.amount),
      currency: payment.currency,
    }, 200, origin);
  } catch (error) {
    console.error("Payment initialization failed", error instanceof Error ? error.message : error);
    if (paymentIdForFailure && supabaseUrlForFailure && secretKeyForFailure) {
      await markProviderFailure(
        supabaseUrlForFailure,
        secretKeyForFailure,
        paymentIdForFailure,
        error instanceof Error ? error.message : "payment_initialization_failed",
      );
    }
    return response({ error: "invalid_request" }, 400, origin);
  }
});
