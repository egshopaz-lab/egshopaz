import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { SponsoredProducts } from "@/components/SponsoredProducts";
import { CatalogFilters, type Filters } from "@/components/CatalogFilters";
import { catName } from "@/lib/catName";
import i18n from "@/i18n";
import { absoluteUrl } from "@/lib/site";
import { z } from "zod";

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
    const title = focus ? `${focus} — EG Shop` : base;
    const desc = focus
      ? `${focus} kateqoriyasında məhsullar — EG Shop kataloqunda sərfəli qiymət, geniş çeşid və sürətli çatdırılma.`
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
  const [loading, setLoading] = useState(true);
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<Filters>({ sort: "newest", brand });

  // URL-dəki brand dəyişəndə filtrləri yenilə
  useEffect(() => {
    setFilters((f) => ({ ...f, brand: brand || undefined }));
  }, [brand]);

  useEffect(() => {
    supabase.from("categories").select("id,name,name_ru,name_en,slug,icon,parent_id,sort_order").order("sort_order").then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    // Seçilmiş kateqoriya + bütün alt törəmələri (3 səviyyə)
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
      .select("id,title,price,old_price,image_url,video_url,rating,reviews_count,brand,stock,delivery_days_min,delivery_days_max,delivery_city,free_shipping,fast_delivery,condition,category_id")
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

    query.limit(80).then(({ data, error }: { data: ProductCardData[] | null; error: { message: string } | null }) => {
      if (error) {
        console.error("Catalog products query failed:", error);
        setProducts([]);
        setLoading(false);
        return;
      }
      let list = (data ?? []) as ProductCardData[];
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

  const allBrandsList = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.brand && s.add(p.brand));
    return [...s].sort();
  }, [products]);

  const parents = categories.filter((c) => !c.parent_id);
  const childrenOf = (pid: string) => categories.filter((c) => c.parent_id === pid);
  const activeCat = categories.find((c) => c.slug === cat);

  useEffect(() => {
    if (activeCat?.parent_id) setOpenParents((p) => ({ ...p, [activeCat.parent_id!]: true }));
  }, [activeCat?.parent_id]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">{t("home.breadcrumbHome")}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{activeCat ? catName(activeCat) : (q ? t("catalog.searchBreadcrumb", { q }) : t("catalog.title"))}</span>
      </div>

      <div className="mb-6">
        <SponsoredProducts limit={6} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="hidden md:block">
          <h2 className="font-bold mb-3">{t("catalog.categories")}</h2>
          <ul className="space-y-1">
            <li>
              <Link to="/catalog" search={{ q, cat: undefined } as never}
                    className={`block px-3 py-2 rounded-lg text-sm hover:bg-secondary ${!cat ? "bg-secondary font-semibold text-primary" : ""}`}>
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-secondary text-left ${cat === c.slug ? "bg-secondary font-semibold text-primary" : ""}`}>
                    <span>{c.icon} {catName(c)}</span>
                    {kids.length > 0 && <span className="text-xs">{isOpen ? "−" : "+"}</span>}
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
                                  <span>{k.icon} {catName(k)}</span>
                                  <span className="text-[10px]">{kOpen ? "−" : "+"}</span>
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
                                {k.icon} {catName(k)}
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
        </aside>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4">
            {activeCat ? catName(activeCat) : (q ? t("catalog.searchResults", { q }) : t("catalog.allProducts"))}
            <span className="ml-2 text-sm text-muted-foreground font-normal">{t("catalog.productCount", { count: products.length })}</span>
          </h1>

          <div className="mb-4">
            <CatalogFilters brands={allBrandsList} value={filters} onChange={setFilters} />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-secondary rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-secondary/40 rounded-2xl">
              <p className="text-muted-foreground">{t("catalog.noResults")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mobile-product-grid">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
