import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const allowedOrigins = new Set([
  "https://pvz.egshop.az",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function response(body: Record<string, unknown>, status: number, origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : "https://pvz.egshop.az";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });
}

function required(value: unknown, max: number) {
  if (typeof value !== "string") throw new Error("Forma məlumatı düzgün deyil");
  const text = value.trim();
  if (!text || text.length > max) throw new Error("Forma məlumatı düzgün deyil");
  return text;
}

function optional(value: unknown, max: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Forma məlumatı düzgün deyil");
  const text = value.trim();
  if (text.length > max) throw new Error("Forma məlumatı çox uzundur");
  return text || null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return response({ error: "origin_not_allowed" }, 403, null);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization");
  if (!url || !serviceKey) return response({ error: "server_not_configured" }, 503, origin);
  if (!authorization?.startsWith("Bearer ")) return response({ error: "authentication_required" }, 401, origin);

  try {
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await service.auth.getUser(authorization.slice(7));
    if (authError || !authData.user) return response({ error: "authentication_required" }, 401, origin);
    const body = await req.json() as Record<string, unknown>;
    const pickupPointId = optional(body.pickup_point_id, 36);
    if (pickupPointId && !/^[0-9a-f-]{36}$/i.test(pickupPointId)) throw new Error("PVZ punkt düzgün deyil");

    const { data, error } = await service.rpc("complete_pvz_registration", {
      _user_id: authData.user.id,
      _full_name: required(body.full_name, 120),
      _phone: required(body.phone, 30),
      _pickup_point_id: pickupPointId,
      _position: optional(body.position, 60) ?? "operator",
      _new_pvz_name: optional(body.new_pvz_name, 120),
      _new_pvz_city: optional(body.new_pvz_city, 100),
      _new_pvz_address: optional(body.new_pvz_address, 300),
    });
    if (error) throw error;
    return response({ ok: true, pickup_point_id: data }, 200, origin);
  } catch (error) {
    console.error("PVZ registration failed", error instanceof Error ? error.message : error);
    return response({ error: error instanceof Error ? error.message : "registration_failed" }, 400, origin);
  }
});
