import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Store, MapPin, Search, Heart, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shops")({
  head: () => ({ meta: [{ title: "Mağazalar — EG Shop" }] }),
  component: ShopsPage,
});

interface Shop {
  id: string;
  shop_name: string | null;
  full_name: string | null;
  shop_logo_url: string | null;
  shop_banner_url: string | null;
  shop_city: string | null;
  shop_description: string | null;
}

function ShopsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles_public")
      .select("id,shop_name,full_name,shop_logo_url,shop_banner_url,shop_city,shop_description")
      .not("shop_name", "is", null)
      .order("shop_name");
    setShops((data ?? []) as Shop[]);
    if (user) {
      const { data: f } = await supabase
        .from("shop_followers")
        .select("seller_id")
        .eq("user_id", user.id);
      setFollowing(new Set((f ?? []).map((r: { seller_id: string }) => r.seller_id)));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return shops;
    return shops.filter((sh) =>
      (sh.shop_name ?? "").toLowerCase().includes(s) ||
      (sh.shop_city ?? "").toLowerCase().includes(s) ||
      (sh.shop_description ?? "").toLowerCase().includes(s)
    );
  }, [shops, q]);

  const toggleFollow = async (sellerId: string) => {
    if (!user) { toast.error(t("shops.loginRequired")); return; }
    if (user.id === sellerId) { toast.error(t("shops.ownShopFollowError")); return; }
    if (following.has(sellerId)) {
      await supabase.from("shop_followers").delete().eq("user_id", user.id).eq("seller_id", sellerId);
      const n = new Set(following); n.delete(sellerId); setFollowing(n);
      toast.success(t("shops.unfollowed"));
    } else {
      const { error } = await supabase.from("shop_followers").insert({ user_id: user.id, seller_id: sellerId });
      if (error) { toast.error(error.message); return; }
      const n = new Set(following); n.add(sellerId); setFollowing(n);
      toast.success(t("shops.followedSuccess"));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-card">
          <Store className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-black">{t("shops.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("shops.count", { count: filtered.length })}</p>
        </div>
        {user && (
          <Link to="/followed-shops" className="text-sm font-bold text-primary hover:underline inline-flex items-center gap-1">
            <Heart className="h-4 w-4" /> {t("shops.followed")}
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("shops.searchPlaceholder")}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-secondary/40 rounded-2xl">
          <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("shops.notFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const name = p.shop_name || p.full_name || t("shops.shopFallback");
            const isFollowing = following.has(p.id);
            const own = user?.id === p.id;
            return (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-elegant transition">
                <Link to="/shop/$id" params={{ id: p.id }} className="block">
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
                  {own ? (
                    <div className="text-xs text-center text-muted-foreground py-2">{t("shops.ownShop")}</div>
                  ) : (
                    <button
                      onClick={() => toggleFollow(p.id)}
                      className={`w-full text-xs font-bold py-2 rounded-lg transition inline-flex items-center justify-center gap-1 ${
                        isFollowing
                          ? "bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isFollowing ? <><Check className="h-3.5 w-3.5" /> {t("shops.following")}</> : <><Heart className="h-3.5 w-3.5" /> {t("shops.follow")}</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
