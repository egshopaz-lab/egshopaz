import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { SponsoredProducts } from "@/components/SponsoredProducts";
import { SellerBanners } from "@/components/SellerBanners";
import { Tag, Flame, TicketPercent, TrendingUp, Copy, Truck, ShieldCheck, Clock, Gift } from "lucide-react";
import { toast } from "sonner";
import { HomeCategoryBrowser } from "@/components/HomeCategoryBrowser";
import { FeaturedShops } from "@/components/FeaturedShops";
import i18n from "@/i18n";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: i18n.t("seo.homeTitle") },
      { name: "description", content: i18n.t("seo.homeDescription") },
      { property: "og:title", content: i18n.t("seo.homeTitle") },
      { property: "og:description", content: i18n.t("seo.homeOgDescription") },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
  component: Index,
});

interface Category { id: string; name: string; name_ru?: string | null; name_en?: string | null; slug: string; icon: string | null }
interface PromoCode { id: string; code: string; discount_percent: number | null; discount_amount: number | null; min_order: number; expires_at: string | null }

function Index() {
  const { t } = useTranslation();
  const [allProducts, setAllProducts] = useState<ProductCardData[]>([]);
  const [discounted, setDiscounted] = useState<ProductCardData[]>([]);
  const [trending, setTrending] = useState<ProductCardData[]>([]);
  const [giveaways, setGiveaways] = useState<ProductCardData[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);

  useEffect(() => {
    // Kritik: ana məhsullar dərhal

    supabase.from("products")
      .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setAllProducts((data ?? []) as ProductCardData[]));

    // Ləng: ikinci dərəcəli bölmələr — idle vaxtında
    const loadSecondary = () => {
      supabase.from("products")
        .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand")
        .eq("is_active", true).not("old_price", "is", null)
        .order("old_price", { ascending: false }).limit(5)
        .then(({ data }) => setDiscounted((data ?? []) as ProductCardData[]));

      supabase.from("products")
        .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand")
        .eq("is_active", true)
        .order("reviews_count", { ascending: false }).limit(6)
        .then(({ data }) => setTrending((data ?? []) as ProductCardData[]));

      supabase.from("promo_codes").select("id,code,discount_percent,discount_amount,min_order,expires_at").eq("is_active", true).limit(6)
        .then(({ data }) => setPromos((data ?? []) as PromoCode[]));

      supabase.from("products")
        .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand")
        .eq("is_active", true).eq("is_giveaway", true)
        .order("created_at", { ascending: false }).limit(4)
        .then(({ data }) => setGiveaways((data ?? []) as ProductCardData[]));
    };

    const w = typeof window !== "undefined" ? window : null;
    if (w && "requestIdleCallback" in w) {
      (w as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadSecondary);
    } else {
      setTimeout(loadSecondary, 200);
    }
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t("home.codeCopied", { code }));
  };

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 space-y-5 md:space-y-8">
      {/* Müvəqqəti panel girişləri — domen ayrılandan sonra silinəcək */}
      <h1 className="sr-only">EG Shop — Azərbaycanın onlayn marketi</h1>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 panel-scroll-row">
        <Link to="/auth" search={{ role: "seller" }} className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">Satıcı girişi</Link>
        <Link to="/pvz" className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">PVZ paneli</Link>
        <Link to="/admin" className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">Admin paneli</Link>
        <Link to="/become-seller" className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition">Satıcı ol</Link>
      </div>

      {/* Kateqoriyalar — ən yuxarıda */}
      <HomeCategoryBrowser />

      {/* 1) REKLAM — Satıcı bannerləri (birinci prioritet) */}
      <SellerBanners />

      {/* 2) REKLAM — Featured shops */}
      <FeaturedShops />

      {/* 3) REKLAM — Sponsored products (önə çıxan) */}
      <SponsoredProducts limit={8} />


      {giveaways.length > 0 && (
        <section className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-4 md:p-8 text-white shadow-elegant relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-yellow-200/30 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-end justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Gift className="h-3.5 w-3.5" /> {t("home.giveawayBadge")}
              </div>
              <h2 className="text-xl md:text-4xl font-black">{t("home.giveawayTitle")}</h2>
              <p className="text-sm opacity-95 mt-1">{t("home.giveawayDesc")}</p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white rounded-xl md:rounded-2xl p-2.5 md:p-3 mobile-product-grid home-product-strip">
            {giveaways.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} enableFavorite={false} />)}
          </div>
        </section>
      )}

      {discounted.length > 0 && (
        <section className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-discount via-discount to-rose-700 p-4 md:p-8 text-white shadow-elegant">
          <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Tag className="h-3.5 w-3.5" /> {t("home.discountBadge")}
              </div>
              <h2 className="text-xl md:text-4xl font-black leading-tight">{t("home.discountTitle")}</h2>
            </div>
            <Link to="/discover" className="text-sm font-bold hover:underline whitespace-nowrap">{t("home.viewAllArrow")}</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white rounded-xl md:rounded-2xl p-2.5 md:p-3 mobile-product-grid home-product-strip">
            {discounted.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} enableFavorite={false} />)}
          </div>
        </section>
      )}

      {/* Promo codes — kuponlar */}
      {promos.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-success font-bold text-xs uppercase mb-1">
                <TicketPercent className="h-4 w-4" /> {t("home.promoBadge")}
              </div>
              <h2 className="text-2xl md:text-3xl font-black">{t("home.promoTitle")}</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {promos.map((p) => (
              <div key={p.id} className="relative bg-gradient-to-r from-success via-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-card overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full blur-xl" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-3xl font-black mb-1">
                      {p.discount_percent ? `-${p.discount_percent}%` : `-${p.discount_amount} ₼`}
                    </div>
                    <div className="text-xs opacity-90">{t("home.promoMinOrder")}: {p.min_order} ₼</div>
                  </div>
                  <button onClick={() => copyCode(p.code)}
                          className="bg-white text-success px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:scale-105 transition">
                    {p.code} <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-card">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase">{t("home.trendingSubtitle")}</div>
                <h2 className="text-2xl md:text-3xl font-black">{t("home.trendingTitle")}</h2>
              </div>
            </div>
            <Link to="/discover" className="text-sm text-primary font-bold hover:underline">{t("home.viewAllArrow")}</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mobile-product-grid">
            {trending.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} enableFavorite={false} />)}
          </div>
        </section>
      )}



      {/* Kateqoriya tablar + kompakt alt kateqoriyalar + banner */}
      



      {/* Latest products */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-card">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black">{t("home.forYou")}</h2>
          </div>
          <Link to="/catalog" search={{ q: undefined, cat: undefined } as never} className="text-sm text-primary font-bold hover:underline">
            {t("home.viewAllArrow")}
          </Link>
        </div>
        {allProducts.length === 0 ? (
          <div className="text-center py-16 bg-secondary/40 rounded-2xl">
            <p className="text-muted-foreground mb-2">{t("home.noProducts")}</p>
            <Link to="/become-seller" className="text-primary font-bold hover:underline">{t("home.becomeFirstSeller")}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 mobile-product-grid">
            {allProducts.map((p) => <ProductCard key={p.id} p={p} enableFavorite={false} />)}
          </div>
        )}
      </section>

    </div>
  );
}
