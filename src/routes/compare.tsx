import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatAZN } from "@/lib/format";
import { X, ShoppingCart, Scale } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Müqayisə — EG Shop" }] }),
  component: ComparePage,
});

interface P {
  id: string; title: string; price: number; old_price: number | null;
  image_url: string | null; brand: string | null; rating: number; reviews_count: number;
  stock: number; description: string | null; color: string | null; size: string | null;
  weight: number | null; delivery_days_min: number | null; delivery_days_max: number | null;
  delivery_city: string | null; free_shipping: boolean; fast_delivery: boolean; condition: string | null;
}

function ComparePage() {
  const { user, isSeller, isPvz } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data: ci } = await supabase.from("compare_items").select("product_id").eq("user_id", user.id);
    const ids = (ci ?? []).map((x: any) => x.product_id);
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
    const { data } = await supabase.from("products").select("*").in("id", ids);
    setItems((data ?? []) as P[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (productId: string) => {
    if (!user) return;
    await supabase.from("compare_items").delete().eq("user_id", user.id).eq("product_id", productId);
    setItems(items.filter((i) => i.id !== productId));
  };

  const addToCart = async (productId: string) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (isSeller || isPvz) { toast.error("Satıcı və PVZ PUNKT hesabları məhsul sifariş verə bilməz."); return; }
    const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 });
    if (error) toast.error(error.message); else toast.success("Səbətə əlavə olundu");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Scale className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Müqayisə üçün daxil olun</h1>
        <Link to="/auth" className="text-primary hover:underline">Daxil ol</Link>
      </div>
    );
  }

  if (loading) return <div className="container mx-auto px-4 py-12 text-center">Yüklənir...</div>;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Scale className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Müqayisə siyahınız boşdur</h1>
        <p className="text-muted-foreground mb-6">Məhsul səhifəsindən "Müqayisə et" düyməsi ilə əlavə edin (max 4 məhsul)</p>
        <Link to="/catalog" className="inline-block px-5 py-2.5 rounded-lg bg-primary text-primary-foreground">Kataloqa keç</Link>
      </div>
    );
  }

  const rows: { key: string; label: string; get: (p: P) => string }[] = [
    { key: "price", label: "Qiymət", get: (p) => formatAZN(p.price) },
    { key: "old", label: "Köhnə qiymət", get: (p) => p.old_price ? formatAZN(p.old_price) : "—" },
    { key: "brand", label: "Brend", get: (p) => p.brand || "—" },
    { key: "rating", label: "Reytinq", get: (p) => `${p.rating?.toFixed(1) || "0.0"} (${p.reviews_count || 0})` },
    { key: "stock", label: "Stok", get: (p) => p.stock > 0 ? `${p.stock} ədəd` : "Yoxdur" },
    { key: "condition", label: "Vəziyyət", get: (p) => p.condition === "new" ? "Yeni" : (p.condition || "—") },
    { key: "color", label: "Rəng", get: (p) => p.color || "—" },
    { key: "size", label: "Ölçü", get: (p) => p.size || "—" },
    { key: "weight", label: "Çəki", get: (p) => p.weight ? `${p.weight} kq` : "—" },
    { key: "delivery", label: "Çatdırılma", get: (p) => `${p.delivery_days_min || 1}-${p.delivery_days_max || 3} gün` },
    { key: "city", label: "Şəhər", get: (p) => p.delivery_city || "—" },
    { key: "free", label: "Pulsuz çatdırılma", get: (p) => p.free_shipping ? "✓ Bəli" : "—" },
    { key: "fast", label: "Sürətli çatdırılma", get: (p) => p.fast_delivery ? "⚡ Bəli" : "—" },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
        <Scale className="h-6 w-6 text-primary" /> Məhsul müqayisəsi ({items.length})
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-40 text-left p-3 sticky left-0 bg-background"></th>
              {items.map((p) => (
                <th key={p.id} className="p-3 min-w-[200px] align-top">
                  <div className="relative">
                    <button onClick={() => remove(p.id)} className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1 hover:scale-110 transition">
                      <X className="h-3 w-3" />
                    </button>
                    <Link to="/product/$id" params={{ id: p.id }}>
                      <img src={p.image_url || "/placeholder.svg"} alt={p.title} className="w-full h-36 object-contain rounded-lg bg-secondary/30" />
                      <div className="font-semibold mt-2 text-sm hover:text-primary line-clamp-2 text-left">{p.title}</div>
                    </Link>
                    {!(isSeller || isPvz) && (
                      <button onClick={() => addToCart(p.id)} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90">
                        <ShoppingCart className="h-3.5 w-3.5" /> Səbətə
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="p-3 font-medium text-sm text-muted-foreground sticky left-0 bg-background">{r.label}</td>
                {items.map((p) => <td key={p.id} className="p-3 text-sm">{r.get(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
