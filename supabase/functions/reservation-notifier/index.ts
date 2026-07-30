const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const ALLOWED_ORIGINS = new Set([
  "https://egshop.az",
  "https://www.egshop.az",
  "https://seller.egshop.az",
  "https://admin.egshop.az",
]);

type Json = Record<string, unknown>;
type QueueRow = {
  id: string;
  recipient_email: string | null;
  payload: { title?: string; body?: string };
};

function serviceHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
  };
}

function adminKey(): string | null {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      return (JSON.parse(keys) as Record<string, string>).default ?? null;
    } catch {
      // Fall back to the legacy service-role secret.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function reply(body: Json, status: number, origin: string | null): Response {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...(allowed ? { "Access-Control-Allow-Origin": allowed, Vary: "Origin" } : {}),
    },
  });
}

async function patchQueue(
  supabaseUrl: string,
  key: string,
  id: string,
  body: Json,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/reservation_notification_queue?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...serviceHeaders(key),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return reply({ error: "origin_not_allowed" }, 403, null);
    return new Response(null, {
      status: 204,
      headers: {
        ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply({ error: "origin_not_allowed" }, 403, null);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = adminKey();
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const authorization = req.headers.get("authorization");
  if (!supabaseUrl || !key || !resendKey) return reply({ error: "notification_not_configured" }, 503, origin);
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "authentication_required" }, 401, origin);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: key, Authorization: authorization },
    });
    if (!userResponse.ok) return reply({ error: "authentication_required" }, 401, origin);
    const user = await userResponse.json() as { id?: string };
    const input = await req.json() as { reservation_id?: unknown };
    const reservationId = typeof input.reservation_id === "string" ? input.reservation_id : "";
    if (!reservationId) return reply({ error: "reservation_required" }, 400, origin);

    const reservationResponse = await fetch(
      `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(reservationId)}&select=customer_id,seller_id`,
      {
        headers: {
          ...serviceHeaders(key),
          Accept: "application/json",
        },
      },
    );
    const reservations = await reservationResponse.json() as Array<{ customer_id: string; seller_id: string }>;
    const reservation = reservations[0];
    if (!reservation) return reply({ error: "reservation_not_found" }, 404, origin);

    let authorized = user.id === reservation.customer_id || user.id === reservation.seller_id;
    if (!authorized && user.id) {
      const roleResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=user_id`,
        { headers: serviceHeaders(key) },
      );
      authorized = ((await roleResponse.json()) as unknown[]).length > 0;
    }
    if (!authorized) return reply({ error: "forbidden" }, 403, origin);

    const queueResponse = await fetch(
      `${supabaseUrl}/rest/v1/reservation_notification_queue?reservation_id=eq.${encodeURIComponent(reservationId)}&status=eq.pending&channel=eq.email&select=id,recipient_email,payload&order=created_at.asc`,
      { headers: serviceHeaders(key) },
    );
    const queue = await queueResponse.json() as QueueRow[];
    let sent = 0;

    for (const item of queue.slice(0, 10)) {
      if (!item.recipient_email) {
        await patchQueue(supabaseUrl, key, item.id, {
          status: "failed",
          attempts: 1,
          last_error: "recipient_missing",
        });
        continue;
      }
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") ?? "EG Shop <noreply@egshop.az>",
          to: [item.recipient_email],
          subject: item.payload?.title ?? "EG Shop rezervasiya bildirişi",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2 style="color:#6d28d9">${item.payload?.title ?? "Rezervasiya bildirişi"}</h2>
            <p style="font-size:16px;line-height:1.6">${item.payload?.body ?? ""}</p>
            <p><a href="https://egshop.az/reservations" style="color:#6d28d9">Rezervasiyalarıma bax</a></p>
          </div>`,
        }),
      });
      if (result.ok) {
        sent += 1;
        await patchQueue(supabaseUrl, key, item.id, {
          status: "sent",
          attempts: 1,
          last_error: null,
          sent_at: new Date().toISOString(),
        });
      } else {
        await patchQueue(supabaseUrl, key, item.id, {
          status: "failed",
          attempts: 1,
          last_error: (await result.text()).slice(0, 500),
        });
      }
    }
    return reply({ ok: true, sent }, 200, origin);
  } catch (error) {
    console.error("reservation-notifier", error);
    return reply({ error: "notification_failed" }, 500, origin);
  }
});
