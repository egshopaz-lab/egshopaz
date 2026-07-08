import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encodePayload, signEpointData } from "../_shared/epoint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://egshop.az",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const publicKey = Deno.env.get("EPOINT_PUBLIC_KEY");
  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!publicKey || !privateKey) return json({ message: "Epoint acarlari qurulmayib." }, 503);
  if (!authorization) return json({ message: "Giris teleb olunur." }, 401);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  try {
    const { address, phone } = await request.json();
    const { data: userData, error: userError } = await client.auth.getUser(
      authorization.replace(/^Bearer\s+/i, ""),
    );
    if (userError || !userData.user) return json({ message: "Sessiya etibarsizdir." }, 401);

    const { data: orderId, error: orderError } = await client.rpc("prepare_epoint_order", {
      _address: String(address || "").trim(),
      _phone: String(phone || "").trim(),
    });
    if (orderError) throw orderError;

    const { data: order, error: fetchError } = await client
      .from("orders")
      .select("id,total,user_id")
      .eq("id", orderId)
      .single();
    if (fetchError || !order || order.user_id !== userData.user.id) {
      throw fetchError || new Error("Sifaris tapilmadi.");
    }

    const payload = {
      public_key: publicKey,
      amount: Number(order.total).toFixed(2),
      currency: "AZN",
      language: "az",
      order_id: order.id,
      description: `EG Shop sifarisi: ${order.id}`,
      success_redirect_url: `https://egshop.az/?payment=success&order=${order.id}`,
      error_redirect_url: `https://egshop.az/?payment=error&order=${order.id}`,
    };
    const data = encodePayload(payload);
    const signature = await signEpointData(data, privateKey);
    const form = new URLSearchParams({ data, signature });
    const epointResponse = await fetch("https://epoint.az/api/1/request", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const result = await epointResponse.json();

    if (!epointResponse.ok || result.status !== "success" || !result.redirect_url) {
      return json({ message: result.message || "Odenis sehifesi yaradilmedi." }, 502);
    }

    return json({ redirect_url: result.redirect_url, order_id: order.id });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Odenis basladilmadi." }, 400);
  }
});
