import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { SponsoredProducts } from "@/components/SponsoredProducts";
import { CatalogFilters, type Filters } from "@/components/CatalogFilters";
import { catName } from "@/lib/catName";
import { CategoryIcon } from "@/components/CategoryIcon";
import i18n from "@/i18n";
import { absoluteUrl } from "@/lib/site";
import { z } from "zod";
import { ChevronRight, Grid2X2, RotateCcw, SearchX } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  brand: z.string().optional(),
});

export const Route = createFileRoute("/catalog")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q, cat: search.cat, brand: search.brand }),
  loader: ({ deps }) => deps,
  head: ({ loaderData }) => {
    const focus = loaderData?.cat || loaderData?.brand || loaderData?.q;
    const base = i18n.t("seo.catalogTitle");
    const title = focus ? `${focus} â€” EG Shop` : base;
    const desc = focus
      ? `${focus} kateqoriyasÄ±nda mÉ™hsullar â€” EG Shop kataloqunda sÉ™rfÉ™li qiymÉ™t, geniĹź Ă§eĹźid vÉ™ sĂĽrÉ™tli Ă§atdÄ±rÄ±lma.`
      : i18n.t("seo.catalogDescription");
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: absoluteUrl("/catalog") },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: absoluteUrl("/catalog") }],
    };
  },
  component: Catalog,
});

interface Category { id: string; name: string; name_ru?: string | null; name_en?: string | null; slug: string; icon: string | null; parent_id: string | null }

function Catalog() {
  const { t } = useTranslation();
  const { q, cat, brand } = Route.useSearch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<Filters>({ sort: "newest", brand });

  // URL-dÉ™ki brand dÉ™yiĹźÉ™ndÉ™ filtrlÉ™ri yenilÉ™
  useEffect(() => {
    setFilters((f) => ({ ...f, brand: brand || undefined }));
  }, [brand]);

  useEffect(() => {
    supabase.from("categories").select("id,name,name_ru,name_en,slug,icon,parent_id,sort_order").order("sort_order").then(({ data }) => setCategories((data ?? []) as Category[]));
    supabase.from("products").select("brand").eq("is_active", true).not("brand", "is", null).limit(1000).then(({ data }) => {
      const brands = [...new Set((data ?? []).map((row) => row.brand?.trim()).filter((value): value is string => Boolean(value)))];
      setAvailableBrands(brands.sort((a, b) => a.localeCompare(b, "az")));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    // SeĂ§ilmiĹź kateqoriya + bĂĽtĂĽn alt tĂ¶rÉ™mÉ™lÉ™ri (3 sÉ™viyyÉ™)
    let catSlugs: string[] | null = null;
    if (cat) {
      const root = categories.find((c) => c.slug === cat);
      if (root) {
        const ids = new Set<string>([root.id]);
        const lvl2 = categories.filter((c) => c.parent_id === root.id);
        lvl2.forEach((l2) => {
          ids.add(l2.id);
          categories.filter((c) => c.parent_id === l2.id).forEach((l3) => ids.add(l3.id));
        });
        catSlugs = categories.filter((c) => ids.has(c.id)).map((c) => c.slug);
      } else {
        catSlugs = [cat];
      }
    }

    let query: any = supabase.from("products")
      .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand,stock,delivery_days_min,delivery_days_max,delivery_city,free_shipping,fast_delivery,condition,category_id,seller_id")
      .eq("is_active", true);
    if (q) query = query.ilike("title", `%${q}%`);
    if (catSlugs) {
      const categoryIds = categories.filter((category) => catSlugs!.includes(category.slug)).map((category) => category.id);
      if (categoryIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      query = query.in("category_id", categoryIds);
    }
    if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
    if (filters.brand) query = query.eq("brand", filters.brand);
    if (filters.minRating) query = query.gte("rating", filters.minRating);
    if (filters.onlyDiscount) query = query.not("old_price", "is", null);
    if (filters.inStockOnly) query = query.gt("stock", 0);
    if (filters.freeShipping) query = query.eq("free_shipping", true);
    if (filters.fastDelivery) query = query.eq("fast_delivery", true);
    if (filters.maxDeliveryDays) query = query.lte("delivery_days_max", filters.maxDeliveryDays);
    if (filters.city) query = query.eq("delivery_city", filters.city);
    if (filters.condition) query = query.eq("condition", filters.condition);
    if (filters.newArrivals) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }

    if (filters.sort === "price_asc") query = query.order("price", { ascending: true });
    else if (filters.sort === "price_desc") query = query.order("price", { ascending: false });
    else if (filters.sort === "rating") query = query.order("rating", { ascending: false });
    else if (filters.sort === "popular") query = query.order("reviews_count", { ascending: false });
    else if (filters.sort === "delivery_fast") query = query.order("delivery_days_max", { ascending: true, nullsFirst: false });
    else if (filters.sort === "discount_high") query = query.order("old_price", { ascending: false, nullsFirst: false });
    else query = query.order("created_at", { ascending: false });

    query.limit(80).then(async ({ data, error }: { data: ProductCardData[] | null; error: { message: string } | null }) => {
      if (error) {
        console.error("Catalog products query failed:", error);
        setProducts([]);
        setLoading(false);
        return;
      }
      let list = (data ?? []) as ProductCardData[];
      const sellerIds = [...new Set(list.map((product) => product.seller_id).filter((value): value is string => Boolean(value)))];
      if (sellerIds.length) {
        const { data: profiles } = await (supabase as any)
          .from("profiles_public")
          .select("id,shop_name,full_name,shop_city")
          .in("id", sellerIds);
        const profileMap = new Map<string, ProductCardData["profiles"]>((profiles ?? []).map((profile: any) => [profile.id, profile]));
        list = list.map((product) => ({ ...product, profiles: product.seller_id ? profileMap.get(product.seller_id) ?? null : null }));
      }
      if (filters.minDiscount) {
        const min = filters.minDiscount;
        list = list.filter((p: any) => {
          if (!p.old_price || p.old_price <= p.price) return false;
          const pct = ((p.old_price - p.price) / p.old_price) * 100;
          return pct >= min;
        });
      }
      setProducts(list);
      setLoading(false);
    });
  }, [q, cat, filters, categories]);

  const allBrandsList = useMemo(() => availableBrands, [availableBrands]);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (pid: string) => categories.filter((c) => c.parent_id === pid);
  const activeCat = categories.find((c) => c.slug === cat);
  const productCountLabel = t("catalog.productCount", { count: products.length });
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== "sort" && value != null && value !== false && value !== "");

  useEffect(() => {
    if (activeCat?.parent_id) setOpenParents((p) => ({ ...p, [activeCat.parent_id!]: true }));
  }, [activeCat?.parent_id]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-7">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">{t("home.breadcrumbHome")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{activeCat ? catName(activeCat) : (q ? t("catalog.searchBreadcrumb", { q }) : t("catalog.title"))}</span>
      </div>

      <div className="mb-6">
        <SponsoredProducts limit={6} />
      </div>

      <div className="mb-6 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100">{activeCat ? <CategoryIcon category={activeCat} className="h-7 w-7" /> : <Grid2X2 className="h-6 w-6" />}</span>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {activeCat ? catName(activeCat) : (q ? t("catalog.searchResults", { q }) : t("catalog.allProducts"))}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{productCountLabel} Â· {t("catalog.headerDescription")}</p>
          </div>
        </div>
      </div>

      <nav className="-mx-3 mb-5 flex snap-x gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide xl:hidden" aria-label={t("catalog.categories")}>
        <Link
          to="/catalog"
          search={{ q, cat: undefined } as never}
          className={`shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-bold transition ${!cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          {t("catalog.all")}
        </Link>
        {parents.map((category) => (
          <Link
            key={category.id}
            to="/catalog"
            search={{ q, cat: category.slug } as never}
            className={`inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${cat === category.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            <CategoryIcon category={category} className="h-4 w-4" /> {catName(category)}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[250px_minmax(0,1fr)] xl:gap-7">
        <aside className="hidden xl:block">
          <div className="sticky top-40 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <h2 className="flex items-center gap-2 px-2 py-2 font-extrabold"><Grid2X2 className="h-4 w-4 text-primary" />{t("catalog.categories")}</h2>
          <ul className="max-h-[calc(100vh-13rem)] space-y-1 overflow-y-auto pr-1 scrollbar-hide">
            <li>
              <Link to="/catalog" search={{ q, cat: undefined } as never}
                    className={`block px-3 py-2.5 rounded-xl text-sm transition hover:bg-secondary ${!cat ? "bg-primary/10 font-bold text-primary" : ""}`}>
                {t("catalog.all")}
              </Link>
            </li>
            {parents.map((c) => {
              const kids = childrenOf(c.id);
              const ancestorIds = new Set<string>();
              let cur = activeCat;
              while (cur?.parent_id) { ancestorIds.add(cur.parent_id); cur = categories.find((x) => x.id === cur!.parent_id); }
              const isOpen = openParents[c.id] || ancestorIds.has(c.id) || cat === c.slug;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setOpenParents((p) => ({ ...p, [c.id]: !isOpen }))}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition hover:bg-secondary text-left ${cat === c.slug ? "bg-primary/10 font-bold text-primary" : ""}`}>
                    <span className="flex items-center gap-2"><CategoryIcon category={c} className="h-4 w-4 shrink-0" /> {catName(c)}</span>
                    {kids.length > 0 && <span className="text-xs">{isOpen ? "â’" : "+"}</span>}
                  </button>
                  {isOpen && kids.length > 0 && (
                    <ul className="ml-4 mt-1 space-y-0.5 border-l border-border pl-2">
                      <li>
                        <Link to="/catalog" search={{ q, cat: c.slug } as never}
                              className={`block px-2 py-1 rounded text-xs hover:bg-secondary ${cat === c.slug ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                          {t("catalog.all")}
                        </Link>
                      </li>
                      {kids.map((k) => {
                        const grandKids = childrenOf(k.id);
                        const kOpen = openParents[k.id] || ancestorIds.has(k.id) || cat === k.slug;
                        return (
                          <li key={k.id}>
                            {grandKids.length > 0 ? (
                              <>
                                <button
                                  onClick={() => setOpenParents((p) => ({ ...p, [k.id]: !kOpen }))}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-secondary text-left ${cat === k.slug ? "font-semibold text-primary" : ""}`}>
                                  <span className="flex items-center gap-1.5"><CategoryIcon category={k} className="h-3.5 w-3.5 shrink-0" /> {catName(k)}</span>
                                  <span className="text-[10px]">{kOpen ? "â’" : "+"}</span>
                                </button>
                                {kOpen && (
                                  <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                                    <li>
                                      <Link to="/catalog" search={{ q, cat: k.slug } as never}
                                            className={`block px-2 py-0.5 rounded text-[11px] hover:bg-secondary ${cat === k.slug ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                                        {t("catalog.all")}
                                      </Link>
                                    </li>
                                    {grandKids.map((g) => (
                                      <li key={g.id}>
                                        <Link to="/catalog" search={{ q, cat: g.slug } as never}
                                              className={`block px-2 py-0.5 rounded text-[11px] hover:bg-secondary ${cat === g.slug ? "font-semibold text-primary" : ""}`}>
                                          {catName(g)}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <Link to="/catalog" search={{ q, cat: k.slug } as never}
                                    className={`block px-2 py-1 rounded text-xs hover:bg-secondary ${cat === k.slug ? "font-semibold text-primary" : ""}`}>
                                <span className="flex items-center gap-1.5"><CategoryIcon category={k} className="h-3.5 w-3.5 shrink-0" /> {catName(k)}</span>
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <CatalogFilters brands={allBrandsList} value={filters} onChange={setFilters} />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card p-2 animate-pulse">
                  <div className="aspect-[3/4] rounded-xl bg-secondary" />
                  <div className="mt-3 h-3 w-4/5 rounded bg-secondary" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-secondary" />
                  <div className="mt-4 h-5 w-2/5 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/30 px-5 py-14 text-center sm:py-20">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100"><SearchX className="h-7 w-7" /></span>
              <h2 className="mt-5 text-xl font-black">{t("catalog.noResults")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("catalog.noResultsDesc")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {hasActiveFilters && <button onClick={() => setFilters({ sort: "newest" })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold transition hover:border-primary hover:text-primary"><RotateCcw className="h-4 w-4" /> {t("catalog.resetFilters")}</button>}
                <Link to="/catalog" search={{ q: undefined, cat: undefined, brand: undefined } as never} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90">{t("catalog.viewAllProducts")} <ChevronRight className="h-4 w-4" /></Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mobile-product-grid">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

