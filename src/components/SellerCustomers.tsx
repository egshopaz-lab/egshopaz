import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { Ban, MessageCircle, Search, ShoppingBag, Users } from "lucide-react";
import { toast } from "sonner";

interface Props {
  sellerId: string;
  onOpenMessages?: () => void;
}

interface CustomerRow {
  buyerId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  orders: number;
  items: number;
  spent: number;
  lastOrderAt: string | null;
  blocked: boolean;
}

export function SellerCustomers({ sellerId, onOpenMessages }: Props) {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: items, error } = await supabase
      .from("order_items")
      .select("order_id,quantity,price,customer_name,customer_phone,customer_email")
      .eq("seller_id", sellerId);
    if (error) {
      toast.error(`Müştərilər yüklənmədi: ${error.message}`);
      setLoading(false);
      return;
    }
    const orderIds = [...new Set((items ?? []).map((item) => item.order_id))];
    const [{ data: orders }, { data: blocks }] = await Promise.all([
      orderIds.length
        ? supabase
            .from("orders")
            .select("id,buyer_id,recipient_name,recipient_phone,recipient_email,created_at")
            .in("id", orderIds)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
      supabase.from("shop_message_blocks").select("blocked_id").eq("blocker_id", sellerId),
    ]);
    const orderMap = new Map((orders ?? []).map((order: any) => [order.id, order]));
    const blockedIds = new Set((blocks ?? []).map((block) => block.blocked_id));
    const grouped = new Map<string, CustomerRow & { orderIds: Set<string> }>();
    for (const item of items ?? []) {
      const order: any = orderMap.get(item.order_id);
      const buyerId = order?.buyer_id ?? null;
      const phone = item.customer_phone ?? order?.recipient_phone ?? null;
      const email = item.customer_email ?? order?.recipient_email ?? null;
      const key = buyerId ?? phone ?? email ?? item.customer_name ?? item.order_id;
      const existing = grouped.get(key) ?? {
        buyerId,
        name: item.customer_name ?? order?.recipient_name ?? "Adsız müştəri",
        phone,
        email,
        orders: 0,
        items: 0,
        spent: 0,
        lastOrderAt: null,
        blocked: buyerId ? blockedIds.has(buyerId) : false,
        orderIds: new Set<string>(),
      };
      existing.orderIds.add(item.order_id);
      existing.orders = existing.orderIds.size;
      existing.items += Number(item.quantity);
      existing.spent += Number(item.price) * Number(item.quantity);
      if (order?.created_at && (!existing.lastOrderAt || order.created_at > existing.lastOrderAt)) {
        existing.lastOrderAt = order.created_at;
      }
      grouped.set(key, existing);
    }
    setCustomers(
      [...grouped.values()]
        .map(({ orderIds: _orderIds, ...customer }) => customer)
        .sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "")),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [sellerId]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("az");
    return customers.filter(
      (customer) =>
        !q ||
        [customer.name, customer.phone, customer.email].some((value) =>
          value?.toLocaleLowerCase("az").includes(q),
        ),
    );
  }, [customers, query]);

  const totalSpent = customers.reduce((sum, customer) => sum + customer.spent, 0);
  const repeatCustomers = customers.filter((customer) => customer.orders > 1).length;

  const toggleBlock = async (customer: CustomerRow) => {
    if (!customer.buyerId) {
      toast.error("Qonaq sifarişi üçün bloklama mümkün deyil");
      return;
    }
    const action = customer.blocked
      ? supabase
          .from("shop_message_blocks")
          .delete()
          .eq("blocker_id", sellerId)
          .eq("blocked_id", customer.buyerId)
      : supabase
          .from("shop_message_blocks")
          .insert({ blocker_id: sellerId, blocked_id: customer.buyerId });
    const { error } = await action;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(customer.blocked ? "Müştəri blokdan çıxarıldı" : "Müştəri bloklandı");
    void load();
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Yüklənir...</div>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Unikal müştəri", value: customers.length, icon: Users },
          { label: "Təkrar alış edən", value: repeatCustomers, icon: ShoppingBag },
          { label: "Ümumi satış", value: formatAZN(totalSpent), icon: ShoppingBag },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
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
        <div className="p-4 border-b border-border">
          <label className="relative block max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad, telefon və ya e-poçt ilə axtar"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="p-3">Müştəri</th>
                <th className="p-3">Əlaqə</th>
                <th className="p-3">Sifariş</th>
                <th className="p-3">Məhsul</th>
                <th className="p-3">Ümumi alış</th>
                <th className="p-3">Son sifariş</th>
                <th className="p-3 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr
                  key={customer.buyerId ?? `${customer.phone}-${customer.email}`}
                  className="border-t border-border"
                >
                  <td className="p-3">
                    <div className="font-semibold">{customer.name}</div>
                    {customer.blocked && (
                      <span className="text-[11px] text-destructive font-bold">Bloklanıb</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    <div>{customer.phone || "—"}</div>
                    <div className="text-muted-foreground">{customer.email || "—"}</div>
                  </td>
                  <td className="p-3 font-bold">{customer.orders}</td>
                  <td className="p-3">{customer.items}</td>
                  <td className="p-3 font-bold">{formatAZN(customer.spent)}</td>
                  <td className="p-3 text-xs">
                    {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {customer.buyerId && (
                        <button
                          onClick={onOpenMessages}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary"
                          title="Mesajlar"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleBlock(customer)}
                        className={`p-2 rounded-lg ${customer.blocked ? "bg-secondary" : "hover:bg-destructive/10 text-destructive"}`}
                        title={customer.blocked ? "Blokdan çıxar" : "Blokla"}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">Müştəri tapılmadı</div>
          )}
        </div>
      </div>
    </div>
  );
}
