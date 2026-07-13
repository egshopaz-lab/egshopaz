import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { Bell, Trash2, Check, Package } from "lucide-react";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Bildirişlər — EG Shop" }] }),
  component: NotificationsPage,
});

interface Alert { id: string; product_id: string; target_price: number; products: { title: string; price: number; image_url: string | null } | null }
interface Notif { id: string; title: string; body: string; type: string; link: string | null; is_read: boolean; created_at: string; pickup_code: string | null }

function NotificationsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = () => {
    if (!user) return;
    supabase.from("price_alerts").select("*, products(title,price,image_url)").eq("user_id", user.id)
      .then(({ data }) => setAlerts((data ?? []) as unknown as Alert[]));
    supabase.from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setNotifs((data ?? []) as Notif[]));
  };
  useEffect(load, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("price_alerts").delete().eq("id", id);
    if (error) toast.error("Silinmədi"); else { toast.success("Silindi"); load(); }
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
    toast.success("Hamısı oxundu");
  };

  if (!user) return null;

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user.email ?? undefined} items={items}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> {t("notifications.title")}</h1>
          {notifs.some((n) => !n.is_read) && (
            <button onClick={markAll} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <Check className="h-4 w-4" /> {t("notifications.markAll")}
            </button>
          )}
        </div>

        <h2 className="font-bold mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> {t("orders.title")}</h2>
        {notifs.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-8 text-center text-muted-foreground text-sm mb-6">
            {t("notifications.empty")}
          </div>
        ) : (
          <div className="space-y-2 mb-8">
            {notifs.map((n) => (
              <Link
                key={n.id}
                to={(n.link as "/orders" | "/my-reviews" | undefined) ?? "/notifications"}
                className={`block bg-card border rounded-xl p-3 hover:border-primary transition ${!n.is_read ? "border-primary/40 bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                    {n.pickup_code && (
                      <div className="mt-1.5 inline-block font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        Kod: {n.pickup_code}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <h2 className="font-bold mb-3">Qiymət düşmə bildirişləri</h2>
        {alerts.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-8 text-center text-muted-foreground text-sm">
            Qiymət bildirişiniz yoxdur. Məhsul səhifəsində "Qiymət düşəndə xəbər ver" düyməsi ilə əlavə edə bilərsiniz.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const reached = a.products && a.products.price <= a.target_price;
              return (
                <div key={a.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <Link to="/product/$id" params={{ id: a.product_id }} className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                    {a.products?.image_url && <img src={a.products.image_url} alt="" className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$id" params={{ id: a.product_id }} className="font-medium hover:text-primary truncate block">{a.products?.title}</Link>
                    <div className="text-xs text-muted-foreground">
                      Hədəf: {formatAZN(a.target_price)} · Cari: <span className={reached ? "text-green-600 font-bold" : ""}>{formatAZN(a.products?.price ?? 0)}</span>
                    </div>
                  </div>
                  {reached && <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-bold">ÇATDI!</span>}
                  <button onClick={() => remove(a.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
