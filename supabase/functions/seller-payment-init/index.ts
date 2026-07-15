const EPOINT_REQUEST_URL = "https://epoint.az/api/1/request";
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

type JsonRecord = Record<string, unknown>;

function getPublishableKey(): string | null {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back while the project still supports legacy keys.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function getAdminKey(): string | null {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back while the project still supports legacy keys.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function response(body: JsonRecord, status: number, origin: string | null): Response {
  const allowedOrigin = getAllowedOrigin(origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin, Vary: "Origin" } : {}),
    },
  });
}

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const allowedOrigins = new Set([
    new URL(Deno.env.get("SITE_URL") ?? "https://egshop.az").origin,
    new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az").origin,
  ]);
  if (allowedOrigins.has(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`${field} düzgün deyil`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error(`${field} düzgün deyil`);
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("Forma məlumatı düzgün deyil");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error("Forma məlumatı çox uzundur");
  return normalized || null;
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

function safeEpointRedirect(value: unknown): string {
  if (typeof value !== "string") throw new Error("Epoint yönləndirmə ünvanı qaytarmadı");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "epoint.az" && !url.hostname.endsWith(".epoint.az"))
  ) {
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
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigin) return response({ error: "origin_not_allowed" }, 403, null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const adminKey = getAdminKey();
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const authorization = req.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !adminKey || !publicKey || !privateKey) {
    console.error("Seller payment function is missing required secrets");
    return response({ error: "payment_not_configured" }, 503, origin);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return response({ error: "authentication_required" }, 401, origin);
  }

  try {
    const body = (await req.json()) as JsonRecord;
    const shopName = requiredText(body.shop_name, "Mağaza adı", 100);
    if (shopName.length < 2) throw new Error("Mağaza adı minimum 2 simvol olmalıdır");
    const shopCity = optionalText(body.shop_city, 100);
    const phone = optionalText(body.phone, 30);
    const voen = optionalText(body.voen, 32);
    const language = ["az", "en", "ru"].includes(String(body.language))
      ? String(body.language)
      : "az";

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
    });
    if (!userResponse.ok) return response({ error: "authentication_required" }, 401, origin);
    const authenticatedUser = (await userResponse.json()) as { id?: string };
    if (!authenticatedUser.id) return response({ error: "authentication_required" }, 401, origin);

    const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_seller_payment`, {
      method: "POST",
      headers: {
        apikey: adminKey,
        ...(adminKey.startsWith("eyJ") ? { Authorization: `Bearer ${adminKey}` } : {}),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        _user_id: authenticatedUser.id,
        _shop_name: shopName,
        _shop_city: shopCity,
        _phone: phone,
        _voen: voen,
      }),
    });

    if (!rpc.ok) {
      const detail = (await rpc.text()).slice(0, 1_000);
      console.error("Could not prepare seller payment", rpc.status, detail);
      if (detail.includes("artıq aktivdir"))
        return response({ error: "seller_already_active" }, 409, origin);
      return response({ error: "application_failed" }, rpc.status === 401 ? 401 : 400, origin);
    }

    const rows = (await rpc.json()) as Array<{
      application_id: string;
      merchant_order_id: string;
      amount: number | string;
      currency: string;
    }>;
    const payment = rows[0];
    if (!payment?.application_id || !payment.merchant_order_id)
      throw new Error("Müraciət yaradıla bilmədi");

    const sellerSiteUrl = new URL(Deno.env.get("SELLER_SITE_URL") ?? "https://seller.egshop.az");
    const successUrl = new URL("/become-seller", sellerSiteUrl);
    successUrl.searchParams.set("payment", "success");
    const errorUrl = new URL("/become-seller", sellerSiteUrl);
    errorUrl.searchParams.set("payment", "error");

    const epointPayload = {
      public_key: publicKey,
      amount: Number(payment.amount).toFixed(2),
      currency: payment.currency,
      language,
      order_id: payment.merchant_order_id,
      description: "EG Shop satıcı qeydiyyat haqqı",
      success_redirect_url: successUrl.toString(),
      error_redirect_url: errorUrl.toString(),
    };
    const data = bytesToBase64(new TextEncoder().encode(JSON.stringify(epointPayload)));
    const signature = await createSignature(privateKey, data);

    const epointResponse = await fetch(EPOINT_REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ data, signature }),
    });
    const epointBody = (await epointResponse.json()) as JsonRecord;
    if (!epointResponse.ok || String(epointBody.status).toLowerCase() !== "success") {
      console.error("Epoint rejected seller payment", epointResponse.status, epointBody);
      return response({ error: "epoint_request_failed" }, 502, origin);
    }

    return response(
      {
        redirect_url: safeEpointRedirect(epointBody.redirect_url),
        application_id: payment.application_id,
        amount: 20,
        currency: "AZN",
      },
      200,
      origin,
    );
  } catch (error) {
    console.error(
      "Seller payment initialization failed",
      error instanceof Error ? error.message : error,
    );
    return response(
      { error: error instanceof Error ? error.message : "invalid_request" },
      400,
      origin,
    );
  }
});
