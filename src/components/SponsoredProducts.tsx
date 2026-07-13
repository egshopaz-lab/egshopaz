import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";

interface SponsoredItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    title: string;
    price: number;
    old_price: number | null;
    image_url: string | null;
    images: string[];
    rating: number;
    reviews_count: number;
  } | null;
}

export function SponsoredProducts({ limit = 6 }: { limit?: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<SponsoredItem[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("sponsored_products")
        .select("id, product_id")
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .limit(limit);
      const placements = (data ?? []) as Pick<SponsoredItem, "id" | "product_id">[];
      const ids = placements.map((p) => p.product_id).filter(Boolean);
      if (ids.length === 0) {
        if (active) setItems([]);
        return;
      }

      const { data: products } = await supabase
        .from("products")
        .select("id,title,price,old_price,image_url,images,rating,reviews_count")
        .in("id", ids)
        .eq("is_active", true);
      const productMap = new Map((products ?? []).map((p) => [p.id, p]));
      if (active) {
        setItems(placements.map((p) => ({ ...p, products: productMap.get(p.product_id) ?? null })) as SponsoredItem[]);
      }
    })();
    return () => { active = false; };
  }, [limit]);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-warning" />
        <h2 className="text-xl md:text-2xl font-bold">{t("ads.sponsoredProducts")}</h2>
        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-semibold">{t("ads.adShort")}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mobile-product-grid">
        {items.map((s) => {
          const prod = s.products;
          if (!prod) return null;
          const p: ProductCardData = {
            id: prod.id,
            title: prod.title,
            price: prod.price,
            old_price: prod.old_price,
            image_url: prod.image_url ?? prod.images[0] ?? null,
            rating: prod.rating,
            reviews_count: prod.reviews_count,
            brand: null,
          };
          return (
            <div key={s.id} className="relative">
              <span className="absolute top-2 left-2 z-10 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">{t("ads.adShort")}</span>
              <ProductCard p={p} enableFavorite={false} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
