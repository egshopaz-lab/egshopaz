import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { DisputeChat, type DisputeRow } from "@/components/DisputeChat";
import { AlertTriangle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/disputes")({
  head: () => ({ meta: [{ title: "Mübahisələr — EG Shop" }] }),
  component: DisputesPage,
});

function DisputesPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("disputes").select("*")
      .eq("buyer_id", user.id).order("created_at", { ascending: false });
    setDisputes((data ?? []) as DisputeRow[]);
    if (data?.length && !activeId) setActiveId(data[0].id);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  if (!user) return null;
  const active = disputes.find((d) => d.id === activeId);

  return (
    <PanelLayout title="Müştərinin şəxsi kabineti" subtitle={user.email ?? undefined} items={items}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Mübahisələr
          </h1>
          <button onClick={() => setShowNew(true)} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-bold inline-flex items-center gap-1">
            <Plus className="h-4 w-4" /> Yeni mübahisə
          </button>
        </div>

        {disputes.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
            Açıq mübahisəniz yoxdur.
          </div>
        ) : (
          <div className="grid md:grid-cols-[280px_1fr] gap-4">
            <div className="space-y-2">
              {disputes.map((d) => (
                <button key={d.id} onClick={() => setActiveId(d.id)}
                  className={`w-full text-left p-3 rounded-xl border ${activeId === d.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <div className="font-semibold text-sm line-clamp-1">{d.reason}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(d.created_at)}
                  </div>
                  <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded font-bold ${
                    d.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                    d.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}>{d.status}</span>
                </button>
              ))}
            </div>
            {active && <DisputeChat dispute={active} currentUserId={user.id} role="buyer" />}
          </div>
        )}

        {showNew && <NewDisputeDialog buyerId={user.id} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      </div>
    </PanelLayout>
  );
}

function NewDisputeDialog({ buyerId, onClose, onCreated }: { buyerId: string; onClose: () => void; onCreated: () => void }) {
  const [orders, setOrders] = useState<{ id: string; created_at: string; order_items: { seller_id: string; title: string }[] }[]>([]);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("Məhsul zədəlidir");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("orders").select("id,created_at,order_items(seller_id,title)")
      .eq("buyer_id", buyerId).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setOrders((data ?? []) as never));
  }, [buyerId]);

  const submit = async () => {
    if (!reason.trim()) { toast.error("Səbəb daxil edin"); return; }
    setBusy(true);
    const order = orders.find((o) => o.id === orderId);
    const sellerId = order?.order_items?.[0]?.seller_id ?? null;
    const { error } = await supabase.from("disputes").insert({
      buyer_id: buyerId, seller_id: sellerId, order_id: orderId || null,
      reason, description, status: "open",
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mübahisə açıldı — admin və satıcıya bildiriş getdi");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-lg w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Yeni mübahisə</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Sifariş seç (istəyə görə)</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)}
            className="w-full mt-1 border border-input rounded-lg px-3 h-10 bg-background">
            <option value="">— Sifariş seçməmisiniz —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id.slice(0, 8).toUpperCase()} — {formatDate(o.created_at)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Səbəb</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 border border-input rounded-lg px-3 h-10 bg-background">
            <option>Məhsul zədəlidir</option>
            <option>Məhsul fərqlidir / yanlışdır</option>
            <option>Məhsul çatdırılmadı</option>
            <option>Keyfiyyət gözləntidən aşağıdır</option>
            <option>Geri qaytarma sorğusu</option>
            <option>Digər</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Ətraflı təsvir</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4}
            placeholder="Problemi ətraflı izah edin..."
            className="w-full mt-1 border border-input rounded-lg p-3 text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">Ləğv et</button>
          <button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground px-4 h-10 rounded-lg text-sm font-bold disabled:opacity-60">
            {busy ? "Göndərilir..." : "Mübahisə yarat"}
          </button>
        </div>
      </div>
    </div>
  );
}
