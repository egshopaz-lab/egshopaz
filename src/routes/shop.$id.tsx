import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { ShopReviews } from "@/components/ShopReviews";
import { Store, MapPin, Mail, Star, Package, Heart, Calendar, Award, MessageCircle, Share2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/shop/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("profiles_public")
      .select("id,shop_name,full_name,shop_description,shop_city,shop_logo_url,shop_banner_url")
      .eq("id", params.id)
      .maybeSingle();
    return { shop: data };
  },
  head: ({ params, loaderData }) => {
    const s = loaderData?.shop;
    const url = absoluteUrl(`/shop/${params.id}`);
    const name = s?.shop_name || s?.full_name || "Mağaza";
    const title = `${name} — EG Shop`;
    const desc = ((s?.shop_description ?? "").trim() ||
      `${name} mağazası EG Shop-da. Geniş çeşid, sərfəli qiymətlər və sürətli çatdırılma.`).slice(0, 160);
    const image = s?.shop_banner_url || s?.shop_logo_url || undefined;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name,
          description: desc,
          url,
          logo: s?.shop_logo_url || undefined,
          image,
          address: s?.shop_city ? { "@type": "PostalAddress", addressLocality: s.shop_city, addressCountry: "AZ" } : undefined,
        }),
      }],
    };
  },
  component: ShopPage,
});

interface Profile {
  id: string; shop_name: string | null; full_name: string | null;
  shop_description: string | null; shop_city: string | null; shop_email: string | null;
  shop_logo_url: string | null; shop_banner_url: string | null;
  phone: string | null; created_at: string; seller_tier: string | null;
  seller_total_orders: number | null;
}

const tierConfig: Record<string, { label: string; color: string }> = {
  platinum: { label: "Platinum", color: "from-slate-300 to-slate-500" },
  gold: { label: "Gold", color: "from-yellow-400 to-amber-600" },
  silver: { label: "Silver", color: "from-gray-300 to-gray-500" },
  bronze: { label: "Bronze", color: "from-amber-600 to-orange-700" },
};

function ShopPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [stats, setStats] = useState({ count: 0, avg: 0, reviews: 0, years: 0 });
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [tab, setTab] = useState<"products" | "reviews" | "about">("products");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("profiles_public").select("id,shop_name,full_name,shop_description,shop_city,shop_email,shop_logo_url,shop_banner_url,created_at,seller_tier,seller_total_orders").eq("id", id).maybeSingle(),
      supabase.from("products").select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand").eq("seller_id", id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("shop_followers").select("id", { count: "exact", head: true }).eq("seller_id", id),
    ]).then(([{ data: prof }, { data: prods }, { count }]) => {
      setProfile(prof as Profile | null);
      const list = (prods ?? []) as ProductCardData[];
      setProducts(list);
      const totalReviews = list.reduce((s, p) => s + (p.reviews_count || 0), 0);
      const weightedSum = list.reduce((s, p) => s + (Number(p.rating) || 0) * (p.reviews_count || 0), 0);
      const years = prof?.created_at ? Math.floor((Date.now() - new Date(prof.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
      setStats({ count: list.length, avg: totalReviews > 0 ? weightedSum / totalReviews : 0, reviews: totalReviews, years });
      setFollowers(count ?? 0);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!user) { setFollowing(false); return; }
    void supabase.from("shop_followers").select("id").eq("user_id", user.id).eq("seller_id", id).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, id]);

  const toggleFollow = async () => {
    if (!user) { toast.error("İzləmək üçün daxil olun"); return; }
    if (user.id === id) { toast.error("Öz mağazanızı izləyə bilməzsiniz"); return; }
    if (following) {
      await supabase.from("shop_followers").delete().eq("user_id", user.id).eq("seller_id", id);
      setFollowing(false); setFollowers((c) => Math.max(0, c - 1));
      toast.success("İzləməkdən çıxarıldı");
    } else {
      const { error } = await supabase.from("shop_followers").insert({ user_id: user.id, seller_id: id });
      if (error) { toast.error(error.message); return; }
      setFollowing(true); setFollowers((c) => c + 1);
      toast.success("Mağaza izlənildi 💙");
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: profile?.shop_name || "Mağaza", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link kopyalandı");
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-10 text-muted-foreground">{t("common.loading")}</div>;
  if (!profile) return <div className="container mx-auto px-4 py-10">{t("shop.notFound")}. <Link to="/" className="text-primary">{t("product.home")}</Link></div>;

  const name = profile.shop_name || profile.full_name || t("shop.defaultName");
  const tier = tierConfig[profile.seller_tier || "bronze"] || tierConfig.bronze;

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-6 space-y-6">
      {/* Banner */}
      <div className="relative h-48 md:h-72 md:rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/40">
        {profile.shop_banner_url && (
          <img src={profile.shop_banner_url} alt={`${name} mağaza banneri`} loading="eager" decoding="async" fetchPriority="high" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <button onClick={share} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-foreground flex items-center justify-center shadow-lg backdrop-blur transition">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Header card */}
      <div className="mx-4 md:mx-0 -mt-20 md:-mt-24 relative">
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-elegant">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="relative shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-secondary border-4 border-card shadow-lg overflow-hidden flex items-center justify-center">
                {profile.shop_logo_url
                  ? <img src={profile.shop_logo_url} alt={`${name} loqosu`} loading="eager" decoding="async" className="w-full h-full object-cover" />
                  : <Store className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white bg-gradient-to-r ${tier.color} shadow-md inline-flex items-center gap-1`}>
                <Award className="h-3 w-3" /> {tier.label}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black leading-tight flex items-center gap-2">
                    {name}
                    {followers >= 100 && (
                      <BadgeCheck className="h-6 w-6 md:h-7 md:w-7 text-blue-500 fill-blue-500" />
                    )}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                    {profile.shop_city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {profile.shop_city}
                      </span>
                    )}
                  </div>
                </div>
                {user?.id !== id && (
                  <button
                    onClick={toggleFollow}
                    className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm ${following ? "bg-primary/10 text-primary border border-primary/30" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    <Heart className={`h-4 w-4 ${following ? "fill-primary" : ""}`} />
                    {following ? "İzlənilir" : "İzlə"}
                  </button>
                )}
              </div>

              {profile.shop_description && (
                <p className="text-sm text-foreground/80 mt-3 max-w-2xl line-clamp-2">{profile.shop_description}</p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> Məhsul</div>
                  <div className="font-black text-lg mt-0.5">{stats.count}</div>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5" /> Reytinq</div>
                  <div className="font-black text-lg mt-0.5 flex items-center gap-1">
                    {stats.avg.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground">({stats.reviews})</span>
                  </div>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Heart className="h-3.5 w-3.5" /> İzləyici</div>
                  <div className="font-black text-lg mt-0.5 flex items-center gap-1">
                    {followers}
                    {followers >= 100 && <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500" />}
                  </div>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Award className="h-3.5 w-3.5" /> Sifariş</div>
                  <div className="font-black text-lg mt-0.5">{profile.seller_total_orders ?? 0}</div>
                </div>
                <div className="p-3 bg-secondary/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Fəaliyyət</div>
                  <div className="font-black text-lg mt-0.5">{stats.years > 0 ? `${stats.years} il` : " < 1 il"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-0">
        <div className="flex gap-1 p-1 bg-secondary/60 rounded-2xl w-full md:w-fit">
          {([
            { k: "products", label: `Məhsullar (${stats.count})` },
            { k: "reviews", label: `Rəylər (${stats.reviews})` },
            { k: "about", label: "Haqqında" },
          ] as const).map((it) => (
            <button
              key={it.k}
              onClick={() => setTab(it.k)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition ${tab === it.k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <section className="px-4 md:px-0">
        {tab === "products" && (
          products.length === 0 ? (
            <div className="text-center py-16 bg-secondary/40 rounded-2xl text-muted-foreground">{t("shop.noProducts")}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )
        )}

        {tab === "reviews" && <ShopReviews sellerId={id} />}

        {tab === "about" && (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4 max-w-2xl">
            <div>
              <h3 className="font-black text-lg mb-2">Mağaza haqqında</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line">
                {profile.shop_description || "Mağaza hələ təsvir əlavə etməyib."}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-border">
              {profile.shop_city && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div><div className="text-xs text-muted-foreground">Şəhər</div><div className="font-semibold">{profile.shop_city}</div></div>
                </div>
              )}
              {profile.shop_email && (
                <div className="flex items-start gap-2.5 text-sm">
                  <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div><div className="text-xs text-muted-foreground">Email</div><div className="font-semibold break-all">{profile.shop_email}</div></div>
                </div>
              )}
              <div className="flex items-start gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><div className="text-xs text-muted-foreground">Qoşulub</div><div className="font-semibold">{formatDate(profile.created_at)}</div></div>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><div className="text-xs text-muted-foreground">Fəaliyyət ili</div><div className="font-semibold">{stats.years > 0 ? `${stats.years} il` : " < 1 il"}</div></div>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Award className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><div className="text-xs text-muted-foreground">Səviyyə</div><div className="font-semibold capitalize">{tier.label}</div></div>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div><div className="text-xs text-muted-foreground">Ümumi rəy</div><div className="font-semibold">{stats.reviews}</div></div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
