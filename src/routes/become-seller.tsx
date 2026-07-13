import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Store, TrendingUp, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/become-seller")({
  head: () => ({ meta: [{ title: "Satıcı ol — EG Shop" }] }),
  component: BecomeSeller,
});

function BecomeSeller() {
  const { t } = useTranslation();
  const { user, isSeller, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (isSeller) navigate({ to: "/seller" });
  }, [user, isSeller, loading, navigate]);

  const become = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (shopName.trim().length < 2) { toast.error("Mağaza adı daxil edin"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("become_seller", { _shop_name: shopName.trim().slice(0, 100) });
    if (error) {
      toast.error(error.message || "Mağaza açıla bilmədi. Yenidən cəhd edin.");
    } else {
      toast.success("Təbrik edirik! Artıq satıcısınız");
      await refreshRoles();
      navigate({ to: "/seller" });
    }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="bg-gradient-brand text-primary-foreground rounded-3xl p-8 mb-6 shadow-elegant">
        <Store className="h-12 w-12 mb-3 opacity-90" />
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{t("becomeSeller.title")}</h1>
        <p className="opacity-90">{t("becomeSeller.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: TrendingUp, t: "Geniş auditoriya", s: "Bütün Azərbaycan" },
          { icon: Package, t: "Sadə idarəetmə", s: "Bir paneldən hamısı" },
          { icon: Store, t: "Pulsuz başla", s: "Heç bir ödəniş yoxdur" },
        ].map((b, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <b.icon className="h-6 w-6 text-primary mb-2" />
            <div className="font-bold text-sm">{b.t}</div>
            <div className="text-xs text-muted-foreground">{b.s}</div>
          </div>
        ))}
      </div>

      <form onSubmit={become} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold">{t("becomeSeller.shopName")}</label>
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} maxLength={100}
                 placeholder={t("becomeSeller.shopName")}
                 className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background" />
        </div>
        <button type="submit" disabled={busy}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60">
          {busy ? "..." : t("becomeSeller.submit")}
        </button>
      </form>
    </div>
  );
}
