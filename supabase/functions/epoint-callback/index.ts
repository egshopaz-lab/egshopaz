import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodePayload, signEpointData, signaturesMatch } from "../_shared/epoint.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const privateKey = Deno.env.get("EPOINT_PRIVATE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!privateKey || !serviceKey || !supabaseUrl) {
    return new Response("Server is not configured", { status: 503 });
  }

  try {
    const form = await request.formData();
    const data = String(form.get("data") || "");
    const signature = String(form.get("signature") || "");
    const expected = await signEpointData(data, privateKey);
    if (!data || !signaturesMatch(signature, expected)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = decodePayload(data);
    const orderId = String(payload.order_id || "");
    const status = String(payload.status || "failed").toLowerCase();
    const code = String(payload.code || "");
    const transaction = String(payload.transaction || "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return new Response("Invalid order", { status: 400 });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id,total,payment_status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return new Response("Order not found", { status: 404 });

    const expectedAmount = Number(order.total).toFixed(2);
    const receivedAmount = Number(payload.amount).toFixed(2);
    if (expectedAmount !== receivedAmount) return new Response("Amount mismatch", { status: 400 });

    const { error } = await admin.rpc("complete_epoint_payment", {
      _order_id: orderId,
      _status: status,
      _transaction: transaction,
      _code: code,
    });
    if (error) throw error;

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Epoint callback failed", error);
    return new Response("Callback failed", { status: 400 });
  }
});
