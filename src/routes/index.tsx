import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { SponsoredProducts } from "@/components/SponsoredProducts";
import { Tag, Flame, TicketPercent, TrendingUp, Copy, Truck, ShieldCheck, Gift, ArrowRight, Headphones, RotateCcw, ShoppingBag, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { HomeCategoryBrowser } from "@/components/HomeCategoryBrowser";
import { FeaturedShops } from "@/components/FeaturedShops";
import { TrendsFeed } from "@/components/TrendsFeed";
import i18n from "@/i18n";
import { absoluteUrl } from "@/lib/site";
import { portalUrl } from "@/lib/portals";
import { z } from "zod";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    payment: z.enum(["success", "error"]).optional(),
  }),
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
  const { payment } = Route.useSearch();
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
      {payment === "success" && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
          <p className="font-bold">Ödəniş sorğusu qəbul edildi</p>
          <p className="mt-1 text-sm">Bank təsdiqi yoxlanılır. Yekun status Epoint callback-i alındıqdan sonra sifarişinizə tətbiq ediləcək.</p>
        </div>
      )}
      {payment === "error" && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          <p className="font-bold">Ödəniş tamamlanmadı</p>
          <p className="mt-1 text-sm">Kartınızdan məbləğ tutulubsa, dəqiq status bank callback-i ilə yoxlanılacaq. Yenidən cəhd edə bilərsiniz.</p>
        </div>
      )}
      <section className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl shadow-violet-950/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.45),transparent_35%),radial-gradient(circle_at_10%_90%,rgba(236,72,153,0.2),transparent_35%)]" />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr] min-h-[330px]">
          <div className="p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {t("home.heroBadge")}
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02]">
              {t("home.heroLine1")} <span className="text-violet-300">{t("home.heroLine2")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm sm:text-base leading-7 text-slate-300">{t("home.heroDesc")}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/catalog" search={{ q: undefined, cat: undefined } as never} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-extrabold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50">
                {t("home.startShopping")} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/shops" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 font-bold text-white backdrop-blur transition hover:bg-white/15">
                <Store className="h-4 w-4" /> {t("sidebar.shops")}
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:flex items-center justify-center p-10">
            <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">EG Shop</p>
                  <p className="mt-1 text-xl font-black">{t("home.categoriesTitle")}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-700"><ShoppingBag className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
                <Link to="/catalog" search={{ cat: "elektronika", q: undefined } as never} className="rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-0.5"><span className="mb-3 block text-3xl">💻</span>{t("home.heroElectronics")}</Link>
                <Link to="/catalog" search={{ cat: "qadin-geyimleri", q: undefined } as never} className="rounded-2xl bg-violet-400/30 p-4 text-white transition hover:-translate-y-0.5"><span className="mb-3 block text-3xl">👗</span>{t("home.heroFashion")}</Link>
                <Link to="/catalog" search={{ cat: "ev-ve-metbex", q: undefined } as never} className="rounded-2xl bg-violet-400/30 p-4 text-white transition hover:-translate-y-0.5"><span className="mb-3 block text-3xl">🏠</span>{t("home.heroHome")}</Link>
                <Link to="/catalog" search={{ cat: "gozellik-ve-baxim", q: undefined } as never} className="rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-0.5"><span className="mb-3 block text-3xl">✨</span>{t("home.heroBeauty")}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" aria-label={t("home.trustTitle")}>
        {[
          { icon: ShieldCheck, title: t("home.trustSecure"), text: t("home.trustSecureDesc") },
          { icon: Truck, title: t("home.trustDelivery"), text: t("home.trustDeliveryDesc") },
          { icon: RotateCcw, title: t("home.trustReturns"), text: t("home.trustReturnsDesc") },
          { icon: Headphones, title: t("home.trustSupport"), text: t("home.trustSupportDesc") },
        ].map((item) => (
          <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3.5 sm:px-4 shadow-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><item.icon className="h-5 w-5" /></span>
            <span className="min-w-0"><strong className="block text-xs sm:text-sm leading-tight">{item.title}</strong><span className="mt-1 hidden sm:block text-xs text-muted-foreground">{item.text}</span></span>
          </div>
        ))}
      </section>

      {/* Kateqoriyalar — ən yuxarıda */}
      <HomeCategoryBrowser />

      {/* 2) REKLAM — Featured shops */}
      <FeaturedShops />

      {/* 3) REKLAM — Sponsored products (önə çıxan) */}
      <SponsoredProducts limit={8} />

      <TrendsFeed compact />


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
          <div className="text-center py-10 sm:py-12 border border-dashed border-border bg-secondary/25 rounded-2xl">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-card text-primary shadow-sm"><ShoppingBag className="h-5 w-5" /></span>
            <p className="mt-3 font-bold text-foreground">{t("home.noProducts")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.noProductsDesc")}</p>
            <Link to="/catalog" search={{ q: undefined, cat: undefined } as never} className="mt-4 inline-flex items-center gap-2 text-sm text-primary font-bold hover:underline">{t("home.exploreCatalog")} <ArrowRight className="h-4 w-4" /></Link>
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
