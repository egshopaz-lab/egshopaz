import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { formatAZN, formatDateTime } from "@/lib/format";
import { Package, MapPin, X, MessageCircle, Send, QrCode, Map as MapIcon, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { OrderTimeline } from "@/components/OrderTimeline";
import { OrderQRDialog } from "@/components/OrderQRDialog";
import { OrderTrackDialog } from "@/components/OrderTrackDialog";
import { ReturnRequestDialog } from "@/components/ReturnRequestDialog";
import { DateRangeFilter, emptyRange, inRange, type DateRange } from "@/components/DateRangeFilter";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Sifarişlərim — EG Shop" }] }),
  component: OrdersPage,
});

interface OrderItem { id: string; title: string; price: number; quantity: number; image_url: string | null; status: string; seller_id: string; product_id: string; pickup_code: string | null; accepted_at: string | null; delivered_at: string | null; pickup_point_id: string | null }
interface Order { id: string; total: number; status: string; created_at: string; shipping_address: string | null; payment_method: string; pickup_point_id: string | null; recipient_name: string | null; recipient_phone: string | null; pickup_points: { name: string; address: string; city: string } | null; order_items: OrderItem[] }
interface MyReturn { id: string; pickup_code: string | null; reason: string; status: string; cost_paid_by: string; seller_approved_at: string | null; pvz_received_at: string | null; shipped_to_seller_at: string | null; created_at: string; order_item_id: string; pickup_point_id: string | null; product_title?: string | null; pvz_name?: string | null; pvz_address?: string | null }

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  packed: "bg-purple-100 text-purple-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function OrdersPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(emptyRange);
  const [msgItem, setMsgItem] = useState<OrderItem | null>(null);
  const [msgOrderId, setMsgOrderId] = useState<string | null>(null);
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [qrItem, setQrItem] = useState<OrderItem | null>(null);
  const [trackOrder, setTrackOrder] = useState<Order | null>(null);
  const [returnItem, setReturnItem] = useState<{ item: OrderItem; orderId: string } | null>(null);
  const [myReturns, setMyReturns] = useState<MyReturn[]>([]);
  const [returnQR, setReturnQR] = useState<MyReturn | null>(null);
  const qrOrder = qrItem ? orders.find((o) => o.order_items?.some((i) => i.id === qrItem.id)) : null;

  const statusLabel: Record<string, string> = {
    pending: t("orders.pending"), paid: t("orders.paid"), packed: "Paketləndi", shipped: t("orders.shipped"),
    delivered: t("orders.delivered"), cancelled: t("orders.cancelled"),
  };

  const sendMessage = async () => {
    if (!user || !msgItem) return;
    const body = msgBody.trim();
    if (body.length < 2) { toast.error(t("orders.messageShort")); return; }
    if (user.id === msgItem.seller_id) { toast.error(t("orders.ownShopError")); return; }
    setMsgSending(true);
    const { error } = await supabase.from("shop_messages").insert({
      buyer_id: user.id,
      seller_id: msgItem.seller_id,
      product_id: msgItem.product_id,
      order_id: msgOrderId,
      sender_role: "buyer",
      body,
    });
    setMsgSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("orders.messageSent"));
    setMsgBody(""); setMsgItem(null); setMsgOrderId(null);
  };

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("orders")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Sifarişlər yüklənmədi: ${error.message}`);
      return;
    }
    const orderRows = (data ?? []) as unknown as Order[];
    const orderIds = orderRows.map((o) => o.id);
    const pickupIds = [...new Set(orderRows.map((o) => o.pickup_point_id).filter(Boolean))] as string[];
    const [{ data: itemRows, error: itemsError }, { data: pickupRows, error: pickupError }] = await Promise.all([
      orderIds.length
        ? supabase.from("order_items").select("id,title,price,quantity,image_url,status,seller_id,product_id,pickup_code,accepted_at,delivered_at,pickup_point_id,order_id").in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null }),
      pickupIds.length
        ? supabase.from("pickup_points").select("id,name,address,city").in("id", pickupIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (itemsError || pickupError) {
      toast.error(`Sifariş detalları yüklənmədi: ${(itemsError ?? pickupError)?.message}`);
      return;
    }
    const itemsByOrder = new Map<string, OrderItem[]>();
    ((itemRows ?? []) as unknown as (OrderItem & { order_id: string })[]).forEach((item) => {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    });
    const pickupMap = new Map((pickupRows ?? []).map((p) => [p.id, p]));
    setOrders(orderRows.map((order) => ({
      ...order,
      order_items: itemsByOrder.get(order.id) ?? [],
      pickup_points: order.pickup_point_id ? (pickupMap.get(order.pickup_point_id) ?? null) : null,
    })));
  };
  const loadReturns = async () => {
    if (!user) return;
    const { data } = await supabase.from("returns")
      .select("id,pickup_code,reason,status,cost_paid_by,seller_approved_at,pvz_received_at,shipped_to_seller_at,created_at,order_item_id,pickup_point_id,order_items(title),pickup_points(name,address,city)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    type Row = { id: string; pickup_code: string | null; reason: string; status: string; cost_paid_by: string; seller_approved_at: string | null; pvz_received_at: string | null; shipped_to_seller_at: string | null; created_at: string; order_item_id: string; pickup_point_id: string | null; order_items: { title: string } | null; pickup_points: { name: string; address: string; city: string } | null };
    setMyReturns(((data ?? []) as unknown as Row[]).map((r) => ({
      ...r,
      product_title: r.order_items?.title ?? null,
      pvz_name: r.pickup_points?.name ?? null,
      pvz_address: r.pickup_points ? `${r.pickup_points.city}, ${r.pickup_points.address}` : null,
    })));
  };
  useEffect(() => { void load(); void loadReturns(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ordersCh = supabase.channel(`buyer-orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` }, load)
      .subscribe();
    const itemsCh = supabase.channel(`buyer-order-items-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, load)
      .subscribe();
    const retCh = supabase.channel(`buyer-returns-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "returns", filter: `buyer_id=eq.${user.id}` }, loadReturns)
      .subscribe();
    return () => { supabase.removeChannel(ordersCh); supabase.removeChannel(itemsCh); supabase.removeChannel(retCh); };
  }, [user]);

  const cancel = async (id: string) => {
    if (!confirm(t("orders.cancelConfirm"))) return;
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(t("orders.cancelError")); else { toast.success(t("orders.cancelled_msg")); load(); }
  };

  if (!user) return null;
  const filtered = orders
    .filter((o) => (filter === "all" ? true : o.status === filter))
    .filter((o) => inRange(o.created_at, dateRange));

  const filterTabs: [string, string][] = [
    ["all", t("orders.all")],
    ["pending", t("orders.pending")],
    ["paid", t("orders.paid")],
    ["packed", "Paketləndi"],
    ["shipped", t("orders.shipped")],
    ["delivered", t("orders.delivered")],
    ["cancelled", t("orders.cancelShort")],
  ];

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user.email ?? undefined} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> {t("orders.title")}</h1>
        <div className="mb-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="panel-scroll-row pb-2 mb-4">
          {filterTabs.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
              {l}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">{t("orders.empty")}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground">№ {o.id.slice(0, 8).toUpperCase()} · 📅 {formatDateTime(o.created_at)}</div>
                    {o.shipping_address && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {o.shipping_address}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor[o.status] ?? "bg-secondary"}`}>{statusLabel[o.status] ?? o.status}</span>
                    <span className="font-extrabold">{formatAZN(o.total)}</span>
                  </div>
                </div>
                <OrderTimeline status={o.status} />
                <div className="space-y-2 mt-3">
                  {o.order_items?.map((it) => (
                    <div key={it.id} className="flex items-start gap-3 text-sm">
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                        {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{it.title}</div>
                        <div className="text-xs text-muted-foreground">{it.quantity} × {formatAZN(it.price)}</div>
                        {it.delivered_at ? (
                          <div className="text-[10px] text-success font-semibold mt-0.5">
                            {t("orders.received")} · {formatDateTime(it.delivered_at)}
                          </div>
                        ) : it.accepted_at ? (
                          <div className="text-[10px] text-primary font-semibold mt-0.5">
                            {t("orders.atPvz")} · {formatDateTime(it.accepted_at)}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {it.pickup_code && !it.delivered_at && (
                          <button
                            onClick={() => setQrItem(it)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition inline-flex items-center gap-1"
                          >
                            <QrCode className="h-3.5 w-3.5" /> {t("orders.qr")}
                          </button>
                        )}
                        {it.delivered_at && (() => {
                          const ms = Date.now() - new Date(it.delivered_at).getTime();
                          const inWindow = ms <= 3 * 24 * 60 * 60 * 1000;
                          return inWindow ? (
                            <button
                              onClick={() => setReturnItem({ item: it, orderId: o.id })}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning-foreground border border-warning/40 hover:bg-warning/20 transition inline-flex items-center gap-1"
                            >
                              <Undo2 className="h-3.5 w-3.5" /> Qaytar
                            </button>
                          ) : null;
                        })()}
                        {user.id !== it.seller_id && (
                          <button
                            onClick={() => { setMsgItem(it); setMsgOrderId(o.id); setMsgBody(""); }}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:border-primary hover:text-primary transition inline-flex items-center gap-1"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> {t("orders.write")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={() => setTrackOrder(o)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1.5">
                    <MapIcon className="h-4 w-4" /> Xəritədə izlə
                  </button>
                  {(o.status === "pending" || o.status === "paid") && (
                    <button onClick={() => cancel(o.id)} className="text-sm text-destructive hover:underline inline-flex items-center gap-1">
                      <X className="h-3 w-3" /> {t("orders.cancel")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {myReturns.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-primary" /> Qaytarmalarım ({myReturns.length})
            </h2>
            <div className="space-y-2">
              {myReturns.map((r) => {
                const stage = r.status === "completed" ? 4
                  : r.shipped_to_seller_at ? 3
                  : r.pvz_received_at ? 2
                  : r.seller_approved_at ? 1
                  : 0;
                const STAGES = ["Satıcı təsdiqini gözləyir", "QR hazırdır — PVZ-ə apar", "PVZ qəbul etdi", "Satıcıya göndərildi", "Tamamlandı"];
                const stageLabel = r.status === "rejected" ? "❌ Rədd edildi" : STAGES[stage];
                return (
                  <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{r.product_title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">Səbəb: {r.reason}</div>
                        <div className="text-xs mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded ${r.status === "rejected" ? "bg-destructive/10 text-destructive" : r.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                            {stageLabel}
                          </span>
                        </div>
                      </div>
                      {r.seller_approved_at && r.pickup_code && r.status !== "completed" && r.status !== "rejected" && !r.pvz_received_at && (
                        <button
                          onClick={() => setReturnQR(r)}
                          className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-1 shrink-0"
                        >
                          <QrCode className="h-4 w-4" /> QR göstər
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      {STAGES.map((s, i) => (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${i <= stage && r.status !== "rejected" ? "bg-primary" : "bg-muted"}`} />
                          <div className={`text-[9px] mt-1 text-center ${i <= stage && r.status !== "rejected" ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {qrItem?.pickup_code && (
        <OrderQRDialog
          open={!!qrItem}
          onOpenChange={(v) => !v && setQrItem(null)}
          pickupCode={qrItem.pickup_code}
          title={qrItem.title}
          subtitle={`${t("orders.orderNumber")}${qrOrder?.id.slice(0, 8).toUpperCase()}`}
          pvzName={qrOrder?.pickup_points?.name ?? null}
          pvzAddress={qrOrder?.pickup_points ? `${qrOrder.pickup_points.city}, ${qrOrder.pickup_points.address}` : null}
          customerName={qrOrder?.recipient_name ?? null}
          customerPhone={qrOrder?.recipient_phone ?? null}
          orderDate={qrOrder?.created_at ?? null}
          mode="buyer"
        />
      )}

      {msgItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setMsgItem(null)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> {t("orders.messageSeller")}</h3>
              <button onClick={() => setMsgItem(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2">{msgItem.title}</div>
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder={t("orders.messagePlaceholder")}
              rows={4}
              maxLength={2000}
              className="w-full p-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMsgItem(null)} className="text-sm px-3 py-1.5 rounded-lg hover:bg-secondary">{t("common.cancel")}</button>
              <button
                onClick={sendMessage}
                disabled={msgSending || msgBody.trim().length < 2}
                className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> {msgSending ? "..." : t("common.send")}
              </button>
            </div>
          </div>
        </div>
      )}

      {trackOrder && (
        <OrderTrackDialog
          open={!!trackOrder}
          onClose={() => setTrackOrder(null)}
          orderId={trackOrder.id}
          pickupPointId={trackOrder.pickup_point_id}
        />
      )}

      {returnItem && (
        <ReturnRequestDialog
          open={!!returnItem}
          onOpenChange={(v) => !v && setReturnItem(null)}
          orderItemId={returnItem.item.id}
          orderId={returnItem.orderId}
          buyerId={user.id}
          sellerId={returnItem.item.seller_id}
          productTitle={returnItem.item.title}
          deliveredAt={returnItem.item.delivered_at}
          pickupPointId={returnItem.item.pickup_point_id}
          onDone={() => { void load(); void loadReturns(); }}
        />
      )}

      {returnQR?.pickup_code && (
        <OrderQRDialog
          open={!!returnQR}
          onOpenChange={(v) => !v && setReturnQR(null)}
          pickupCode={returnQR.pickup_code}
          title={`Qaytarma — ${returnQR.product_title ?? ""}`}
          subtitle="PVZ-də göstərin"
          pvzName={returnQR.pvz_name ?? null}
          pvzAddress={returnQR.pvz_address ?? null}
          mode="buyer"
        />
      )}
    </PanelLayout>
  );
}
