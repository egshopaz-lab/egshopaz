import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Boxes,
  CircleDollarSign,
  MessageCircle,
  Package,
  PackageX,
  Plus,
  RotateCcw,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";

interface SalesMetric {
  revenue: number;
  orders: number;
}

interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RecentOrder {
  orderId: string;
  status: string;
  createdAt: string | null;
  customerName: string | null;
  total: number;
  items: Array<{ title: string }>;
}

interface NotificationPreview {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  sellerId: string;
  todaySales: SalesMetric;
  monthSales: SalesMetric;
  totalRevenue: number;
  pendingOrders: number;
  preparingOrders: number;
  shippedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  unreadMessages: number;
  unreadNotifications: number;
  salesChart: SalesPoint[];
  recentOrders: RecentOrder[];
  notifications: NotificationPreview[];
  statusLabel: (status: string) => { label: string; className: string };
  onOpenOrders: (filter: string, range?: "today" | "month") => void;
  onOpenProducts: (filter: string) => void;
  onOpenSection: (section: string) => void;
  onAddProduct: () => void;
}

export function SellerDashboardProfessional({
  sellerId,
  todaySales,
  monthSales,
  totalRevenue,
  pendingOrders,
  preparingOrders,
  shippedOrders,
  completedOrders,
  cancelledOrders,
  returnedOrders,
  activeProducts,
  lowStock,
  outOfStock,
  unreadMessages,
  unreadNotifications,
  salesChart,
  recentOrders,
  notifications,
  statusLabel,
  onOpenOrders,
  onOpenProducts,
  onOpenSection,
  onAddProduct,
}: Props) {
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    let active = true;
    void supabase
      .from("seller_balances")
      .select("available")
      .eq("seller_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setAvailableBalance(Number(data?.available ?? 0));
      });
    return () => {
      active = false;
    };
  }, [sellerId]);

  const attentionCount =
    pendingOrders + lowStock + outOfStock + returnedOrders + unreadMessages + unreadNotifications;
  const funnel = [
    { label: "Yeni", value: pendingOrders, color: "bg-amber-500", filter: "pending" },
    { label: "Hazırlanır", value: preparingOrders, color: "bg-violet-500", filter: "preparing" },
    { label: "Çatdırılır", value: shippedOrders, color: "bg-blue-500", filter: "shipped" },
    { label: "Tamamlanıb", value: completedOrders, color: "bg-emerald-500", filter: "completed" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((item) => item.value));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              Satıcı iş mərkəzi
            </div>
            <h1 className="mt-1 text-2xl font-black">Bu gün diqqət tələb edən işlər</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {attentionCount > 0
                ? `${attentionCount} əməliyyat sizin müdaxilənizi gözləyir.`
                : "Hazırda təcili əməliyyat yoxdur."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onAddProduct}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Yeni məhsul
            </button>
            <button
              onClick={() => onOpenOrders("pending")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold"
            >
              <ShoppingBag className="h-4 w-4" /> Sifarişləri emal et
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Bugünkü satış",
            value: formatAZN(todaySales.revenue),
            note: `${todaySales.orders} ödənilmiş sifariş`,
            icon: CircleDollarSign,
            action: () => onOpenOrders("paid", "today"),
          },
          {
            label: "Bu ay satış",
            value: formatAZN(monthSales.revenue),
            note: `${monthSales.orders} ödənilmiş sifariş`,
            icon: TrendingUp,
            action: () => onOpenOrders("paid", "month"),
          },
          {
            label: "Yeni sifariş",
            value: pendingOrders.toString(),
            note: "Hazırlanma gözləyir",
            icon: ShoppingBag,
            action: () => onOpenOrders("pending"),
          },
          {
            label: "Çıxarıla bilən balans",
            value: formatAZN(availableBalance),
            note: `Ümumi dövriyyə ${formatAZN(totalRevenue)}`,
            icon: Wallet,
            action: () => onOpenSection("balance"),
          },
        ].map((metric) => (
          <button
            key={metric.label}
            onClick={metric.action}
            className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
                <div className="mt-2 text-2xl font-black">{metric.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{metric.note}</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
              Detallara bax <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </section>

      {(attentionCount > 0 || activeProducts === 0) && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pendingOrders > 0 && (
            <AttentionCard
              icon={ShoppingBag}
              tone="warning"
              title={`${pendingOrders} yeni sifariş`}
              body="Müştəri gözləyir. Sifarişləri hazırlamağa başlayın."
              onClick={() => onOpenOrders("pending")}
            />
          )}
          {(lowStock > 0 || outOfStock > 0) && (
            <AttentionCard
              icon={outOfStock > 0 ? PackageX : AlertTriangle}
              tone={outOfStock > 0 ? "danger" : "warning"}
              title={`${lowStock + outOfStock} stok xəbərdarlığı`}
              body={`${lowStock} məhsul azalır, ${outOfStock} məhsulun stoku bitib.`}
              onClick={() => onOpenSection("inventory")}
            />
          )}
          {(unreadMessages > 0 || unreadNotifications > 0) && (
            <AttentionCard
              icon={MessageCircle}
              tone="primary"
              title={`${unreadMessages + unreadNotifications} oxunmamış məlumat`}
              body={`${unreadMessages} mesaj və ${unreadNotifications} sistem bildirişi.`}
              onClick={() => onOpenSection(unreadMessages > 0 ? "messages" : "notifications")}
            />
          )}
          {returnedOrders > 0 && (
            <AttentionCard
              icon={Undo2}
              tone="danger"
              title={`${returnedOrders} qaytarma`}
              body="Qaytarma sorğularını və məhsul vəziyyətini yoxlayın."
              onClick={() => onOpenSection("returns")}
            />
          )}
          {activeProducts === 0 && (
            <AttentionCard
              icon={Package}
              tone="primary"
              title="Aktiv məhsul yoxdur"
              body="Mağazanı satışa açmaq üçün ilk məhsulunuzu əlavə edin."
              onClick={onAddProduct}
            />
          )}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Satış dinamikası</h2>
              <p className="text-xs text-muted-foreground">Son 14 gün üzrə ödənilmiş satışlar</p>
            </div>
            <button
              onClick={() => onOpenSection("analytics")}
              className="text-sm font-bold text-primary hover:underline"
            >
              Ətraflı analitika
            </button>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={55} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue" ? formatAZN(Number(value)) : Number(value),
                    name === "revenue" ? "Gəlir" : "Sifariş",
                  ]}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black">Sifariş axını</h2>
            <p className="text-xs text-muted-foreground">Cari sifarişlərin mərhələlər üzrə bölgüsü</p>
          </div>
          <div className="space-y-4">
            {funnel.map((item) => (
              <button key={item.label} onClick={() => onOpenOrders(item.filter)} className="w-full text-left">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold">{item.label}</span>
                  <span className="font-black">{item.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.max(item.value ? 8 : 0, (item.value / funnelMax) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border pt-4">
            <button
              onClick={() => onOpenOrders("cancelled")}
              className="rounded-xl bg-destructive/8 p-3 text-left"
            >
              <div className="text-xs text-muted-foreground">Ləğv edilən</div>
              <div className="mt-1 text-xl font-black text-destructive">{cancelledOrders}</div>
            </button>
            <button
              onClick={() => onOpenOrders("returned")}
              className="rounded-xl bg-amber-500/8 p-3 text-left"
            >
              <div className="text-xs text-muted-foreground">Qaytarılan</div>
              <div className="mt-1 text-xl font-black text-amber-700">{returnedOrders}</div>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Son sifarişlər</h2>
              <p className="text-xs text-muted-foreground">Bir sifariş, bir qeyd prinsipi ilə</p>
            </div>
            <button onClick={() => onOpenOrders("all")} className="text-sm font-bold text-primary">
              Hamısı
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} text="Hələ sifariş yoxdur" />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const status = statusLabel(order.status);
                return (
                  <button
                    key={order.orderId}
                    onClick={() => onOpenOrders("all")}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-secondary/30"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        #{order.orderId.slice(0, 8).toUpperCase()} · {order.customerName ?? "Müştəri"}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {order.items[0]?.title ?? "Məhsul"}
                        {order.items.length > 1 ? ` və daha ${order.items.length - 1} məhsul` : ""}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {order.createdAt ? formatDateTime(order.createdAt) : "—"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-black">{formatAZN(order.total)}</div>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black">Son bildirişlər</h2>
            </div>
            <button
              onClick={() => onOpenSection("notifications")}
              className="text-sm font-bold text-primary"
            >
              Mərkəzi aç
            </button>
          </div>
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} text="Bildiriş yoxdur" />
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => onOpenSection("notifications")}
                  className={`w-full rounded-xl border p-3 text-left ${
                    notification.is_read ? "border-border" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="line-clamp-1 text-sm font-bold">{notification.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {notification.body}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatDateTime(notification.created_at)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-black">Sürətli əməliyyatlar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction icon={Plus} label="Yeni məhsul" onClick={onAddProduct} />
          <QuickAction icon={Boxes} label="Stoku yenilə" onClick={() => onOpenSection("inventory")} />
          <QuickAction icon={Store} label="Mağazanı redaktə et" onClick={() => onOpenSection("shop")} />
          <QuickAction icon={Settings} label="Maliyyə ayarları" onClick={() => onOpenSection("balance")} />
        </div>
      </section>
    </div>
  );
}

function AttentionCard({
  icon: Icon,
  tone,
  title,
  body,
  onClick,
}: {
  icon: typeof AlertTriangle;
  tone: "primary" | "warning" | "danger";
  title: string;
  body: string;
  onClick: () => void;
}) {
  const toneClass = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    warning: "border-amber-500/25 bg-amber-500/5 text-amber-700",
    danger: "border-destructive/25 bg-destructive/5 text-destructive",
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <div className="rounded-xl bg-background/80 p-2.5"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <div className="font-black">{title}</div>
        <div className="mt-1 text-xs text-foreground/70">{body}</div>
      </div>
      <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0" />
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-border p-4 text-left font-bold transition hover:border-primary/40 hover:bg-secondary/40"
    >
      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
      <span className="text-sm">{label}</span>
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Bell; text: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center text-muted-foreground">
      <Icon className="mb-2 h-8 w-8 opacity-50" />
      <div className="text-sm">{text}</div>
    </div>
  );
}
