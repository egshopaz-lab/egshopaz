const EPOINT_REQUEST_URL = "https://epoint.az/api/1/request";
const EPOINT_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowed = new Set([
    new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az").origin,
    new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az").origin,
  ]);
  if (allowed.has(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function response(body: JsonRecord, status: number, origin: string | null): Response {
  const allowedOrigin = getAllowedOrigin(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin, Vary: "Origin" } : {}),
    },
  });
}

function getPublishableKey(): string | null {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try { return (JSON.parse(keys) as Record<string, string>).default ?? null; } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function getSecretKey(): string | null {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try { return (JSON.parse(keys) as Record<string, string>).default ?? null; } catch { /* legacy fallback */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function createSignature(privateKey: string, data: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${privateKey}${data}${privateKey}`);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return bytesToBase64(new Uint8Array(digest));
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

async function markTrendsFailure(
  supabaseUrl: string,
  secretKey: string | null,
  paymentId: string,
  message: string,
): Promise<void> {
  if (!secretKey) return;
  const result = await fetch(`${supabaseUrl}/rest/v1/eg_trends_payments?id=eq.${paymentId}`, {
    method: "PATCH",
    headers: {
      apikey: secretKey,
      ...(secretKey.startsWith("eyJ") ? { Authorization: `Bearer ${secretKey}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "failed",
      message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!result.ok) console.error("Could not persist EG Trends Epoint failure", result.status);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(origin);
  let paymentIdForFailure: string | null = null;

  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigin) return response({ error: "origin_not_allowed" }, 403, null);
    return new Response(null, {
      status: 204,
      headers: {
        ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin, Vary: "Origin" } : {}),
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigin) return response({ error: "origin_not_allowed" }, 403, null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const secretKey = getSecretKey();
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const authorization = req.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !publicKey || !privateKey) {
    return response({ error: "payment_not_configured" }, 503, origin);
  }
  if (!authorization?.startsWith("Bearer ")) return response({ error: "authentication_required" }, 401, origin);

  try {
    const body = (await req.json()) as JsonRecord;
    if (typeof body.plan_id !== "string") throw new Error("plan_required");
    const language = ["az", "en", "ru"].includes(String(body.language)) ? String(body.language) : "az";

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!userResponse.ok && !userIdFromJwt(authorization)) {
      return response({ error: "authentication_required" }, 401, origin);
    }

    const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_eg_trends_payment`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: authorization,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ _plan_id: body.plan_id }),
    });
    if (!rpc.ok) {
      const detail = (await rpc.text()).slice(0, 1_000);
      console.error("Could not prepare EG Trends payment", rpc.status, detail);
      return response({ error: detail.includes("bloklan") ? "access_blocked" : "payment_prepare_failed" }, 400, origin);
    }
    const rows = (await rpc.json()) as Array<{
      payment_id: string; merchant_order_id: string; amount: number | string; currency: string; duration_days: number;
    }>;
    const payment = rows[0];
    if (!payment?.payment_id || !payment.merchant_order_id) throw new Error("payment_intent_missing");
    paymentIdForFailure = payment.payment_id;

    const sellerSiteUrl = new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az");
    const successUrl = new URL("/seller", sellerSiteUrl);
    successUrl.searchParams.set("trends_payment", "success");
    const errorUrl = new URL("/seller", sellerSiteUrl);
    errorUrl.searchParams.set("trends_payment", "error");

    const payload = {
      public_key: publicKey,
      amount: Number(payment.amount).toFixed(2),
      currency: payment.currency,
      language,
      order_id: payment.merchant_order_id,
      description: `EG Trends ${payment.duration_days} gunluk abune`,
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    };
    const data = bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
    const signature = await createSignature(privateKey, data);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("epoint_timeout"), EPOINT_TIMEOUT_MS);
    let epointResponse: Response;
    try {
      epointResponse = await fetch(EPOINT_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ data, signature }),
        signal: controller.signal,
      });
    } catch (error) {
      const providerMessage = error instanceof Error && error.name === "AbortError"
        ? "Epoint request timed out"
        : "Epoint request failed";
      await markTrendsFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    } finally {
      clearTimeout(timeout);
    }

    const epointText = await epointResponse.text();
    let epointBody: JsonRecord = {};
    try {
      epointBody = epointText ? JSON.parse(epointText) as JsonRecord : {};
    } catch {
      const providerMessage = `Epoint returned non-JSON response (${epointResponse.status})`;
      await markTrendsFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    }
    if (!epointResponse.ok || String(epointBody.status).toLowerCase() !== "success") {
      const providerMessage = String(epointBody.message ?? epointBody.error ?? epointBody.status ?? "epoint_request_failed");
      await markTrendsFailure(supabaseUrl, secretKey, payment.payment_id, providerMessage);
      return response({ error: "epoint_request_failed", provider_message: providerMessage }, 502, origin);
    }
    return response({
      redirect_url: safeRedirect(epointBody.redirect_url),
      payment_id: payment.payment_id,
      amount: Number(payment.amount),
      currency: payment.currency,
    }, 200, origin);
  } catch (error) {
    console.error("EG Trends payment initialization failed", error instanceof Error ? error.message : error);
    if (paymentIdForFailure && supabaseUrl) {
      await markTrendsFailure(
        supabaseUrl,
        secretKey,
        paymentIdForFailure,
        error instanceof Error ? error.message : "payment_initialization_failed",
      );
    }
    return response({ error: error instanceof Error ? error.message : "invalid_request" }, 400, origin);
  }
});
