import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Store, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ShopRow {
  id: string;
  seller_id: string;
  profiles?: {
    id: string;
    shop_name: string | null;
    full_name: string | null;
    shop_logo_url: string | null;
    shop_banner_url: string | null;
    shop_city: string | null;
  } | null;
}

export function FeaturedShops() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("sponsored_shops")
        .select("id,seller_id,profiles:seller_id(id,shop_name,full_name,shop_logo_url,shop_banner_url,shop_city)")
        .eq("is_active", true)
        .gt("ends_at", nowIso)
        .limit(12);
      setShops((data ?? []) as unknown as ShopRow[]);
    })();
  }, []);

  useEffect(() => {
    if (!user) { setFollowing(new Set()); return; }
    void (async () => {
      const { data } = await supabase.from("shop_followers").select("seller_id").eq("user_id", user.id);
      setFollowing(new Set((data ?? []).map((r) => r.seller_id as string)));
    })();
  }, [user]);

  const toggleFollow = async (sellerId: string) => {
    if (!user) { toast.error(t("ads.followLogin")); return; }
    if (following.has(sellerId)) {
      await supabase.from("shop_followers").delete().eq("user_id", user.id).eq("seller_id", sellerId);
      setFollowing((s) => { const n = new Set(s); n.delete(sellerId); return n; });
      toast.success(t("ads.unfollowed"));
    } else {
      const { error } = await supabase.from("shop_followers").insert({ user_id: user.id, seller_id: sellerId });
      if (error) { toast.error(error.message); return; }
      setFollowing((s) => new Set(s).add(sellerId));
      toast.success(t("ads.followed"));
    }
  };

  if (shops.length === 0) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-card">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-bold uppercase">{t("ads.label")}</div>
            <h2 className="text-2xl md:text-3xl font-black">{t("ads.featuredShops")}</h2>
          </div>
        </div>
        <Link to="/followed-shops" className="text-sm text-primary font-bold hover:underline">{t("ads.followedShops")}</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {shops.map((s) => {
          const p = s.profiles;
          if (!p) return null;
            const name = p.shop_name || p.full_name || t("shop.defaultName");
          const isFollowing = following.has(s.seller_id);
          return (
            <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-elegant transition group">
              <Link to="/shop/$id" params={{ id: s.seller_id }} className="block">
                <div className="aspect-[16/8] bg-gradient-brand relative">
                  {p.shop_banner_url && <img src={p.shop_banner_url} alt={name} loading="lazy" className="w-full h-full object-cover" />}
                  <div className="absolute top-1.5 left-1.5 bg-warning text-warning-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t("ads.adShort")}</div>
                </div>
                <div className="px-3 pt-3 flex items-start gap-2 -mt-7">
                  <div className="w-12 h-12 rounded-xl bg-card border-2 border-card shadow overflow-hidden shrink-0 flex items-center justify-center">
                    {p.shop_logo_url
                      ? <img src={p.shop_logo_url} alt={name} className="w-full h-full object-cover" />
                      : <Store className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1 pt-6">
                    <div className="font-bold text-sm line-clamp-1">{name}</div>
                    {p.shop_city && <div className="text-[11px] text-muted-foreground">{p.shop_city}</div>}
                  </div>
                </div>
              </Link>
              <div className="p-3 pt-2">
                <button
                  onClick={() => toggleFollow(s.seller_id)}
                  className={`w-full text-xs font-bold py-2 rounded-lg inline-flex items-center justify-center gap-1.5 transition ${isFollowing ? "bg-primary/10 text-primary border border-primary/30" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFollowing ? "fill-primary" : ""}`} />
                  {isFollowing ? t("ads.following") : t("ads.follow")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
