import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { Gift, Copy, Check, Tag, Flame } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Aksiyalar — EG Shop" }] }),
  component: PromotionsPage,
});

interface Promo { id: string; code: string; discount_percent: number | null; discount_amount: number | null; min_order: number; expires_at: string | null }

function PromotionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items } = useBuyerNav();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("promo_codes").select("*").eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data }) => setPromos((data ?? []) as Promo[]));
  }, []);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success("Kodu kopyalandı");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user?.email ?? t("promotions.title")} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><Gift className="h-6 w-6 text-primary" /> {t("promotions.title")}</h1>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {[
            { icon: Flame, t: "Flaş satışlar", d: "24 saat ərzində", c: "from-red-500 to-orange-500" },
            { icon: Tag, t: "Mövsümi endirim", d: "70%-ə qədər", c: "from-purple-500 to-pink-500" },
            { icon: Gift, t: "Hədiyyə kuponları", d: "Dostlara göndər", c: "from-blue-500 to-cyan-500" },
          ].map((b, i) => (
            <div key={i} className={`bg-gradient-to-br ${b.c} text-white rounded-2xl p-4`}>
              <b.icon className="h-8 w-8 mb-2" />
              <div className="font-bold">{b.t}</div>
              <div className="text-xs opacity-90">{b.d}</div>
            </div>
          ))}
        </div>

        <h2 className="font-bold mb-3">{t("promotions.title")}</h2>
        {promos.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
            {t("promotions.empty")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {promos.map((p) => (
              <div key={p.id} className="bg-card border-2 border-dashed border-primary rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">PROMO KOD</div>
                  <div className="font-bold text-xl tracking-wider text-primary">{p.code}</div>
                  <div className="text-sm mt-1">
                    {p.discount_percent ? `-${p.discount_percent}%` : p.discount_amount ? `-${p.discount_amount} ₼` : ""}
                    {p.min_order > 0 && <span className="text-muted-foreground"> · min {p.min_order} ₼</span>}
                  </div>
                  {p.expires_at && <div className="text-xs text-muted-foreground mt-1">Son: {formatDate(p.expires_at)}</div>}
                </div>
                <button onClick={() => copy(p.code)} className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  {copied === p.code ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
