// AI Auto-Reply: müştəri/satıcı/PVZ/dispute/support kanallarına avtomatik cavab
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_API_URL = Deno.env.get("AI_API_URL");
const AI_API_KEY = Deno.env.get("AI_API_KEY");
const AI_MODEL = Deno.env.get("AI_MODEL");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Channel = "shop" | "pvz" | "dispute" | "support";

async function callAI(model: string, system: string, userMsg: string, history: { role: string; content: string }[] = []) {
  if (!AI_API_URL || !AI_API_KEY) {
    throw new Error("AI_API_URL və AI_API_KEY konfiqurasiya olunmayıb");
  }
  const res = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL || model,
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI provider ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Bağışlayın, hazırda cavab verə bilmirəm.";
}

async function loadSettings() {
  const { data } = await admin.from("ai_settings").select("*").limit(1).maybeSingle();
  return data;
}

async function loadFAQ(audience: string) {
  const { data } = await admin
    .from("faq_items")
    .select("question,answer,category,audience")
    .eq("is_active", true)
    .in("audience", [audience, "all"]);
  return (data ?? []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
}

async function buildShopContext(msg: any) {
  let productInfo = "";
  if (msg.product_id) {
    const { data: p } = await admin.from("products")
      .select("title,price,stock,description,delivery_days_min,delivery_days_max,delivery_city,brand")
      .eq("id", msg.product_id).maybeSingle();
    if (p) {
      productInfo = `\nMƏHSUL: ${p.title} | Qiymət: ${p.price} ₼ | Stok: ${p.stock} | Brend: ${p.brand ?? "-"} | Çatdırılma: ${p.delivery_days_min}-${p.delivery_days_max} gün, ${p.delivery_city ?? "-"} | Təsvir: ${(p.description ?? "").slice(0, 300)}`;
    }
  }
  const { data: hist } = await admin.from("shop_messages")
    .select("sender_role,body").eq("buyer_id", msg.buyer_id).eq("seller_id", msg.seller_id)
    .order("created_at", { ascending: true }).limit(10);
  const history = (hist ?? []).slice(0, -1).map((m: any) => ({
    role: m.sender_role === "buyer" ? "user" : "assistant",
    content: m.body,
  }));
  return { productInfo, history };
}

async function buildPvzContext(msg: any) {
  let pvzInfo = "";
  let orderInfo = "";
  if (msg.pickup_point_id) {
    const { data: p } = await admin.from("pickup_points")
      .select("name,city,address,phone,working_hours").eq("id", msg.pickup_point_id).maybeSingle();
    if (p) pvzInfo = `\nPVZ: ${p.name}, ${p.city}, ${p.address} | Tel: ${p.phone ?? "-"} | İş saatı: ${p.working_hours}`;
  }
  if (msg.order_item_id) {
    const { data: oi } = await admin.from("order_items")
      .select("title,status,pickup_code,accepted_at,delivered_at").eq("id", msg.order_item_id).maybeSingle();
    if (oi) orderInfo = `\nSİFARİŞ: ${oi.title} | Status: ${oi.status} | Götürmə kodu: ${oi.pickup_code} | Qəbul: ${oi.accepted_at ?? "yox"} | Təhvil: ${oi.delivered_at ?? "yox"}`;
  }
  const { data: hist } = await admin.from("pvz_messages")
    .select("sender_role,body").eq("buyer_id", msg.buyer_id).eq("pickup_point_id", msg.pickup_point_id)
    .order("created_at", { ascending: true }).limit(10);
  const history = (hist ?? []).slice(0, -1).filter((m: any) => m.sender_role !== "system").map((m: any) => ({
    role: m.sender_role === "buyer" ? "user" : "assistant",
    content: m.body,
  }));
  return { pvzInfo: pvzInfo + orderInfo, history };
}

async function buildDisputeContext(msg: any) {
  const { data: d } = await admin.from("disputes").select("*").eq("id", msg.dispute_id).maybeSingle();
  let info = "";
  if (d) info = `\nMÜBAHİSƏ: ${d.reason} | Status: ${d.status} | Təsvir: ${d.description ?? "-"}`;
  const { data: hist } = await admin.from("dispute_messages")
    .select("sender_role,body").eq("dispute_id", msg.dispute_id)
    .order("created_at", { ascending: true }).limit(10);
  const history = (hist ?? []).slice(0, -1).filter((m: any) => m.sender_role !== "system").map((m: any) => ({
    role: m.sender_role === "buyer" ? "user" : "assistant",
    content: m.body,
  }));
  return { info, history };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const channel: Channel = body.channel;
    const messageId: string | undefined = body.message_id;

    const settings = await loadSettings();
    if (!settings || !settings.enabled) {
      return new Response(JSON.stringify({ skipped: "ai_disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const model = settings.model || "google/gemini-2.5-flash";

    // ---------- SUPPORT (direct chat) ----------
    if (channel === "support") {
      if (!settings.enabled_support) return json({ skipped: "channel_off" });
      const userId: string = body.user_id;
      const userMsg: string = body.message;
      const audience: string = body.audience || "buyer";
      if (!userId || !userMsg) return json({ error: "missing user_id or message" }, 400);

      const { data: hist } = await admin.from("ai_chat_messages")
        .select("role,content").eq("user_id", userId).eq("audience", audience)
        .order("created_at", { ascending: true }).limit(20);
      const history = (hist ?? []).map((m) => ({ role: m.role, content: m.content }));

      const faq = await loadFAQ(audience);
      let basePrompt = settings.system_prompt_support;
      if (audience === "seller") {
        basePrompt = `Sən EG Shop satıcı dəstək asistentisən. Satıcılara məhsul yükləmə, sifariş idarəetməsi, reklam paketləri, ödəniş, çatdırılma şərtləri, mağaza ayarları, mübahisələr və komissiya barədə kömək et. Mehriban, qısa və dəqiq cavab ver. Azərbaycan dilində danış.`;
      } else if (audience === "pvz") {
        basePrompt = `Sən EG Shop PVZ (çatdırılma nöqtəsi) işçi dəstək asistentisən. PVZ operatorlarına paket qəbulu, QR skan, götürmə kodu, anbar, qaytarma, növbə açma/bağlama, hesabat və müştəri ilə əlaqə barədə kömək et. Qısa, peşəkar və əməliyyat-yönümlü cavab ver. Azərbaycan dilində danış.`;
      }
      const sys = `${basePrompt}\n\n=== FAQ ===\n${faq}`;
      const reply = await callAI(model, sys, userMsg, history);

      await admin.from("ai_chat_messages").insert([
        { user_id: userId, role: "user", content: userMsg, audience },
        { user_id: userId, role: "assistant", content: reply, audience },
      ]);
      await admin.from("ai_replies_log").insert({ channel, status: "ok" });
      return json({ reply });
    }

    if (!messageId) return json({ error: "message_id required" }, 400);

    // ---------- SHOP MESSAGES ----------
    if (channel === "shop") {
      if (!settings.enabled_shop) return json({ skipped: "channel_off" });
      const { data: msg } = await admin.from("shop_messages").select("*").eq("id", messageId).maybeSingle();
      if (!msg || msg.sender_role !== "buyer") return json({ skipped: "not_buyer" });

      // Yoxla: son 60 saniyədə satıcı cavab veribsə, AI cavab vermə
      const { data: recent } = await admin.from("shop_messages")
        .select("id,sender_role,created_at").eq("buyer_id", msg.buyer_id).eq("seller_id", msg.seller_id)
        .gt("created_at", new Date(Date.now() - 60000).toISOString())
        .neq("id", messageId);
      if ((recent ?? []).some((m) => m.sender_role === "seller")) return json({ skipped: "seller_active" });

      const { productInfo, history } = await buildShopContext(msg);
      const faq = await loadFAQ("buyer");
      const sys = `${settings.system_prompt_shop}\n${productInfo}\n\n=== FAQ ===\n${faq}\n\nQEYD: Sən AI köməkçisən. Cavabın sonuna kiçik şriftlə "🤖 Avtomatik cavab" əlavə et.`;
      const reply = await callAI(model, sys, msg.body, history);

      const { data: ins } = await admin.from("shop_messages").insert({
        buyer_id: msg.buyer_id, seller_id: msg.seller_id, product_id: msg.product_id,
        order_id: msg.order_id, sender_role: "seller", body: reply,
      }).select("id").single();
      await admin.from("ai_replies_log").insert({ channel, source_message_id: messageId, reply_id: ins?.id });
      return json({ reply });
    }

    // ---------- PVZ MESSAGES ----------
    if (channel === "pvz") {
      if (!settings.enabled_pvz) return json({ skipped: "channel_off" });
      const { data: msg } = await admin.from("pvz_messages").select("*").eq("id", messageId).maybeSingle();
      if (!msg || msg.sender_role !== "buyer") return json({ skipped: "not_buyer" });

      const { pvzInfo, history } = await buildPvzContext(msg);
      const faq = await loadFAQ("buyer");
      const sys = `${settings.system_prompt_pvz}\n${pvzInfo}\n\n=== FAQ ===\n${faq}\n\nQEYD: Sən AI köməkçisən. Cavabın sonuna "🤖 Avtomatik cavab" yaz.`;
      const reply = await callAI(model, sys, msg.body, history);

      const { data: ins } = await admin.from("pvz_messages").insert({
        order_id: msg.order_id, order_item_id: msg.order_item_id,
        buyer_id: msg.buyer_id, pickup_point_id: msg.pickup_point_id,
        sender_role: "pvz", body: reply,
      }).select("id").single();
      await admin.from("ai_replies_log").insert({ channel, source_message_id: messageId, reply_id: ins?.id });
      return json({ reply });
    }

    // ---------- DISPUTE MESSAGES ----------
    if (channel === "dispute") {
      if (!settings.enabled_dispute) return json({ skipped: "channel_off" });
      const { data: msg } = await admin.from("dispute_messages").select("*").eq("id", messageId).maybeSingle();
      if (!msg || msg.sender_role !== "buyer") return json({ skipped: "not_buyer" });

      const { info, history } = await buildDisputeContext(msg);
      const faq = await loadFAQ("buyer");
      const sys = `${settings.system_prompt_dispute}\n${info}\n\n=== FAQ ===\n${faq}\n\nQEYD: Sən AI köməkçisən, son qərarı admin verir. "🤖 Avtomatik cavab" əlavə et.`;
      const reply = await callAI(model, sys, msg.body, history);

      // dispute_messages requires sender_id; istifadə etdiyimiz "system" mövcud schema-da uyğundur
      const ownerAdmin = await admin.rpc("get_owner_admin_id");
      const adminId = ownerAdmin.data;
      const { data: ins } = await admin.from("dispute_messages").insert({
        dispute_id: msg.dispute_id, sender_id: adminId ?? msg.sender_id,
        sender_role: "system", body: reply,
      }).select("id").single();
      await admin.from("ai_replies_log").insert({ channel, source_message_id: messageId, reply_id: ins?.id });
      return json({ reply });
    }

    return json({ error: "unknown channel" }, 400);
  } catch (e) {
    console.error("ai-auto-reply error", e);
    await admin.from("ai_replies_log").insert({ channel: "unknown", status: "error", error: String(e) }).then(() => {});
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
