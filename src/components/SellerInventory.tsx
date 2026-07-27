import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { AlertTriangle, Boxes, History, PackageCheck, PackageX, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  sellerId: string;
  onChanged?: () => void;
}

interface InventoryProduct {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
  stock_updated_at: string | null;
}

interface StockMovement {
  id: string;
  product_id: string;
  change: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  note: string | null;
  created_at: string;
}

type Filter = "all" | "low" | "out";

export function SellerInventory({ sellerId, onChanged }: Props) {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { stock: string; min: string }>>({});

  const load = async () => {
    const [{ data: rows, error }, { data: history }] = await Promise.all([
      supabase
        .from("products")
        .select("id,title,sku,barcode,stock,min_stock,image_url,is_active,stock_updated_at")
        .eq("seller_id", sellerId)
        .order("stock", { ascending: true }),
      supabase
        .from("product_stock_movements")
        .select("id,product_id,change,previous_stock,new_stock,reason,note,created_at")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (error) {
      toast.error(`Stok məlumatı yüklənmədi: ${error.message}`);
      return;
    }
    const list = (rows ?? []) as InventoryProduct[];
    setProducts(list);
    setMovements((history ?? []) as StockMovement[]);
    setDrafts(
      Object.fromEntries(
        list.map((p) => [p.id, { stock: String(p.stock), min: String(p.min_stock ?? 5) }]),
      ),
    );
  };

  useEffect(() => {
    void load();
  }, [sellerId]);

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.is_active && p.stock > 0).length,
      low: products.filter((p) => p.stock > 0 && p.stock <= (p.min_stock ?? 5)).length,
      out: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    return products.filter((p) => {
      if (filter === "low" && !(p.stock > 0 && p.stock <= (p.min_stock ?? 5))) return false;
      if (filter === "out" && p.stock !== 0) return false;
      return (
        !q ||
        [p.title, p.sku, p.barcode].some((value) => value?.toLocaleLowerCase("az").includes(q))
      );
    });
  }, [products, filter, query]);

  const save = async (product: InventoryProduct) => {
    const draft = drafts[product.id];
    const stock = Math.max(0, Number.parseInt(draft?.stock ?? "", 10) || 0);
    const minStock = Math.max(0, Number.parseInt(draft?.min ?? "", 10) || 0);
    setSavingId(product.id);
    const { error } = await supabase
      .from("products")
      .update({ stock, min_stock: minStock, stock_updated_at: new Date().toISOString() })
      .eq("id", product.id)
      .eq("seller_id", sellerId);
    setSavingId(null);
    if (error) {
      toast.error(`Stok yenilənmədi: ${error.message}`);
      return;
    }
    toast.success("Stok yeniləndi");
    await load();
    onChanged?.();
  };

  const productName = new Map(products.map((p) => [p.id, p.title]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Bütün məhsullar",
            value: counts.all,
            icon: Boxes,
            tone: "text-primary bg-primary/10",
          },
          {
            label: "Aktiv stok",
            value: counts.active,
            icon: PackageCheck,
            tone: "text-success bg-success/10",
          },
          {
            label: "Az qalıb",
            value: counts.low,
            icon: AlertTriangle,
            tone: "text-warning bg-warning/10",
          },
          {
            label: "Stok bitib",
            value: counts.out,
            icon: PackageX,
            tone: "text-destructive bg-destructive/10",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-2xl font-black">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2">
            {(
              [
                ["all", "Hamısı"],
                ["low", "Az qalan"],
                ["out", "Bitən"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${filter === value ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative md:w-80">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Məhsul, SKU və ya barkod axtar"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3">Məhsul</th>
                <th className="p-3">SKU / Barkod</th>
                <th className="p-3">Cari stok</th>
                <th className="p-3">Minimum stok</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const status =
                  p.stock === 0
                    ? { label: "Bitib", className: "bg-destructive/10 text-destructive" }
                    : p.stock <= (p.min_stock ?? 5)
                      ? { label: "Az qalıb", className: "bg-warning/10 text-warning" }
                      : { label: "Normal", className: "bg-success/10 text-success" };
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold line-clamp-1">{p.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.stock_updated_at
                              ? `Yenilənib: ${formatDateTime(p.stock_updated_at)}`
                              : "Tarix yoxdur"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div>{p.sku || "—"}</div>
                      <div className="text-muted-foreground">{p.barcode || "Barkod yoxdur"}</div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        value={drafts[p.id]?.stock ?? String(p.stock)}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [p.id]: {
                              stock: event.target.value,
                              min: current[p.id]?.min ?? String(p.min_stock ?? 5),
                            },
                          }))
                        }
                        className="w-24 h-9 px-2 rounded-lg border border-input bg-background"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        value={drafts[p.id]?.min ?? String(p.min_stock ?? 5)}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [p.id]: {
                              stock: current[p.id]?.stock ?? String(p.stock),
                              min: event.target.value,
                            },
                          }))
                        }
                        className="w-24 h-9 px-2 rounded-lg border border-input bg-background"
                      />
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-bold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => save(p)}
                        disabled={savingId === p.id}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                      >
                        {savingId === p.id ? "..." : "Yadda saxla"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">Məhsul tapılmadı</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-primary" /> Son stok dəyişiklikləri
        </h3>
        {movements.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Stok tarixçəsi hələ yoxdur
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between gap-3 border-b border-border last:border-0 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {productName.get(movement.product_id) ?? "Məhsul"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {movement.previous_stock} → {movement.new_stock} ·{" "}
                    {formatDateTime(movement.created_at)}
                  </div>
                </div>
                <span
                  className={`font-black ${movement.change > 0 ? "text-success" : "text-destructive"}`}
                >
                  {movement.change > 0 ? "+" : ""}
                  {movement.change}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
