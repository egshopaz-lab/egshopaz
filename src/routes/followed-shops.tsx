import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Heart, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/followed-shops")({
  head: () => ({ meta: [{ title: "İzlədiyim mağazalar — EG Shop" }] }),
  component: FollowedShopsPage,
});

interface Row {
  seller_id: string;
  profiles: {
    id: string;
    shop_name: string | null;
    full_name: string | null;
    shop_logo_url: string | null;
    shop_banner_url: string | null;
    shop_city: string | null;
    shop_description: string | null;
  } | null;
}

function FollowedShopsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("shop_followers")
      .select("seller_id,profiles:seller_id(id,shop_name,full_name,shop_logo_url,shop_banner_url,shop_city,shop_description)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const unfollow = async (sellerId: string) => {
    if (!user) return;
    await supabase.from("shop_followers").delete().eq("user_id", user.id).eq("seller_id", sellerId);
    toast.success(t("shops.unfollowed"));
    void load();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-2xl font-bold mb-2">{t("shops.followedTitle")}</h1>
        <p className="text-muted-foreground mb-4">{t("shops.loginToFollow")}</p>
        <Link to="/auth" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold">{t("header.login")}</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-card">
          <Heart className="h-6 w-6 text-white fill-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black">{t("shops.followedTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("shops.followedCount", { count: rows.length })}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">{t("common.loading")}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-secondary/40 rounded-2xl">
          <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">{t("shops.emptyFollowed")}</p>
          <Link to="/" className="text-primary font-bold hover:underline">{t("shops.discover")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const p = r.profiles;
            if (!p) return null;
            const name = p.shop_name || p.full_name || t("shops.shopFallback");
            return (
              <div key={r.seller_id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-elegant transition">
                <Link to="/shop/$id" params={{ id: r.seller_id }} className="block">
                  <div className="aspect-[16/7] bg-gradient-brand">
                    {p.shop_banner_url && <img src={p.shop_banner_url} alt={name} loading="lazy" className="w-full h-full object-cover" />}
                  </div>
                  <div className="px-4 pt-4 flex items-start gap-3 -mt-8">
                    <div className="w-14 h-14 rounded-2xl bg-card border-2 border-card shadow overflow-hidden shrink-0 flex items-center justify-center">
                      {p.shop_logo_url
                        ? <img src={p.shop_logo_url} alt={name} className="w-full h-full object-cover" />
                        : <Store className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1 pt-7">
                      <div className="font-bold line-clamp-1">{name}</div>
                      {p.shop_city && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.shop_city}</div>}
                    </div>
                  </div>
                  {p.shop_description && <p className="px-4 pt-2 text-xs text-muted-foreground line-clamp-2">{p.shop_description}</p>}
                </Link>
                <div className="p-4 pt-3">
                  <button onClick={() => unfollow(r.seller_id)} className="w-full text-xs font-bold py-2 rounded-lg bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive transition">
                    {t("shops.unfollowed")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
