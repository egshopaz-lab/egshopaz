import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { formatAZN } from "@/lib/format";
import { TrendingUp, ShoppingBag, DollarSign, Award } from "lucide-react";

interface Props { sellerId: string }

interface DayPoint { date: string; revenue: number; orders: number }
interface TopProd { title: string; sold: number; revenue: number }

const TIER_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  bronze: { label: "Bürünc", color: "#cd7f32", emoji: "🥉" },
  silver: { label: "Gümüş", color: "#9ca3af", emoji: "🥈" },
  gold: { label: "Qızıl", color: "#facc15", emoji: "🥇" },
  platinum: { label: "Platin", color: "#a78bfa", emoji: "💎" },
};

const TIER_THRESHOLDS = [
  { tier: "bronze", min: 0, next: 2000 },
  { tier: "silver", min: 2000, next: 10000 },
  { tier: "gold", min: 10000, next: 50000 },
  { tier: "platinum", min: 50000, next: null },
];

export function SellerAnalytics({ sellerId }: Props) {
  const [days, setDays] = useState<DayPoint[]>([]);
  const [tops, setTops] = useState<TopProd[]>([]);
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([]);
  const [tier, setTier] = useState<string>("bronze");
  const [totalSales, setTotalSales] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const [{ data: items }, { data: prof }] = await Promise.all([
        supabase.from("order_items")
          .select("price, quantity, status, title, product_id, order_id, delivered_at")
          .eq("seller_id", sellerId),
        supabase.from("profiles")
          .select("seller_tier, seller_total_sales, seller_total_orders")
          .eq("id", sellerId).maybeSingle(),
      ]);

      if (!active) return;
      const list = items ?? [];

      // Get order created_at for date grouping
      const orderIds = [...new Set(list.map((i: any) => i.order_id))];
      const { data: orders } = orderIds.length
        ? await supabase.from("orders").select("id, created_at").in("id", orderIds)
        : { data: [] };
      const orderDate: Record<string, string> = {};
      (orders ?? []).forEach((o: any) => { orderDate[o.id] = o.created_at; });

      // Group by day (last 30 days)
      const dayMap: Record<string, { revenue: number; orders: Set<string> }> = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = { revenue: 0, orders: new Set() };
      }
      list.forEach((i: any) => {
        const created = orderDate[i.order_id];
        if (!created) return;
        const key = created.slice(0, 10);
        if (!dayMap[key]) return;
        dayMap[key].revenue += Number(i.price) * i.quantity;
        dayMap[key].orders.add(i.order_id);
      });

      const series: DayPoint[] = Object.entries(dayMap).map(([date, v]) => ({
        date: date.slice(5),
        revenue: Math.round(v.revenue * 100) / 100,
        orders: v.orders.size,
      }));

      // Top products
      const prodMap: Record<string, TopProd> = {};
      list.forEach((i: any) => {
        const k = i.product_id;
        if (!prodMap[k]) prodMap[k] = { title: i.title, sold: 0, revenue: 0 };
        prodMap[k].sold += i.quantity;
        prodMap[k].revenue += Number(i.price) * i.quantity;
      });
      const topList = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Status distribution
      const statusMap: Record<string, number> = {};
      list.forEach((i: any) => { statusMap[i.status] = (statusMap[i.status] ?? 0) + 1; });
      const statusList = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      setDays(series);
      setTops(topList);
      setStatusDist(statusList);
      setTier(prof?.seller_tier ?? "bronze");
      setTotalSales(Number(prof?.seller_total_sales ?? 0));
      setTotalOrders(Number(prof?.seller_total_orders ?? 0));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [sellerId]);

  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.bronze;
  const tierData = TIER_THRESHOLDS.find((t) => t.tier === tier)!;
  const progress = tierData.next ? Math.min(100, (totalSales / tierData.next) * 100) : 100;
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (loading) return <div className="text-center py-12 text-muted-foreground">Yüklənir...</div>;

  return (
    <div className="space-y-6">
      {/* Tier card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8" style={{ color: tierInfo.color }} />
            <div>
              <div className="text-sm text-muted-foreground">Satıcı səviyyəsi</div>
              <div className="text-2xl font-extrabold">{tierInfo.emoji} {tierInfo.label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Ümumi satış</div>
            <div className="text-xl font-bold">{formatAZN(totalSales)}</div>
            <div className="text-xs text-muted-foreground">{totalOrders} sifariş</div>
          </div>
        </div>
        {tierData.next && (
          <>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: tierInfo.color }} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Növbəti səviyyəyə {formatAZN(tierData.next - totalSales)} qalıb
            </div>
          </>
        )}
      </div>

      {/* Revenue line chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Son 30 gün gəliri</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={days}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Gəlir (AZN)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Orders bar chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /> Gündəlik sifarişlər</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-bold mb-4">Status bölgüsü</h3>
          {statusDist.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Hələ sifariş yoxdur</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Top 5 məhsul</h3>
        {tops.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Məlumat yoxdur</div>
        ) : (
          <div className="space-y-3">
            {tops.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-3 pb-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                  <div className="truncate font-medium">{p.title}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{formatAZN(p.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{p.sold} ədəd</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
