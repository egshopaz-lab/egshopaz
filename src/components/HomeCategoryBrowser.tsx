import { Link } from "@tanstack/react-router";
import { ChevronRight, Grid3X3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoryIcon } from "@/components/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";
import { catName } from "@/lib/catName";

interface Category {
  id: string;
  name: string;
  name_ru?: string | null;
  name_en?: string | null;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  background_color: string | null;
  is_featured: boolean;
  popularity_score: number;
}

export function HomeCategoryBrowser() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const visualResult = await supabase
        .from("categories")
        .select(
          "id,name,name_ru,name_en,slug,icon,parent_id,sort_order,image_url,background_color,is_featured,popularity_score",
        )
        .order("sort_order");

      let list = (visualResult.data ?? []) as Category[];
      if (visualResult.error) {
        const legacyResult = await supabase
          .from("categories")
          .select("id,name,name_ru,name_en,slug,icon,parent_id,sort_order")
          .order("sort_order");
        list = (legacyResult.data ?? []).map((category) => ({
          ...category,
          image_url: null,
          background_color: null,
          is_featured: false,
          popularity_score: 0,
        }));
      }

      setCategories(list);
      const preferred = [...list]
        .filter((item) => !item.parent_id)
        .sort(
          (a, b) =>
            Number(b.is_featured) - Number(a.is_featured) ||
            b.popularity_score - a.popularity_score ||
            a.sort_order - b.sort_order,
        )[0];
      setActiveRootId(preferred?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const roots = useMemo(
    () =>
      categories
        .filter((item) => !item.parent_id)
        .sort(
          (a, b) =>
            Number(b.is_featured) - Number(a.is_featured) ||
            b.popularity_score - a.popularity_score ||
            a.sort_order - b.sort_order,
        ),
    [categories],
  );
  const activeRoot = roots.find((item) => item.id === activeRootId) ?? roots[0];
  const children = useMemo(
    () => categories.filter((item) => item.parent_id === activeRoot?.id),
    [activeRoot?.id, categories],
  );

  if (loading) return <CategorySkeleton />;
  if (!roots.length) return null;

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="popular-categories-title">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">EG Shop</p>
          <h2
            id="popular-categories-title"
            className="text-xl font-black tracking-tight sm:text-2xl"
          >
            {t("categoryBar.popularCategories", "Populyar kateqoriyalar")}
          </h2>
        </div>
        <Link
          to="/catalog"
          search={{ q: undefined, cat: undefined } as never}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          {t("common.all")} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 scrollbar-hide sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:overflow-visible">
        {roots.slice(0, 16).map((category) => {
          const selected = category.id === activeRoot?.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveRootId(category.id)}
              onMouseEnter={() => setActiveRootId(category.id)}
              className="group w-[92px] shrink-0 snap-start text-center sm:w-[108px] lg:w-auto"
              aria-pressed={selected}
            >
              <span
                className={`relative mx-auto grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-white/70"}`}
                style={{ backgroundColor: category.background_color || "#f3e8ff" }}
              >
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <CategoryIcon
                    category={category}
                    className="h-9 w-9 text-primary sm:h-11 sm:w-11"
                  />
                )}
                {category.is_featured && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
              </span>
              <span
                className={`mt-2 block line-clamp-2 text-xs font-extrabold leading-tight sm:text-sm ${selected ? "text-primary" : "text-foreground"}`}
              >
                {catName(category)}
              </span>
            </button>
          );
        })}
      </div>

      {activeRoot && (
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary"
                style={{ backgroundColor: activeRoot.background_color || "#f3e8ff" }}
              >
                <CategoryIcon category={activeRoot} className="h-5 w-5" />
              </span>
              <h3 className="truncate text-lg font-black">{catName(activeRoot)}</h3>
            </div>
            <Link
              to="/catalog"
              search={{ cat: activeRoot.slug, q: undefined } as never}
              className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/15"
            >
              {t("common.all")}
            </Link>
          </div>

          {children.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {children.slice(0, 15).map((child) => {
                const leaves = categories.filter((item) => item.parent_id === child.id);
                return (
                  <div key={child.id} className="min-w-0">
                    <Link
                      to="/catalog"
                      search={{ cat: child.slug, q: undefined } as never}
                      className="mb-1.5 flex items-center gap-2 font-extrabold hover:text-primary"
                    >
                      <CategoryIcon category={child} className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{catName(child)}</span>
                    </Link>
                    <div className="space-y-1">
                      {leaves.slice(0, 5).map((leaf) => (
                        <Link
                          key={leaf.id}
                          to="/catalog"
                          search={{ cat: leaf.slug, q: undefined } as never}
                          className="block truncate text-xs text-muted-foreground hover:text-primary"
                        >
                          {catName(leaf)}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Link
              to="/catalog"
              search={{ cat: activeRoot.slug, q: undefined } as never}
              className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/60 p-6 font-bold hover:text-primary"
            >
              <Grid3X3 className="h-5 w-5" /> {catName(activeRoot)}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function CategorySkeleton() {
  return (
    <section className="space-y-4" aria-hidden="true">
      <div className="h-7 w-64 animate-pulse rounded-lg bg-secondary" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="w-24 shrink-0">
            <div className="aspect-square animate-pulse rounded-3xl bg-secondary" />
            <div className="mx-auto mt-2 h-3 w-16 animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-3xl bg-secondary" />
    </section>
  );
}
