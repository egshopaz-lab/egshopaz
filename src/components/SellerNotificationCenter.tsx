import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  CircleDollarSign,
  MessageCircle,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export interface SellerNotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  pickup_code: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  sellerId: string;
  notifications: SellerNotificationItem[];
  onChanged: () => void;
}

type Filter = "all" | "unread" | "orders" | "payments" | "returns" | "system";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Hamısı" },
  { value: "unread", label: "Oxunmamış" },
  { value: "orders", label: "Sifarişlər" },
  { value: "payments", label: "Ödənişlər" },
  { value: "returns", label: "Qaytarmalar" },
  { value: "system", label: "Sistem" },
];

export function SellerNotificationCenter({ sellerId, notifications, onChanged }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("az-AZ");
    return notifications.filter((notification) => {
      if (filter === "unread" && notification.is_read) return false;
      if (filter === "orders" && !/order|sifariş|delivery|pickup/i.test(notification.type + notification.title)) return false;
      if (filter === "payments" && !/pay|ödəniş|balans|payout/i.test(notification.type + notification.title)) return false;
      if (filter === "returns" && !/return|qaytar/i.test(notification.type + notification.title)) return false;
      if (
        filter === "system" &&
        /order|sifariş|delivery|pickup|pay|ödəniş|balans|payout|return|qaytar/i.test(
          notification.type + notification.title,
        )
      ) return false;
      if (!normalized) return true;
      return `${notification.title} ${notification.body}`.toLocaleLowerCase("az-AZ").includes(normalized);
    });
  }, [filter, notifications, query]);

  const markAllRead = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", sellerId)
      .eq("is_read", false);
    setBusy(false);
    if (error) return toast.error(`Bildirişlər yenilənmədi: ${error.message}`);
    toast.success("Bütün bildirişlər oxunmuş kimi qeyd edildi");
    onChanged();
  };

  const markRead = async (notification: SellerNotificationItem) => {
    if (notification.is_read) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id)
      .eq("user_id", sellerId);
    if (error) return toast.error(error.message);
    onChanged();
  };

  const iconFor = (notification: SellerNotificationItem) => {
    const haystack = `${notification.type} ${notification.title}`;
    if (/pay|ödəniş|balans|payout/i.test(haystack)) return CircleDollarSign;
    if (/return|qaytar/i.test(haystack)) return RotateCcw;
    if (/message|mesaj/i.test(haystack)) return MessageCircle;
    if (/order|sifariş|delivery|pickup/i.test(haystack)) return Package;
    return ShieldAlert;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black">Bildiriş mərkəzi</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sifariş, ödəniş, qaytarma və sistem məlumatlarını bir yerdə izləyin.
          </p>
        </div>
        <button
          onClick={() => void markAllRead()}
          disabled={busy || !notifications.some((item) => !item.is_read)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" /> Hamısını oxunmuş et
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const count =
                item.value === "all"
                  ? notifications.length
                  : item.value === "unread"
                    ? notifications.filter((notification) => !notification.is_read).length
                    : undefined;
              return (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    filter === item.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {item.label}{count !== undefined ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
          <label className="relative block w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Bildirişlərdə axtar"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <div className="mt-3 font-bold">Bu filtr üzrə bildiriş yoxdur</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Yeni məlumat daxil olduqda burada görünəcək.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((notification) => {
            const Icon = iconFor(notification);
            return (
              <button
                key={notification.id}
                onClick={() => void markRead(notification)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-primary/40 ${
                  notification.is_read ? "border-border bg-card" : "border-primary/25 bg-primary/5"
                }`}
              >
                <div className={`rounded-xl p-2.5 ${notification.is_read ? "bg-secondary" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-black">{notification.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDateTime(notification.created_at)}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{notification.body}</div>
                  {notification.pickup_code && (
                    <div className="mt-2 inline-flex rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                      Kod: {notification.pickup_code}
                    </div>
                  )}
                </div>
                {!notification.is_read && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
