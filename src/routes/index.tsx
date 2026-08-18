import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, ChartNoAxesCombined, Copy, Flame, Gift, PackageCheck, ShoppingBag, Store, Tag, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { SponsoredProducts } from "@/components/SponsoredProducts";
import { HomeCategoryBrowser } from "@/components/HomeCategoryBrowser";
import { FeaturedShops } from "@/components/FeaturedShops";
import { TrendsFeed } from "@/components/TrendsFeed";
import { HomeBannerCarousel } from "@/components/HomeBannerCarousel";
import i18n from "@/i18n";
import { absoluteUrl } from "@/lib/site";
import { SellerLanding } from "@/components/SellerLanding";
import { portalUrl, usePortal, usePortalReady } from "@/lib/portals";

export const Route = createFileRoute("/")({
  validateSearch: z.object({ payment: z.enum(["success", "error"]).optional() }),
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

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order: number;
  expires_at: string | null;
}

const PRODUCT_COLUMNS =
  "id,title,price,old_price,image_url,video_url,rating,reviews_count,brand,delivery_days_min,delivery_days_max,delivery_city,free_shipping,fast_delivery,stock,shop_id,shop:shops(name,city)";

function ProductSection({
  title,
  products,
  accent = "violet",
}: {
  title: string;
  products: ProductCardData[];
  accent?: "violet" | "orange";
}) {
  if (products.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-9 w-9 place-items-center rounded-xl text-white ${accent === "orange" ? "bg-gradient-to-br from-orange-500 to-rose-600" : "bg-gradient-brand"}`}
          >
            {accent === "orange" ? (
              <Flame className="h-4.5 w-4.5" />
            ) : (
              <ShoppingBag className="h-4.5 w-4.5" />
            )}
          </span>
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
        </div>
        <Link
          to="/catalog"
          search={{ q: undefined, cat: undefined } as never}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary sm:text-sm"
        >
          {i18n.t("home.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mobile-product-grid grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((product) => (
          <ProductCard key={product.id} p={product} />
        ))}
      </div>
    </section>
  );
}

function SellerSpotlight() {
  const benefits = [
    { Icon: Store, title: "Öz mağazanız", text: "Mağaza, məhsul və sifarişləri bir paneldən idarə edin." },
    { Icon: ChartNoAxesCombined, title: "Aydın satış nəzarəti", text: "Satış, stok və kampaniyaları real vaxtda izləyin." },
    { Icon: PackageCheck, title: "Sürətli başlanğıc", text: "Qeydiyyatdan sonra məhsullarınızı rahatlıqla yerləşdirin." },
  ];

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-violet-200/80 bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 px-5 py-7 text-white shadow-elegant sm:px-8 sm:py-9 lg:px-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative grid items-center gap-7 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold backdrop-blur">
            <BadgeCheck className="h-4 w-4 text-violet-200" /> Satıcılar üçün EG Shop
          </div>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Biznesinizi daha çox alıcıya təqdim edin.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
            Mağazanızı yaradın, məhsullarınızı yerləşdirin və bütün satış prosesinizi sadə, təhlükəsiz paneldən idarə edin.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={portalUrl("seller", "/register")}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-violet-800 shadow-lg shadow-violet-950/25 transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              <Store className="h-4 w-4" /> Satıcı ol <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={portalUrl("seller", "/")}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              Necə işləyir? <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 text-xs font-semibold text-white/65">Qeydiyyat · Təhlükəsiz ödəniş · Satıcı dəstəyi</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {benefits.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-violet-100"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-extrabold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/70">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Index() {
  const portal = usePortal();
  const portalReady = usePortalReady();
  const { payment } = Route.useSearch();
  const { t } = useTranslation();
  const [allProducts, setAllProducts] = useState<ProductCardData[]>([]);
  const [discounted, setDiscounted] = useState<ProductCardData[]>([]);
  const [trending, setTrending] = useState<ProductCardData[]>([]);
  const [giveaways, setGiveaways] = useState<ProductCardData[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [
        { data: latest },
        { data: sales },
        { data: popular },
        { data: prizes },
        { data: codes },
      ] = await Promise.all([
        (supabase as any)
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(18),
        (supabase as any)
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .not("old_price", "is", null)
          .order("created_at", { ascending: false })
          .limit(12),
        (supabase as any)
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .order("reviews_count", { ascending: false })
          .limit(12),
        (supabase as any)
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("is_active", true)
          .eq("is_giveaway", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("promo_codes")
          .select("id,code,discount_percent,discount_amount,min_order,expires_at")
          .eq("is_active", true)
          .limit(6),
      ]);
      if (!active) return;
      setAllProducts((latest ?? []) as ProductCardData[]);
      setDiscounted((sales ?? []) as ProductCardData[]);
      setTrending((popular ?? []) as ProductCardData[]);
      setGiveaways((prizes ?? []) as ProductCardData[]);
      setPromos((codes ?? []) as PromoCode[]);
      setProductsLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success(t("home.codeCopied", { code }));
  };

  if (portalReady && portal === "seller") {
    return <SellerLanding />;
  }

  return (
    <div className="container mx-auto space-y-7 px-3 py-3 sm:px-4 sm:py-5 lg:space-y-10">
      {payment === "success" && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
        >
          <p className="font-bold">Ödəniş sorğusu qəbul edildi</p>
          <p className="mt-1 text-sm">
            Bank təsdiqi yoxlanılır. Yekun status sifarişinizə avtomatik tətbiq ediləcək.
          </p>
        </div>
      )}
      {payment === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          <p className="font-bold">Ödəniş tamamlanmadı</p>
          <p className="mt-1 text-sm">
            Kartınızdan məbləğ tutulubsa, dəqiq status bank callback-i ilə yoxlanılacaq.
          </p>
        </div>
      )}

      <HomeBannerCarousel />
      <SellerSpotlight />
      <HomeCategoryBrowser />

      {productsLoaded && allProducts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-5 py-8 text-center sm:py-10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary shadow-card">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-lg font-black">{t("home.noProducts")}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("home.noProductsDesc")}
          </p>
          <Link
            to="/catalog"
            search={{ q: undefined, cat: undefined } as never}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            {t("home.exploreCatalog")} <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <ProductSection title={t("home.forYou")} products={allProducts} />
      )}

      <SponsoredProducts limit={12} />
      <ProductSection title={t("home.discountTitle")} products={discounted} accent="orange" />
      <ProductSection title={t("home.trendingTitle")} products={trending} accent="orange" />

      {giveaways.length > 0 && (
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600 p-4 text-white sm:p-7">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <h2 className="text-xl font-black sm:text-3xl">{t("home.giveawayTitle")}</h2>
          </div>
          <div className="mobile-product-grid grid grid-cols-2 gap-3 rounded-2xl bg-white p-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {giveaways.map((product) => (
              <ProductCard key={product.id} p={product} />
            ))}
          </div>
        </section>
      )}

      <FeaturedShops />

      {promos.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-black sm:text-2xl">{t("home.promoTitle")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-4 text-white shadow-card"
              >
                <div>
                  <strong className="block text-2xl font-black">
                    {promo.discount_percent
                      ? `-${promo.discount_percent}%`
                      : `-${promo.discount_amount} ₼`}
                  </strong>
                  <span className="text-xs text-white/80">
                    {t("home.promoMinOrder")}: {promo.min_order} ₼
                  </span>
                </div>
                <button
                  onClick={() => void copyCode(promo.code)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-black text-emerald-700"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {promo.code}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <TrendsFeed compact />
    </div>
  );
}
