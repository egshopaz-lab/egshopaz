import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { Undo2, QrCode } from "lucide-react";
import { OrderQRDialog } from "@/components/OrderQRDialog";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/returns")({
  head: () => ({ meta: [{ title: "Qaytarmalarım — EG Shop" }] }),
  component: ReturnsPage,
});

interface MyReturn {
  id: string;
  pickup_code: string | null;
  reason: string;
  status: string;
  rejection_reason: string | null;
  cost_paid_by: string;
  seller_approved_at: string | null;
  pvz_received_at: string | null;
  shipped_to_seller_at: string | null;
  created_at: string;
  order_item_id: string;
  pickup_point_id: string | null;
  product_title?: string | null;
  pvz_name?: string | null;
  pvz_address?: string | null;
}

const STAGES = ["Satıcı təsdiqini gözləyir", "QR hazırdır — PVZ-ə apar", "PVZ qəbul etdi", "Satıcıya göndərildi", "Tamamlandı"];

function ReturnsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [returns, setReturns] = useState<MyReturn[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [qrFor, setQrFor] = useState<MyReturn | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("returns")
      .select("id,pickup_code,reason,status,rejection_reason,cost_paid_by,seller_approved_at,pvz_received_at,shipped_to_seller_at,created_at,order_item_id,pickup_point_id")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return; }
    const rows = (data ?? []) as MyReturn[];
    const itemIds = [...new Set(rows.map((r) => r.order_item_id).filter(Boolean))];
    const pvzIds = [...new Set(rows.map((r) => r.pickup_point_id).filter((x): x is string => !!x))];
    const [{ data: items }, { data: pvz }] = await Promise.all([
      itemIds.length ? supabase.from("order_items").select("id,title").in("id", itemIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      pvzIds.length ? supabase.from("pickup_points").select("id,name,address,city").in("id", pvzIds) : Promise.resolve({ data: [] as { id: string; name: string; address: string; city: string }[] }),
    ]);
    const itemMap = new Map((items ?? []).map((i) => [i.id, i]));
    const pvzMap = new Map((pvz ?? []).map((p) => [p.id, p]));
    setReturns(rows.map((r) => {
      const p = r.pickup_point_id ? pvzMap.get(r.pickup_point_id) : null;
      return {
        ...r,
        product_title: itemMap.get(r.order_item_id)?.title ?? null,
        pvz_name: p?.name ?? null,
        pvz_address: p ? `${p.city}, ${p.address}` : null,
      };
    }));
  };

  useEffect(() => { void load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`buyer-returns-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "returns", filter: `buyer_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) return null;

  const filtered = filter === "all" ? returns : returns.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "approved") return r.status !== "pending" && r.status !== "rejected" && r.status !== "completed";
    if (filter === "rejected") return r.status === "rejected";
    if (filter === "completed") return r.status === "completed";
    return true;
  });

  const tabs: [string, string][] = [
    ["all", "Hamısı"],
    ["pending", "Gözləyir"],
    ["approved", "Təsdiqlənib"],
    ["completed", "Tamamlandı"],
    ["rejected", "Rədd edildi"],
  ];

  return (
    <PanelLayout title="Qaytarmalarım" subtitle={user.email ?? undefined} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <Undo2 className="h-6 w-6 text-primary" /> Qaytarmalarım ({returns.length})
        </h1>

        <div className="panel-scroll-row pb-2 mb-4">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
              {l}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
            Heç bir qaytarma yoxdur
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const stage = r.status === "completed" ? 4
                : r.shipped_to_seller_at ? 3
                : r.pvz_received_at ? 2
                : r.seller_approved_at ? 1
                : 0;
              const stageLabel = r.status === "rejected" ? "❌ Rədd edildi" : STAGES[stage];
              const showQR = r.seller_approved_at && r.pickup_code && r.status !== "completed" && r.status !== "rejected" && !r.pvz_received_at;
              return (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{r.product_title ?? "—"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Səbəb: {r.reason}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</div>
                      <div className="text-xs mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded ${r.status === "rejected" ? "bg-destructive/10 text-destructive" : r.status === "completed" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                          {stageLabel}
                        </span>
                      </div>
                      {r.status === "rejected" && r.rejection_reason && (
                        <div className="mt-2 text-xs p-2 rounded bg-destructive/5 border border-destructive/20 text-destructive">
                          Satıcının izahı: {r.rejection_reason}
                        </div>
                      )}
                      {showQR && r.pickup_code && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Kod: <span className="font-mono font-bold text-foreground">{r.pickup_code}</span>
                        </div>
                      )}
                    </div>
                    {showQR && (
                      <button
                        onClick={() => setQrFor(r)}
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
        )}
      </div>

      {qrFor?.pickup_code && (
        <OrderQRDialog
          open={!!qrFor}
          onOpenChange={(v) => !v && setQrFor(null)}
          pickupCode={qrFor.pickup_code}
          title={`Qaytarma — ${qrFor.product_title ?? ""}`}
          subtitle="PVZ-də göstərin"
          pvzName={qrFor.pvz_name ?? null}
          pvzAddress={qrFor.pvz_address ?? null}
          mode="buyer"
        />
      )}
    </PanelLayout>
  );
}
