import { useMemo, useState } from "react";
import {
  ChevronDown,
  Clock3,
  Package,
  Printer,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";
import { DateRangeFilter, inRange, type DateRange } from "@/components/DateRangeFilter";
import { SellerExternalDelivery } from "@/components/SellerExternalDelivery";
import { formatAZN, formatDateTime } from "@/lib/format";

export interface SellerOrderItemRecord {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image_url: string | null;
  order_id: string;
  status: string;
  product_id: string;
  pickup_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  pickup_point_id: string | null;
  order_created_at?: string | null;
  order_payment_status?: string | null;
  pickup_point: {
    id: string;
    name: string;
    city: string;
    address: string;
    point_number: number | null;
    phone: string | null;
    working_hours: string;
  } | null;
}

export type SellerOrderFilter =
  | "all"
  | "paid"
  | "pending"
  | "preparing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";

interface Props {
  items: SellerOrderItemRecord[];
  filter: SellerOrderFilter;
  dateRange: DateRange;
  onFilterChange: (filter: SellerOrderFilter) => void;
  onDateRangeChange: (range: DateRange) => void;
  onStatusChange: (item: SellerOrderItemRecord, status: string) => void;
  onPrintLabel: (item: SellerOrderItemRecord) => void;
  onChanged: () => void;
}

const STATUSES = [
  { value: "pending", label: "Yeni sifariş", className: "bg-amber-500/10 text-amber-700" },
  { value: "paid", label: "Ödənilib", className: "bg-blue-500/10 text-blue-700" },
  { value: "preparing", label: "Hazırlanır", className: "bg-violet-500/10 text-violet-700" },
  { value: "packed", label: "Paketlənib", className: "bg-violet-500/10 text-violet-700" },
  { value: "shipped", label: "Göndərilib", className: "bg-blue-500/10 text-blue-700" },
  { value: "handed_to_courier", label: "Kuryerə təhvil", className: "bg-blue-500/10 text-blue-700" },
  { value: "in_transit", label: "Çatdırılır", className: "bg-blue-500/10 text-blue-700" },
  { value: "delivered", label: "Müştəriyə təhvil", className: "bg-emerald-500/10 text-emerald-700" },
  { value: "completed", label: "Tamamlanıb", className: "bg-emerald-500/10 text-emerald-700" },
  { value: "disputed", label: "Mübahisədə", className: "bg-red-500/10 text-red-700" },
  { value: "returned", label: "Qaytarılıb", className: "bg-amber-500/10 text-amber-700" },
  { value: "cancelled", label: "Ləğv edilib", className: "bg-red-500/10 text-red-700" },
];

const STATUS_RANK = [
  "pending",
  "paid",
  "preparing",
  "packed",
  "shipped",
  "handed_to_courier",
  "in_transit",
  "delivered",
  "completed",
];

function orderStatus(items: SellerOrderItemRecord[]) {
  const active = items.filter((item) => !["cancelled", "returned"].includes(item.status));
  if (active.length) {
    return [...active].sort(
      (a, b) => STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status),
    )[0].status;
  }
  return items.some((item) => item.status === "returned") ? "returned" : "cancelled";
}

function matchesFilter(status: string, paymentStatus: string | null | undefined, filter: SellerOrderFilter) {
  if (filter === "all") return true;
  if (filter === "paid") {
    return paymentStatus === "paid" || ["paid", "delivered", "completed"].includes(status);
  }
  const groups: Record<Exclude<SellerOrderFilter, "all" | "paid">, string[]> = {
    pending: ["pending", "paid"],
    preparing: ["preparing", "packed"],
    shipped: ["shipped", "handed_to_courier", "in_transit"],
    completed: ["delivered", "completed"],
    cancelled: ["cancelled"],
    returned: ["returned"],
  };
  return groups[filter].includes(status);
}

export function SellerOrdersWorkspace({
  items,
  filter,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onStatusChange,
  onPrintLabel,
  onChanged,
}: Props) {
  const [query, setQuery] = useState("");

  const allOrders = useMemo(() => {
    const map = new Map<string, SellerOrderItemRecord[]>();
    items.forEach((item) => {
      const list = map.get(item.order_id) ?? [];
      list.push(item);
      map.set(item.order_id, list);
    });
    return [...map.entries()]
      .map(([id, orderItems]) => ({
        id,
        items: orderItems,
        status: orderStatus(orderItems),
        createdAt: orderItems.find((item) => item.order_created_at)?.order_created_at ?? null,
        paymentStatus: orderItems.find((item) => item.order_payment_status)?.order_payment_status ?? null,
        customerName: orderItems.find((item) => item.customer_name)?.customer_name ?? null,
        customerPhone: orderItems.find((item) => item.customer_phone)?.customer_phone ?? null,
        total: orderItems.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0,
        ),
      }))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [items]);

  const statusCounts = useMemo(() => {
    const count = (target: SellerOrderFilter) =>
      allOrders.filter((order) => matchesFilter(order.status, order.paymentStatus, target)).length;
    return {
      all: allOrders.length,
      paid: count("paid"),
      pending: count("pending"),
      preparing: count("preparing"),
      shipped: count("shipped"),
      completed: count("completed"),
      cancelled: count("cancelled"),
      returned: count("returned"),
    };
  }, [allOrders]);

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("az-AZ");
    return allOrders.filter((order) => {
      if (!matchesFilter(order.status, order.paymentStatus, filter)) return false;
      if (!inRange(order.createdAt, dateRange)) return false;
      if (!normalized) return true;
      return [
        order.id,
        order.customerName,
        order.customerPhone,
        ...order.items.flatMap((item) => [item.title, item.pickup_code]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az-AZ")
        .includes(normalized);
    });
  }, [allOrders, dateRange, filter, query]);

  const visibleTotal = visibleOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Sifarişlərin idarə edilməsi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hər sifariş bir qeyd kimi göstərilir; məhsullar və çatdırılma məlumatları sifariş daxilindədir.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Hamısı"],
              ["paid", "Ödənilmiş"],
              ["pending", "Yeni"],
              ["preparing", "Hazırlanır"],
              ["shipped", "Çatdırılır"],
              ["completed", "Tamamlanıb"],
              ["cancelled", "Ləğv"],
              ["returned", "Qaytarma"],
            ] as Array<[SellerOrderFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onFilterChange(value)}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  filter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {label} ({statusCounts[value]})
              </button>
            ))}
          </div>
          <label className="relative block w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sifariş, müştəri, telefon və ya məhsul"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-3">
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Nəticə" value={`${visibleOrders.length} sifariş`} icon={ShoppingBag} />
        <Metric label="Ümumi məbləğ" value={formatAZN(visibleTotal)} icon={Package} />
        <Metric
          label="Orta sifariş"
          value={formatAZN(visibleOrders.length ? visibleTotal / visibleOrders.length : 0)}
          icon={Clock3}
        />
      </div>

      {visibleOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="mt-3 font-bold">Bu filtr üzrə sifariş yoxdur</div>
          <div className="mt-1 text-sm text-muted-foreground">Tarix və ya status filtrini dəyişin.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => {
            const status = STATUSES.find((item) => item.value === order.status) ?? STATUSES[0];
            const pickup = order.items.find((item) => item.pickup_point)?.pickup_point ?? null;
            return (
              <details
                key={order.id}
                className="group overflow-hidden rounded-2xl border border-border bg-card open:border-primary/30"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                          {status.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          order.paymentStatus === "paid"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {order.paymentStatus === "paid" ? "Ödənilib" : "Ödəniş gözləyir"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {order.customerName ?? "Müştəri"}
                        </span>
                        {order.customerPhone && <span>{order.customerPhone}</span>}
                        <span>{order.createdAt ? formatDateTime(order.createdAt) : "—"}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {order.items.length} məhsul sətri · {order.items.reduce((sum, item) => sum + item.quantity, 0)} ədəd
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <div className="text-lg font-black">{formatAZN(order.total)}</div>
                      <div className="text-[10px] text-muted-foreground">Sifariş məbləği</div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-border bg-secondary/15 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                    <div className="space-y-3">
                      {order.items.map((item) => {
                        const itemStatus = STATUSES.find((entry) => entry.value === item.status) ?? STATUSES[0];
                        const canPack = ["pending", "preparing"].includes(item.status);
                        const canShip =
                          !item.accepted_at &&
                          !item.delivered_at &&
                          ["pending", "packed"].includes(item.status);
                        return (
                          <div key={item.id} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                                {item.image_url && (
                                  <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold">{item.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {item.quantity} ədəd · {formatAZN(item.price)} · Kod:{" "}
                                  <b className="font-mono">{item.pickup_code ?? "—"}</b>
                                </div>
                                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${itemStatus.className}`}>
                                  {itemStatus.label}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end">
                                {canPack && (
                                  <button
                                    onClick={() => onStatusChange(item, "packed")}
                                    className="h-9 rounded-lg bg-violet-500/10 px-3 text-xs font-bold text-violet-700"
                                  >
                                    Paketlə
                                  </button>
                                )}
                                {canShip && (
                                  <button
                                    onClick={() => onStatusChange(item, "shipped")}
                                    className="h-9 rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary"
                                  >
                                    Göndərildi
                                  </button>
                                )}
                                <button
                                  onClick={() => onPrintLabel(item)}
                                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-bold"
                                >
                                  <Printer className="h-3.5 w-3.5" /> Etiket
                                </button>
                              </div>
                            </div>
                            <div className="mt-3">
                              <SellerExternalDelivery
                                orderItemId={item.id}
                                itemStatus={item.status}
                                onChanged={onChanged}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 font-black">
                          <Truck className="h-4 w-4 text-primary" /> Çatdırılma
                        </div>
                        {pickup ? (
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="font-bold">{pickup.name}</div>
                            <div className="text-muted-foreground">{pickup.city}, {pickup.address}</div>
                            <div className="text-xs text-muted-foreground">{pickup.working_hours}</div>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-muted-foreground">
                            PVZ təyin edilməyib. Kənar kuryer məlumatını məhsul sətrində əlavə edə bilərsiniz.
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="font-black">Maliyyə xülasəsi</div>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Məhsullar</span>
                            <b>{formatAZN(order.total)}</b>
                          </div>
                          <div className="flex justify-between border-t border-border pt-2 text-base">
                            <span className="font-bold">Yekun</span>
                            <b className="text-primary">{formatAZN(order.total)}</b>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-black">{value}</div>
      </div>
    </div>
  );
}
