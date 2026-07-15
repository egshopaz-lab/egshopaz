const EPOINT_REQUEST_URL = "https://epoint.az/api/1/request";

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

function safeRedirect(value: unknown): string {
  if (typeof value !== "string") throw new Error("Epoint yönləndirmə ünvanı qaytarmadı");
  const url = new URL(value);
  if (url.protocol !== "https:" || (url.hostname !== "epoint.az" && !url.hostname.endsWith(".epoint.az"))) {
    throw new Error("Epoint etibarsız yönləndirmə ünvanı qaytardı");
  }
  return url.toString();
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(origin);

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
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const authorization = req.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !publicKey || !privateKey) {
    return response({ error: "payment_not_configured" }, 503, origin);
  }
  if (!authorization?.startsWith("Bearer ")) return response({ error: "authentication_required" }, 401, origin);

  try {
    const body = (await req.json()) as JsonRecord;
    if (typeof body.plan_id !== "string") throw new Error("Paket seçilməyib");
    const language = ["az", "en", "ru"].includes(String(body.language)) ? String(body.language) : "az";

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!userResponse.ok) return response({ error: "authentication_required" }, 401, origin);

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
      return response({ error: detail.includes("bloklanıb") ? "access_blocked" : "payment_prepare_failed" }, 400, origin);
    }
    const rows = (await rpc.json()) as Array<{
      payment_id: string; merchant_order_id: string; amount: number | string; currency: string; duration_days: number;
    }>;
    const payment = rows[0];
    if (!payment?.payment_id || !payment.merchant_order_id) throw new Error("Ödəniş yaradıla bilmədi");

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
      description: `EG Trends ${payment.duration_days} günlük abunə`,
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    };
    const data = bytesToBase64(new TextEncoder().encode(JSON.stringify(payload)));
    const signature = await createSignature(privateKey, data);
    const epointResponse = await fetch(EPOINT_REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ data, signature }),
    });
    const epointBody = (await epointResponse.json()) as JsonRecord;
    if (!epointResponse.ok || String(epointBody.status).toLowerCase() !== "success") {
      return response({ error: "epoint_request_failed" }, 502, origin);
    }
    return response({
      redirect_url: safeRedirect(epointBody.redirect_url),
      payment_id: payment.payment_id,
      amount: Number(payment.amount),
      currency: payment.currency,
    }, 200, origin);
  } catch (error) {
    console.error("EG Trends payment initialization failed", error instanceof Error ? error.message : error);
    return response({ error: error instanceof Error ? error.message : "invalid_request" }, 400, origin);
  }
});

