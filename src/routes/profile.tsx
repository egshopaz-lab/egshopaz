import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  ShoppingCart,
  Star,
  User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Müştəri paneli — EG Shop" }] }),
  component: Profile,
});

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  shop_address: string | null;
  shop_city: string | null;
}

function Profile() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [favCount, setFavCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      const [ordersRes, profileRes, favoritesRes, cartRes, notificationsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,created_at")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("profiles")
          .select("full_name,phone,shop_address,shop_city")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("cart_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);

      if (!active) return;
      const firstError = ordersRes.error ?? profileRes.error ?? favoritesRes.error ?? cartRes.error ?? notificationsRes.error;
      if (firstError) toast.error(`Müştəri paneli yüklənmədi: ${firstError.message}`);

      const profile = profileRes.data as ProfileRow | null;
      setOrders((ordersRes.data ?? []) as Order[]);
      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
      setAddress(profile?.shop_address ?? "");
      setCity(profile?.shop_city ?? "");
      setFavCount(favoritesRes.count ?? 0);
      setCartCount(cartRes.count ?? 0);
      setUnreadCount(notificationsRes.count ?? 0);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName.trim().slice(0, 100) || null,
        phone: phone.trim().slice(0, 30) || null,
        shop_address: address.trim().slice(0, 300) || null,
        shop_city: city.trim().slice(0, 100) || null,
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      toast.error(`${t("common.saveError")}: ${error.message}`);
      return;
    }
    toast.success(t("common.saved"));
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <UserIcon className="mx-auto mb-3 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Müştəri paneli</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sifariş, səbət və sevimliləri görmək üçün hesaba daxil olun.</p>
          <Link to="/auth" className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90">
            Daxil ol
          </Link>
        </div>
      </div>
    );
  }

  const displayName = fullName || user.email?.split("@")[0] || "Müştəri";
  const initial = displayName.charAt(0).toUpperCase();
  const activeOrderCount = orders.filter((o) => ["pending", "paid", "packed", "shipped"].includes(o.status)).length;

  const stats = [
    { label: t("sidebar.orders"), value: activeOrderCount, icon: Package, to: "/orders" as const },
    { label: t("sidebar.favorites"), value: favCount, icon: Heart, to: "/favorites" as const },
    { label: t("sidebar.cart"), value: cartCount, icon: ShoppingCart, to: "/cart" as const },
    { label: t("sidebar.notifications"), value: unreadCount, icon: Bell, to: "/notifications" as const },
  ];

  const accountLinks = [
    { label: t("sidebar.orders"), description: "Sifariş statusu və izləmə", icon: Package, to: "/orders" as const },
    { label: t("sidebar.addresses"), description: "Çatdırılma məlumatları", icon: MapPin, to: "/addresses" as const },
    { label: t("sidebar.paymentMethods"), description: "Ödəniş məlumatları", icon: CreditCard, to: "/payment-methods" as const },
    { label: t("sidebar.messages"), description: "Satıcılarla yazışmalar", icon: MessageCircle, to: "/messages" as const },
    { label: t("sidebar.myReviews"), description: "Məhsul rəyləri", icon: Star, to: "/my-reviews" as const },
    { label: t("sidebar.bonuses"), description: "Bonus balansı", icon: Gift, to: "/bonus" as const },
    { label: t("sidebar.support"), description: "Dəstək müraciətləri", icon: HelpCircle, to: "/support" as const },
  ];

  const statusLabel: Record<string, string> = {
    pending: t("orders.pending"),
    paid: t("orders.paid"),
    packed: "Paketləndi",
    shipped: t("orders.shipped"),
    delivered: t("orders.delivered"),
    cancelled: t("orders.cancelled"),
  };

  return (
    <PanelLayout title="Müştəri paneli" subtitle={user.email ?? undefined} items={items}>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-primary-foreground">
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold">{displayName}</h1>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditing((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-secondary"
              >
                <Pencil className="h-4 w-4" /> {editing ? "Bağla" : "Profili düzəlt"}
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> {t("profile.logout")}
              </button>
            </div>
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <UserIcon className="h-4 w-4 text-primary" /> {t("profile.personalInfo")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                maxLength={100}
                placeholder={t("profile.fullName")}
                className="h-11 rounded-lg border border-input bg-background px-3"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={30}
                placeholder="+994"
                className="h-11 rounded-lg border border-input bg-background px-3"
              />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={100}
                placeholder={t("profile.cityPlaceholder")}
                className="h-11 rounded-lg border border-input bg-background px-3"
              />
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={300}
                placeholder={t("profile.addressPlaceholder")}
                className="h-11 rounded-lg border border-input bg-background px-3"
              />
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-3 h-11 rounded-lg bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "..." : t("common.save")}
            </button>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-extrabold">{loading ? "—" : stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Link>
          ))}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-extrabold">Son sifarişlər</h2>
              <Link to="/orders" className="text-sm font-bold text-primary hover:underline">
                Hamısı
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="rounded-xl bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
                Hələ sifariş yoxdur.
              </div>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 4).map((order) => (
                  <Link
                    key={order.id}
                    to="/orders"
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition hover:border-primary"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">№ {order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-sm font-semibold">{formatDate(order.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold">{formatAZN(order.total)}</div>
                      <div className="text-xs text-muted-foreground">{statusLabel[order.status] ?? order.status}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-2">
            {accountLinks.map((link) => (
              <Link key={link.label} to={link.to} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-secondary">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{link.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{link.description}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </PanelLayout>
  );
}
