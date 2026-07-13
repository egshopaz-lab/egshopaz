import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatAZN } from "@/lib/format";
import { Sparkles, Package } from "lucide-react";

interface P { id: string; title: string; price: number; old_price: number | null; image_url: string | null; rating: number }

interface Props {
  /** "for_you" — based on user's favorites/cart history. "together" — items frequently bought with given product */
  mode: "for_you" | "together";
  productId?: string;
  categoryId?: string | null;
  limit?: number;
}

export function ProductRecommendations({ mode, productId, categoryId, limit = 6 }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let recommended: P[] = [];

      if (mode === "for_you" && user) {
        // Get user's favorites + cart product categories
        const [{ data: favs }, { data: cart }] = await Promise.all([
          supabase.from("favorites").select("product_id").eq("user_id", user.id).limit(20),
          supabase.from("cart_items").select("product_id").eq("user_id", user.id).limit(20),
        ]);
        const productIds = [
          ...(favs ?? []).map((x: any) => x.product_id),
          ...(cart ?? []).map((x: any) => x.product_id),
        ];

        if (productIds.length > 0) {
          const { data: prods } = await supabase.from("products").select("category_id, brand").in("id", productIds);
          const catIds = [...new Set((prods ?? []).map((p: any) => p.category_id).filter(Boolean))];

          if (catIds.length > 0) {
            const { data } = await supabase.from("products")
              .select("id,title,price,old_price,image_url,rating")
              .in("category_id", catIds)
              .eq("is_active", true)
              .not("id", "in", `(${productIds.join(",")})`)
              .order("rating", { ascending: false })
              .limit(limit);
            recommended = (data ?? []) as P[];
          }
        }

        // Fallback: top-rated products
        if (recommended.length < limit) {
          const { data } = await supabase.from("products")
            .select("id,title,price,old_price,image_url,rating")
            .eq("is_active", true)
            .order("rating", { ascending: false })
            .limit(limit - recommended.length);
          const existing = new Set(recommended.map((r) => r.id));
          recommended = [...recommended, ...((data ?? []) as P[]).filter((p) => !existing.has(p.id))];
        }
      } else if (mode === "together" && productId) {
        // Find orders containing this product, then get other items in those orders
        const { data: relatedItems } = await supabase
          .from("order_items").select("order_id").eq("product_id", productId).limit(50);
        const orderIds = [...new Set((relatedItems ?? []).map((x: any) => x.order_id))];

        if (orderIds.length > 0) {
          const { data: others } = await supabase
            .from("order_items").select("product_id")
            .in("order_id", orderIds).neq("product_id", productId).limit(100);

          // Count frequencies
          const freq: Record<string, number> = {};
          (others ?? []).forEach((o: any) => { freq[o.product_id] = (freq[o.product_id] ?? 0) + 1; });
          const topIds = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);

          if (topIds.length > 0) {
            const { data } = await supabase.from("products")
              .select("id,title,price,old_price,image_url,rating")
              .in("id", topIds).eq("is_active", true);
            recommended = (data ?? []) as P[];
          }
        }

        // Fallback: same category
        if (recommended.length < limit && categoryId) {
          const { data } = await supabase.from("products")
            .select("id,title,price,old_price,image_url,rating")
            .eq("category_id", categoryId).eq("is_active", true).neq("id", productId)
            .order("rating", { ascending: false }).limit(limit - recommended.length);
          const existing = new Set(recommended.map((r) => r.id));
          recommended = [...recommended, ...((data ?? []) as P[]).filter((p) => !existing.has(p.id))];
        }
      }

      if (active) { setItems(recommended); setLoading(false); }
    })();
    return () => { active = false; };
  }, [mode, productId, categoryId, user?.id, limit]);

  if (loading || items.length === 0) return null;

  const title = mode === "for_you" ? "✨ Sizə görə seçildi" : "🛍️ Birlikdə alınır";
  const Icon = mode === "for_you" ? Sparkles : Package;

  return (
    <section className="my-8">
      <h2 className="text-xl md:text-2xl font-extrabold mb-4 flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" /> {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((p) => (
          <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group rounded-xl border border-border bg-card hover:shadow-md transition overflow-hidden">
            <div className="aspect-square bg-secondary/30 overflow-hidden">
              <img src={p.image_url || "/placeholder.svg"} alt={p.title} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition" />
            </div>
            <div className="p-2">
              <div className="text-xs line-clamp-2 mb-1 min-h-[2rem]">{p.title}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-primary text-sm">{formatAZN(p.price)}</span>
                {p.old_price && <span className="text-[10px] text-muted-foreground line-through">{formatAZN(p.old_price)}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
