import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import {
  Users, Package, ShoppingBag, DollarSign, Shield, LayoutDashboard,
  Truck, Warehouse, Store, Megaphone, BarChart3, Lock, Scale,
  FileText, Settings, LifeBuoy, AlertTriangle, TrendingUp, Plus, Trash2,
  CheckCircle2, XCircle, Power, Ban, Edit3, Bell, Tag, Crown, Gem, Star, Award, Bot, Sparkles, Undo2, Wallet,
} from "lucide-react";
import { AdminPayouts } from "@/components/AdminPayouts";
import { AdminTreasury } from "@/components/AdminTreasury";
import { toast } from "sonner";
import { PanelLayout, type PanelNavItem } from "@/components/PanelLayout";
import { AZ_CITY_NAMES, findCity } from "@/lib/azCities";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin paneli — EG Shop" }] }),
  component: AdminPanel,
});

type TabKey =
  | "dashboard" | "customers" | "sellers" | "couriers" | "pvz_staff"
  | "categories" | "products" | "shops" | "warehouses" | "pickup_points"
  | "orders" | "returns" | "finance" | "treasury" | "payouts" | "marketing" | "banners" | "packages" | "promo" | "analytics"
  | "security" | "disputes" | "content" | "settings" | "support" | "ai_bot";

interface Stat { users: number; products: number; orders: number; revenue: number; sellers: number }
interface ProfileRow { id: string; full_name: string | null; shop_name: string | null; created_at: string; phone: string | null }
interface RoleRow { user_id: string; role: string }
interface OrderRow { id: string; total: number; status: string; created_at: string; buyer_id: string }
interface ProductRow { id: string; title: string; price: number; stock: number; is_active: boolean; seller_id: string; image_url: string | null; category_id: string | null }
interface CategoryRow { id: string; name: string; slug: string; icon: string | null; sort_order: number; parent_id: string | null }
interface CourierRow { id: string; full_name: string; phone: string; vehicle_type: string; city: string; is_active: boolean; rating: number; total_deliveries: number; earnings: number }
interface WarehouseRow { id: string; name: string; city: string; address: string; capacity: number; occupied: number; manager_name: string | null; is_active: boolean }
interface PickupRow { id: string; name: string; city: string; address: string; phone: string | null; is_active: boolean; working_hours: string; point_number: number | null }
interface BannerRow { id: string; title: string; image_url: string | null; link_url: string | null; position: string; is_active: boolean; clicks: number; impressions: number }
interface DisputeRow { id: string; order_id: string | null; buyer_id: string; seller_id: string | null; reason: string; status: string; compensation: number | null; created_at: string }
interface PromoRow { id: string; code: string; discount_percent: number | null; discount_amount: number | null; is_active: boolean; used_count: number; usage_limit: number | null; min_order: number }
interface SettingsRow { id: string; commission_percent: number; delivery_base_fee: number; storage_fee_per_day: number; maintenance_mode: boolean; min_payout: number; single_product_promo_price: number; single_product_promo_days: number; single_shop_promo_price: number; single_shop_promo_days: number; single_banner_price: number; single_banner_days: number; promo_terms_text: string; seller_signup_fee: number }
interface TicketRow { id: string; subject: string; category: string; status: string; user_id: string; created_at: string; admin_reply: string | null }
interface AdPackageRow {
  id: string; name: string; tier: string; price: number; duration_days: number;
  banner_slots: number; sponsored_product_slots: number; features: string[] | unknown;
  color: string; is_active: boolean; sort_order: number;
}

function AdminPanel() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [stats, setStats] = useState<Stat>({ users: 0, products: 0, orders: 0, revenue: 0, sellers: 0 });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [pickups, setPickups] = useState<PickupRow[]>([]);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [packages, setPackages] = useState<AdPackageRow[]>([]);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("admin_panel_unlocked") === "1";
  });
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin-password", { body: { password: pwInput } });
      if (error || !data?.ok) {
        setPwError(data?.error || "Parol yanlışdır");
        setPwSubmitting(false);
        return;
      }
      sessionStorage.setItem("admin_panel_unlocked", "1");
      setUnlocked(true);
      setPwInput("");
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwSubmitting(false);
    }
  };

  const reload = async () => {
    const [
      { count: u }, { count: p }, { data: os }, { data: pr }, { data: rs },
      { data: prod }, { data: cats }, { data: cour }, { data: wh },
      { data: pp }, { data: bn }, { data: dsp }, { data: prm }, { data: stg }, { data: tkt }, { data: pkg },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id,full_name,shop_name,created_at,phone").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("products").select("id,title,price,stock,is_active,seller_id,image_url,category_id").order("created_at", { ascending: false }).limit(200),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("couriers").select("*").order("created_at", { ascending: false }),
      supabase.from("warehouses").select("*").order("created_at", { ascending: false }),
      supabase.from("pickup_points").select("*").order("created_at", { ascending: false }),
      supabase.from("banners").select("*").order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("system_settings").select("*").limit(1).maybeSingle(),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ad_packages").select("*").order("sort_order", { ascending: true }),
    ]);
    const orderRows = (os ?? []) as OrderRow[];
    const roleRows = (rs ?? []) as RoleRow[];
    setOrders(orderRows);
    setProfiles((pr ?? []) as ProfileRow[]);
    setRoles(roleRows);
    setProducts((prod ?? []) as ProductRow[]);
    setCategories((cats ?? []) as CategoryRow[]);
    setCouriers((cour ?? []) as CourierRow[]);
    setWarehouses((wh ?? []) as WarehouseRow[]);
    setPickups((pp ?? []) as PickupRow[]);
    setBanners((bn ?? []) as BannerRow[]);
    setDisputes((dsp ?? []) as DisputeRow[]);
    setPromos((prm ?? []) as PromoRow[]);
    setSettings((stg ?? null) as SettingsRow | null);
    setTickets((tkt ?? []) as TicketRow[]);
    setPackages((pkg ?? []) as AdPackageRow[]);
    setStats({
      users: u ?? 0, products: p ?? 0, orders: orderRows.length,
      revenue: orderRows.reduce((s, o) => s + Number(o.total), 0),
      sellers: roleRows.filter((r) => r.role === "seller").length,
    });
  };

  useEffect(() => { if (isAdmin && unlocked) reload(); }, [isAdmin, unlocked]);

  if (!user) return null;

  if (!unlocked) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-extrabold">Admin paneli — Parol</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Admin panelinə daxil olmaq üçün təhlükəsizlik parolunu daxil edin.</p>
          <form onSubmit={submitPassword} className="space-y-3">
            <input type="password" autoFocus value={pwInput} onChange={(e) => setPwInput(e.target.value)} placeholder="Parol"
              className="w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            {pwError && <div className="text-sm text-destructive">{pwError}</div>}
            <button type="submit" disabled={pwSubmitting || !pwInput}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 transition">
              {pwSubmitting ? "Yoxlanılır..." : "Daxil ol"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const userRoles = (uid: string) => roles.filter((r) => r.user_id === uid).map((r) => r.role);
  const isCustomer = (uid: string) => !userRoles(uid).includes("seller") && !userRoles(uid).includes("admin");

  // ── Mutations ────────────────────────────────────────────────
  const updateOrderStatus = async (id: string, status: string) => {
    const typed = status as "pending" | "paid" | "shipped" | "delivered" | "cancelled";
    const { error } = await supabase.from("orders").update({ status: typed }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status yeniləndi"); setOrders(orders.map((o) => o.id === id ? { ...o, status } : o)); }
  };

  const toggleSeller = async (uid: string, makeSeller: boolean) => {
    if (makeSeller) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "seller" });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "seller");
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Yeniləndi"); reload();
  };

  const toggleProductActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ is_active: !active }).eq("id", id); reload();
  };

  const addCategory = async () => {
    const name = prompt("Kateqoriya adı:");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("categories").insert({ name, slug, sort_order: categories.length });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };
  const deleteCategory = async (id: string) => {
    if (!confirm("Silmək?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); reload(); }
  };

  const addCourier = async () => {
    const full_name = prompt("Kuryerin adı:"); if (!full_name) return;
    const phone = prompt("Telefon:") ?? ""; if (!phone) return;
    const { error } = await supabase.from("couriers").insert({ full_name, phone, vehicle_type: "car", city: "Bakı" });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };
  const toggleCourier = async (id: string, active: boolean) => {
    await supabase.from("couriers").update({ is_active: !active }).eq("id", id); reload();
  };

  const addWarehouse = async () => {
    const name = prompt("Anbar adı:"); if (!name) return;
    const city = prompt("Şəhər:") ?? "Bakı";
    const address = prompt("Ünvan:") ?? "";
    const { error } = await supabase.from("warehouses").insert({ name, city, address, capacity: 1000 });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };

  const addPickup = async () => {
    const name = prompt("PVZ adı:"); if (!name) return;
    const cityList = AZ_CITY_NAMES.join(", ");
    const city = prompt(`Şəhər (mümkün: ${cityList.slice(0, 200)}...):`) ?? "Bakı";
    const address = prompt("Ünvan:") ?? "";
    const phone = prompt("Telefon (opsional):") || null;
    const working_hours = prompt("İş saatları:", "09:00 - 21:00") || "09:00 - 21:00";
    const c = findCity(city);
    const { error } = await supabase.from("pickup_points").insert({
      name, city, address, phone, working_hours, lat: c?.lat ?? null, lng: c?.lng ?? null,
    });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };
  const togglePickup = async (id: string, active: boolean) => {
    await supabase.from("pickup_points").update({ is_active: !active }).eq("id", id); reload();
  };
  const editPickup = async (p: PickupRow) => {
    const name = prompt("PVZ adı:", p.name); if (!name) return;
    const city = prompt("Şəhər:", p.city) ?? p.city;
    const address = prompt("Ünvan:", p.address) ?? p.address;
    const phone = prompt("Telefon:", p.phone ?? "") || null;
    const working_hours = prompt("İş saatları:", p.working_hours) || p.working_hours;
    const numStr = prompt("Punkt nömrəsi (boş qoy avtomatik):", String(p.point_number ?? ""));
    const point_number = numStr && /^\d+$/.test(numStr) ? parseInt(numStr) : p.point_number;
    const c = findCity(city);
    const { error } = await supabase.from("pickup_points")
      .update({ name, city, address, phone, working_hours, point_number, lat: c?.lat ?? null, lng: c?.lng ?? null })
      .eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Yeniləndi"); reload(); }
  };
  const deletePickup = async (id: string) => {
    if (!confirm("PVZ punkt silinsin?")) return;
    const { error } = await supabase.from("pickup_points").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); reload(); }
  };

  const addBanner = async () => {
    const title = prompt("Banner başlığı:"); if (!title) return;
    const image_url = prompt("Şəkil URL (opsional):") || null;
    const link_url = prompt("Link (opsional):") || null;
    const { error } = await supabase.from("banners").insert({ title, image_url, link_url, position: "home_top" });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };
  const toggleBanner = async (id: string, active: boolean) => {
    await supabase.from("banners").update({ is_active: !active }).eq("id", id); reload();
  };
  const deleteBanner = async (id: string) => {
    if (!confirm("Silmək?")) return;
    await supabase.from("banners").delete().eq("id", id); reload();
  };

  const addPromo = async () => {
    const code = prompt("Promokod (məs: WELCOME10):"); if (!code) return;
    const pct = Number(prompt("Endirim %:") ?? "10");
    const { error } = await supabase.from("promo_codes").insert({ code: code.toUpperCase(), discount_percent: pct, min_order: 0 });
    if (error) toast.error(error.message); else { toast.success("Əlavə edildi"); reload(); }
  };
  const togglePromo = async (id: string, active: boolean) => {
    await supabase.from("promo_codes").update({ is_active: !active }).eq("id", id); reload();
  };

  const resolveDispute = async (id: string, decided_for: "buyer" | "seller", compensation = 0) => {
    await supabase.from("disputes").update({ status: "resolved", decided_for, compensation }).eq("id", id);
    toast.success("Mübahisə həll edildi"); reload();
  };

  const updateSettings = async (patch: Partial<SettingsRow>) => {
    if (!settings) return;
    const { error } = await supabase.from("system_settings").update(patch).eq("id", settings.id);
    if (error) toast.error(error.message); else { toast.success("Saxlandı"); reload(); }
  };

  const replyTicket = async (id: string) => {
    const reply = prompt("Cavabınız:"); if (!reply) return;
    await supabase.from("support_tickets").update({ admin_reply: reply, status: "answered" }).eq("id", id);
    toast.success("Cavab göndərildi"); reload();
  };

  // ── Ad packages mutations ────────────────────────────────────
  const savePackage = async (id: string | null, patch: Partial<AdPackageRow>) => {
    if (id) {
      const { error } = await supabase.from("ad_packages").update(patch as never).eq("id", id);
      if (error) { toast.error(error.message); return; }
      toast.success("Paket yeniləndi");
    } else {
      const row = {
        name: patch.name ?? "Yeni paket",
        tier: patch.tier ?? "silver",
        price: patch.price ?? 0,
        duration_days: patch.duration_days ?? 30,
        banner_slots: patch.banner_slots ?? 0,
        sponsored_product_slots: patch.sponsored_product_slots ?? 0,
        features: (patch.features ?? []) as never,
        color: patch.color ?? "#3b82f6",
        is_active: patch.is_active ?? true,
        sort_order: patch.sort_order ?? packages.length,
      };
      const { error } = await supabase.from("ad_packages").insert(row as never);
      if (error) { toast.error(error.message); return; }
      toast.success("Paket yaradıldı");
    }
    reload();
  };
  const deletePackage = async (id: string) => {
    if (!confirm("Bu paketi silmək?")) return;
    const { error } = await supabase.from("ad_packages").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Silindi"); reload(); }
  };
  const togglePackage = async (id: string, active: boolean) => {
    await supabase.from("ad_packages").update({ is_active: !active }).eq("id", id); reload();
  };

  const navItems: PanelNavItem[] = [
    { key: "dashboard", label: "Ana səhifə", icon: LayoutDashboard, active: tab === "dashboard", onClick: () => setTab("dashboard") },
    { key: "customers", label: "Müştərilər", icon: Users, active: tab === "customers", onClick: () => setTab("customers") },
    { key: "sellers", label: "Satıcılar", icon: Store, active: tab === "sellers", onClick: () => setTab("sellers") },
    { key: "couriers", label: "Kuryerlər", icon: Truck, badge: couriers.filter((c) => c.is_active).length, active: tab === "couriers", onClick: () => setTab("couriers") },
    { key: "pvz_staff", label: "PVZ işçiləri", icon: Users, active: tab === "pvz_staff", onClick: () => setTab("pvz_staff") },
    { key: "categories", label: "Kateqoriyalar", icon: LayoutDashboard, active: tab === "categories", onClick: () => setTab("categories") },
    { key: "products", label: "Məhsullar", icon: Package, active: tab === "products", onClick: () => setTab("products") },
    { key: "shops", label: "Mağazalar", icon: Store, active: tab === "shops", onClick: () => setTab("shops") },
    { key: "warehouses", label: "Anbarlar", icon: Warehouse, active: tab === "warehouses", onClick: () => setTab("warehouses") },
    { key: "pickup_points", label: "PVZ nöqtələri", icon: Warehouse, active: tab === "pickup_points", onClick: () => setTab("pickup_points") },
    { key: "orders", label: "Sifarişlər", icon: ShoppingBag, badge: orders.filter((o) => o.status === "pending").length, active: tab === "orders", onClick: () => setTab("orders") },
    { key: "returns", label: "Qaytarmalar", icon: Undo2, active: tab === "returns", onClick: () => setTab("returns") },
    { key: "finance", label: "Maliyyə", icon: DollarSign, active: tab === "finance", onClick: () => setTab("finance") },
    { key: "treasury", label: "Xəzinə (Kassa)", icon: Wallet, active: tab === "treasury", onClick: () => setTab("treasury") },
    { key: "payouts", label: "Ödənişlər (Payout)", icon: Wallet, active: tab === "payouts", onClick: () => setTab("payouts") },
    { key: "marketing", label: "Marketinq", icon: Megaphone, active: tab === "marketing", onClick: () => setTab("marketing") },
    { key: "banners", label: "Bannerlər", icon: Megaphone, active: tab === "banners", onClick: () => setTab("banners") },
    { key: "packages", label: "Reklam paketləri", icon: Crown, active: tab === "packages", onClick: () => setTab("packages") },
    { key: "promo", label: "Promokodlar", icon: Tag, active: tab === "promo", onClick: () => setTab("promo") },
    { key: "analytics", label: "Analitika", icon: BarChart3, active: tab === "analytics", onClick: () => setTab("analytics") },
    { key: "security", label: "Təhlükəsizlik", icon: Lock, active: tab === "security", onClick: () => setTab("security") },
    { key: "disputes", label: "Mübahisələr", icon: Scale, badge: disputes.filter((d) => d.status === "open").length, active: tab === "disputes", onClick: () => setTab("disputes") },
    { key: "content", label: "Kontent", icon: FileText, active: tab === "content", onClick: () => setTab("content") },
    { key: "settings", label: "Sistem ayarları", icon: Settings, active: tab === "settings", onClick: () => setTab("settings") },
    { key: "support", label: "Dəstək", icon: LifeBuoy, badge: tickets.filter((t) => t.status === "open").length, active: tab === "support", onClick: () => setTab("support") },
    { key: "ai_bot", label: "AI Bot", icon: Bot, active: tab === "ai_bot", onClick: () => setTab("ai_bot") },
  ];

  const tabTitle = navItems.find((n) => n.key === tab)?.label ?? "Admin";

  return (
    <PanelLayout title="Admin paneli" subtitle="Mərkəzi idarəetmə" items={navItems}>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-extrabold">{tabTitle}</h1>
      </div>

      {tab === "dashboard" && <DashboardSection stats={stats} orders={orders} couriers={couriers} disputes={disputes} />}
      {tab === "customers" && <CustomersSection profiles={profiles.filter((p) => isCustomer(p.id))} />}
      {tab === "sellers" && <SellersSection profiles={profiles} userRoles={userRoles} toggleSeller={toggleSeller} />}
      {tab === "couriers" && <CouriersSection couriers={couriers} addCourier={addCourier} toggleCourier={toggleCourier} />}
      {tab === "pvz_staff" && <PvzStaffSection />}
      {tab === "categories" && <CategoriesSection categories={categories} addCategory={addCategory} deleteCategory={deleteCategory} />}
      {tab === "products" && <ProductsSection products={products} toggleProductActive={toggleProductActive} />}
      {tab === "shops" && <ShopsSection profiles={profiles} userRoles={userRoles} />}
      {tab === "warehouses" && <WarehousesSection warehouses={warehouses} addWarehouse={addWarehouse} />}
      {tab === "pickup_points" && <PickupSection pickups={pickups} addPickup={addPickup} togglePickup={togglePickup} editPickup={editPickup} deletePickup={deletePickup} />}
      {tab === "orders" && <OrdersSection orders={orders} updateOrderStatus={updateOrderStatus} />}
      {tab === "returns" && <AdminReturnsSection />}
      {tab === "finance" && <FinanceSection stats={stats} orders={orders} settings={settings} />}
      {tab === "treasury" && <AdminTreasury />}
      {tab === "payouts" && <AdminPayouts />}
      {tab === "marketing" && <MarketingSection />}
      {tab === "banners" && <BannersSection banners={banners} addBanner={addBanner} toggleBanner={toggleBanner} deleteBanner={deleteBanner} />}
      {tab === "packages" && <PackagesSection packages={packages} savePackage={savePackage} deletePackage={deletePackage} togglePackage={togglePackage} />}
      {tab === "promo" && <PromoSection promos={promos} addPromo={addPromo} togglePromo={togglePromo} />}
      {tab === "analytics" && <AnalyticsSection products={products} orders={orders} categories={categories} />}
      {tab === "security" && <SecuritySection />}
      {tab === "disputes" && <DisputesSection disputes={disputes} resolveDispute={resolveDispute} />}
      {tab === "content" && <ContentSection />}
      {tab === "settings" && <SettingsSection settings={settings} updateSettings={updateSettings} />}
      {tab === "support" && <SupportSection tickets={tickets} replyTicket={replyTicket} />}
      {tab === "ai_bot" && <AIBotSection />}
    </PanelLayout>
  );
}

// ─────────────────────────────────────────────────────────────────
// Section components
// ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-extrabold mt-1">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-soft flex items-center justify-center text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-secondary/50 text-left">
          <tr>{headers.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ cols, text = "Məlumat yoxdur" }: { cols: number; text?: string }) {
  return <tr><td colSpan={cols} className="p-6 text-center text-muted-foreground">{text}</td></tr>;
}

function DashboardSection({ stats, orders, couriers, disputes }: { stats: Stat; orders: OrderRow[]; couriers: CourierRow[]; disputes: DisputeRow[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayRevenue = orders.filter((o) => new Date(o.created_at) >= today).reduce((s, o) => s + Number(o.total), 0);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthRevenue = orders.filter((o) => new Date(o.created_at) >= monthAgo).reduce((s, o) => s + Number(o.total), 0);
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const activeCouriers = couriers.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Ümumi dövriyyə" value={formatAZN(stats.revenue)} hint={`Bu gün: ${formatAZN(todayRevenue)}`} />
        <StatCard icon={Store} label="Aktiv satıcılar" value={stats.sellers} />
        <StatCard icon={Users} label="Müştərilər" value={stats.users} />
        <StatCard icon={ShoppingBag} label="Sifarişlər" value={stats.orders} hint={`Bu ay: ${formatAZN(monthRevenue)}`} />
        <StatCard icon={Package} label="Məhsullar" value={stats.products} />
        <StatCard icon={Truck} label="Aktiv kuryerlər" value={activeCouriers} />
        <StatCard icon={Scale} label="Açıq mübahisələr" value={openDisputes} />
        <StatCard icon={TrendingUp} label="Real vaxt" value="Online" hint="Sistem normal işləyir" />
      </div>

      {(openDisputes > 0 || stats.users < 1) && (
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-warning">Sistem xəbərdarlıqları</div>
            {openDisputes > 0 && <div>{openDisputes} açıq mübahisə həll gözləyir</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomersSection({ profiles }: { profiles: ProfileRow[] }) {
  return (
    <Table headers={["Ad", "Telefon", "Qoşulma tarixi", "Əməliyyat"]}>
      {profiles.length === 0 ? <EmptyRow cols={4} /> : profiles.map((p) => (
        <tr key={p.id} className="border-t border-border">
          <td className="p-3">{p.full_name ?? "—"}</td>
          <td className="p-3 text-muted-foreground">{p.phone ?? "—"}</td>
          <td className="p-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
          <td className="p-3">
            <button onClick={() => toast.info("Bloklama tezliklə əlavə olunacaq")} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary font-semibold">
              <Ban className="h-3 w-3 inline mr-1" /> Blokla
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function SellersSection({ profiles, userRoles, toggleSeller }: { profiles: ProfileRow[]; userRoles: (uid: string) => string[]; toggleSeller: (uid: string, makeSeller: boolean) => void }) {
  return (
    <Table headers={["Ad", "Mağaza", "Rollar", "Komissiya", "Əməliyyat"]}>
      {profiles.length === 0 ? <EmptyRow cols={5} /> : profiles.map((p) => {
        const r = userRoles(p.id);
        const isSeller = r.includes("seller");
        return (
          <tr key={p.id} className="border-t border-border">
            <td className="p-3">{p.full_name ?? "—"}</td>
            <td className="p-3 text-muted-foreground">{p.shop_name ?? "—"}</td>
            <td className="p-3">
              <div className="flex gap-1 flex-wrap">
                {r.map((role) => <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-gradient-soft text-primary font-semibold">{role}</span>)}
              </div>
            </td>
            <td className="p-3 text-xs">10%</td>
            <td className="p-3">
              <button onClick={() => toggleSeller(p.id, !isSeller)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary font-semibold">
                {isSeller ? "Satıcılıqdan çıxar" : "Satıcı et"}
              </button>
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function CouriersSection({ couriers, addCourier, toggleCourier }: { couriers: CourierRow[]; addCourier: () => void; toggleCourier: (id: string, active: boolean) => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addCourier} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni kuryer
      </button>
      <Table headers={["Ad", "Telefon", "Şəhər", "Reytinq", "Çatdırılma", "Qazanc", "Status"]}>
        {couriers.length === 0 ? <EmptyRow cols={7} text="Hələ kuryer əlavə edilməyib" /> : couriers.map((c) => (
          <tr key={c.id} className="border-t border-border">
            <td className="p-3 font-semibold">{c.full_name}</td>
            <td className="p-3 text-muted-foreground">{c.phone}</td>
            <td className="p-3">{c.city}</td>
            <td className="p-3">⭐ {c.rating}</td>
            <td className="p-3">{c.total_deliveries}</td>
            <td className="p-3">{formatAZN(c.earnings)}</td>
            <td className="p-3">
              <button onClick={() => toggleCourier(c.id, c.is_active)} className={`text-xs px-2 py-1 rounded-full font-semibold ${c.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {c.is_active ? "Aktiv" : "Deaktiv"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

interface PvzStaffRow {
  id: string; full_name: string; phone: string; position: string; is_active: boolean;
  created_at: string; user_id: string | null;
  pickup_point: { id: string; name: string; city: string; address: string; point_number: number | null } | null;
  profile: { full_name: string | null; phone: string | null; voen: string | null } | null;
}

function PvzStaffSection() {
  const [rows, setRows] = useState<PvzStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("pvz_staff")
        .select("id,full_name,phone,position,is_active,created_at,user_id,pickup_point:pickup_points(id,name,city,address,point_number)")
        .order("created_at", { ascending: false });
      const staff = (data ?? []) as unknown as PvzStaffRow[];
      const userIds = staff.map((s) => s.user_id).filter(Boolean) as string[];
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,phone,voen").in("id", userIds);
        const map = new Map((profs ?? []).map((p) => [p.id, p]));
        staff.forEach((s) => { s.profile = s.user_id ? (map.get(s.user_id) as never) ?? null : null; });
      }
      setRows(staff);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-muted-foreground">Yüklənir...</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">PVZ qeydiyyatından keçmiş bütün işçilər və onların məlumatları.</div>
      <Table headers={["Ad", "Telefon", "Vəzifə", "PVZ Punkt", "VÖEN", "Status", "Tarix"]}>
        {rows.length === 0 ? <EmptyRow cols={7} /> : rows.map((s) => (
          <tr key={s.id} className="border-t border-border">
            <td className="p-3 font-semibold">{s.full_name}</td>
            <td className="p-3 text-muted-foreground">{s.phone}</td>
            <td className="p-3 text-xs">{s.position}</td>
            <td className="p-3 text-xs">
              {s.pickup_point ? (
                <div>
                  <div className="font-bold text-primary">#{s.pickup_point.point_number ?? "-"} {s.pickup_point.name}</div>
                  <div className="text-muted-foreground">{s.pickup_point.city} — {s.pickup_point.address}</div>
                </div>
              ) : <span className="text-muted-foreground">—</span>}
            </td>
            <td className="p-3 text-xs text-muted-foreground">{s.profile?.voen ?? "—"}</td>
            <td className="p-3">
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {s.is_active ? "Aktiv" : "Deaktiv"}
              </span>
            </td>
            <td className="p-3 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function CategoriesSection({ categories, addCategory, deleteCategory }: { categories: CategoryRow[]; addCategory: () => void; deleteCategory: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addCategory} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni kateqoriya
      </button>
      <Table headers={["Ikon", "Ad", "Slug", "Sıra", "Əməliyyat"]}>
        {categories.length === 0 ? <EmptyRow cols={5} /> : categories.map((c) => (
          <tr key={c.id} className="border-t border-border">
            <td className="p-3 text-2xl">{c.icon ?? "📁"}</td>
            <td className="p-3 font-semibold">{c.name}</td>
            <td className="p-3 text-xs text-muted-foreground font-mono">{c.slug}</td>
            <td className="p-3">{c.sort_order}</td>
            <td className="p-3">
              <button onClick={() => deleteCategory(c.id)} className="text-xs px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Sil
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function ProductsSection({ products, toggleProductActive }: { products: ProductRow[]; toggleProductActive: (id: string, active: boolean) => void }) {
  return (
    <Table headers={["Məhsul", "Qiymət", "Stok", "Status"]}>
      {products.length === 0 ? <EmptyRow cols={4} /> : products.map((p) => (
        <tr key={p.id} className="border-t border-border">
          <td className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="line-clamp-1">{p.title}</span>
            </div>
          </td>
          <td className="p-3 font-semibold whitespace-nowrap">{formatAZN(p.price)}</td>
          <td className="p-3">{p.stock}</td>
          <td className="p-3">
            <button onClick={() => toggleProductActive(p.id, p.is_active)} className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
              {p.is_active ? "Aktiv" : "Deaktiv"}
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ShopsSection({ profiles, userRoles }: { profiles: ProfileRow[]; userRoles: (uid: string) => string[] }) {
  const shops = profiles.filter((p) => userRoles(p.id).includes("seller") && p.shop_name);
  return (
    <Table headers={["Mağaza", "Sahib", "Reytinq", "Şikayət", "Əməliyyat"]}>
      {shops.length === 0 ? <EmptyRow cols={5} /> : shops.map((s) => (
        <tr key={s.id} className="border-t border-border">
          <td className="p-3 font-semibold">{s.shop_name}</td>
          <td className="p-3 text-muted-foreground">{s.full_name ?? "—"}</td>
          <td className="p-3">⭐ 4.8</td>
          <td className="p-3">0</td>
          <td className="p-3">
            <button onClick={() => toast.info("Tezliklə əlavə olunacaq")} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary font-semibold">
              <Power className="h-3 w-3 inline mr-1" /> Dayandır
            </button>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function WarehousesSection({ warehouses, addWarehouse }: { warehouses: WarehouseRow[]; addWarehouse: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addWarehouse} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni anbar
      </button>
      <Table headers={["Ad", "Şəhər", "Ünvan", "Tutum", "Doluluk"]}>
        {warehouses.length === 0 ? <EmptyRow cols={5} text="Hələ anbar əlavə edilməyib" /> : warehouses.map((w) => {
          const pct = w.capacity > 0 ? Math.round((w.occupied / w.capacity) * 100) : 0;
          return (
            <tr key={w.id} className="border-t border-border">
              <td className="p-3 font-semibold">{w.name}</td>
              <td className="p-3">{w.city}</td>
              <td className="p-3 text-muted-foreground text-xs">{w.address}</td>
              <td className="p-3">{w.capacity}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden min-w-[80px]">
                    <div className={`h-full ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold">{pct}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function PickupSection({ pickups, addPickup, togglePickup, editPickup, deletePickup }: { pickups: PickupRow[]; addPickup: () => void; togglePickup: (id: string, active: boolean) => void; editPickup: (p: PickupRow) => void; deletePickup: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addPickup} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni PVZ
      </button>
      <Table headers={["#", "Ad", "Şəhər", "Ünvan", "İş saatları", "Telefon", "Status", "Əməliyyat"]}>
        {pickups.length === 0 ? <EmptyRow cols={8} /> : pickups.map((p) => (
          <tr key={p.id} className="border-t border-border">
            <td className="p-3 font-mono font-bold text-primary">#{p.point_number ?? "-"}</td>
            <td className="p-3 font-semibold">{p.name}</td>
            <td className="p-3">{p.city}</td>
            <td className="p-3 text-muted-foreground text-xs">{p.address}</td>
            <td className="p-3 text-xs">{p.working_hours}</td>
            <td className="p-3 text-muted-foreground">{p.phone ?? "—"}</td>
            <td className="p-3">
              <button onClick={() => togglePickup(p.id, p.is_active)} className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {p.is_active ? "Aktiv" : "Deaktiv"}
              </button>
            </td>
            <td className="p-3">
              <div className="flex gap-1">
                <button onClick={() => editPickup(p)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold">Düzəliş</button>
                <button onClick={() => deletePickup(p.id)} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold">Sil</button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function OrdersSection({ orders, updateOrderStatus }: { orders: OrderRow[]; updateOrderStatus: (id: string, status: string) => void }) {
  return (
    <Table headers={["№", "Tarix", "Məbləğ", "Status"]}>
      {orders.length === 0 ? <EmptyRow cols={4} /> : orders.map((o) => (
        <tr key={o.id} className="border-t border-border">
          <td className="p-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
          <td className="p-3">{formatDate(o.created_at)}</td>
          <td className="p-3 font-semibold">{formatAZN(o.total)}</td>
          <td className="p-3">
            <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="text-xs px-2 py-1 rounded border border-input bg-background">
              <option value="pending">Gözləyir</option>
              <option value="paid">Ödənildi</option>
              <option value="shipped">Göndərildi</option>
              <option value="delivered">Çatdırıldı</option>
              <option value="cancelled">Ləğv edildi</option>
            </select>
          </td>
        </tr>
      ))}
    </Table>
  );
}

function FinanceSection({ stats, orders, settings }: { stats: Stat; orders: OrderRow[]; settings: SettingsRow | null }) {
  const commission = settings?.commission_percent ?? 10;
  const platformIncome = stats.revenue * (commission / 100);
  const sellerPayout = stats.revenue - platformIncome;
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "delivered").length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Ümumi gəlir" value={formatAZN(stats.revenue)} />
        <StatCard icon={TrendingUp} label="Platform komissiyası" value={formatAZN(platformIncome)} hint={`${commission}%`} />
        <StatCard icon={Store} label="Satıcılara ödəniş" value={formatAZN(sellerPayout)} />
        <StatCard icon={ShoppingBag} label="Ödənilmiş sifarişlər" value={paidOrders} />
        <StatCard icon={AlertTriangle} label="Geri qaytarmalar" value="0" hint="Mock" />
        <StatCard icon={Lock} label="Fırıldaq aşkarı" value="0" hint="Sistem təmiz" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="font-bold mb-3">Vergi hesabatı (cari ay)</div>
        <div className="text-sm text-muted-foreground">ƏDV (18%): <span className="font-semibold text-foreground">{formatAZN(stats.revenue * 0.18)}</span></div>
        <div className="text-sm text-muted-foreground">Mənfəət vergisi: <span className="font-semibold text-foreground">{formatAZN(platformIncome * 0.2)}</span></div>
      </div>
    </div>
  );
}

function MarketingSection() {
  const channels = [
    { name: "Push bildirişlər", icon: Bell, sent: 0, opened: 0 },
    { name: "Email kampaniyalar", icon: FileText, sent: 0, opened: 0 },
    { name: "SMS kampaniyalar", icon: Megaphone, sent: 0, opened: 0 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        {channels.map((c) => (
          <div key={c.name} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <c.icon className="h-5 w-5 text-primary" />
              <button className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold" onClick={() => toast.info("Tezliklə")}>Göndər</button>
            </div>
            <div className="font-bold">{c.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.sent} göndərilib · {c.opened} açılıb</div>
          </div>
        ))}
      </div>
      <div className="bg-muted/30 border border-border rounded-2xl p-4 text-sm text-muted-foreground">
        Bu bölmə hələ tam funksional deyil. Real göndəriş üçün email/SMS provayder inteqrasiyası lazımdır.
      </div>
    </div>
  );
}

function BannersSection({ banners, addBanner, toggleBanner, deleteBanner }: { banners: BannerRow[]; addBanner: () => void; toggleBanner: (id: string, active: boolean) => void; deleteBanner: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addBanner} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni banner
      </button>
      <Table headers={["Şəkil", "Başlıq", "Pozisiya", "Baxış", "Klik", "CTR", "Status", ""]}>
        {banners.length === 0 ? <EmptyRow cols={8} /> : banners.map((b) => {
          const ctr = b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : "0.0";
          return (
            <tr key={b.id} className="border-t border-border">
              <td className="p-3">
                <div className="w-12 h-12 bg-secondary rounded overflow-hidden">
                  {b.image_url && <img src={b.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
              </td>
              <td className="p-3 font-semibold">{b.title}</td>
              <td className="p-3 text-xs">{b.position}</td>
              <td className="p-3">{b.impressions}</td>
              <td className="p-3">{b.clicks}</td>
              <td className="p-3">{ctr}%</td>
              <td className="p-3">
                <button onClick={() => toggleBanner(b.id, b.is_active)} className={`text-xs px-2 py-1 rounded-full font-semibold ${b.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {b.is_active ? "Aktiv" : "Deaktiv"}
                </button>
              </td>
              <td className="p-3">
                <button onClick={() => deleteBanner(b.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function PromoSection({ promos, addPromo, togglePromo }: { promos: PromoRow[]; addPromo: () => void; togglePromo: (id: string, active: boolean) => void }) {
  return (
    <div className="space-y-4">
      <button onClick={addPromo} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Yeni promokod
      </button>
      <Table headers={["Kod", "Endirim", "İstifadə", "Min sifariş", "Status"]}>
        {promos.length === 0 ? <EmptyRow cols={5} /> : promos.map((p) => (
          <tr key={p.id} className="border-t border-border">
            <td className="p-3 font-mono font-bold">{p.code}</td>
            <td className="p-3">{p.discount_percent ? `${p.discount_percent}%` : formatAZN(p.discount_amount ?? 0)}</td>
            <td className="p-3">{p.used_count} / {p.usage_limit ?? "∞"}</td>
            <td className="p-3">{formatAZN(p.min_order)}</td>
            <td className="p-3">
              <button onClick={() => togglePromo(p.id, p.is_active)} className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {p.is_active ? "Aktiv" : "Deaktiv"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function AnalyticsSection({ products, orders, categories }: { products: ProductRow[]; orders: OrderRow[]; categories: CategoryRow[] }) {
  const topProducts = [...products].sort((a, b) => b.price - a.price).slice(0, 5);
  const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Cəmi satış" value={formatAZN(totalSales)} />
        <StatCard icon={Package} label="Aktiv kateqoriya" value={categories.filter((c) => !c.parent_id).length} />
        <StatCard icon={Users} label="Qaytarma faizi" value="2.3%" hint="Mock" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="font-bold mb-3">Ən bahalı 5 məhsul</div>
        <div className="space-y-2">
          {topProducts.length === 0 ? <div className="text-sm text-muted-foreground">Məlumat yoxdur</div> : topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gradient-soft text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="line-clamp-1">{p.title}</span>
              </div>
              <span className="font-semibold">{formatAZN(p.price)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="font-bold mb-3">Ən aktiv bölgələr (Mock)</div>
        {["Bakı", "Sumqayıt", "Gəncə", "Lənkəran"].map((city, i) => {
          const pct = [65, 18, 10, 7][i];
          return (
            <div key={city} className="mb-2">
              <div className="flex justify-between text-sm mb-1"><span>{city}</span><span className="font-semibold">{pct}%</span></div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecuritySection() {
  const items = [
    { icon: AlertTriangle, label: "Şübhəli hesab fəaliyyəti", value: 0, color: "text-warning" },
    { icon: XCircle, label: "Bloklanmış IP-lər", value: 0, color: "text-destructive" },
    { icon: CheckCircle2, label: "2FA aktiv hesablar", value: 0, color: "text-success" },
    { icon: Lock, label: "Aşkarlanan fırıldaqçılıq", value: 0, color: "text-destructive" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.label} className="bg-card border border-border rounded-2xl p-5">
            <it.icon className={`h-6 w-6 ${it.color} mb-3`} />
            <div className="text-sm text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-extrabold mt-1">{it.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="font-bold mb-3">Tövsiyə olunan əməliyyatlar</div>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>✓ Bütün admin hesabları üçün 2FA aktivləşdirin</li>
          <li>✓ Şübhəli IP-ləri avtomatik bloklayın</li>
          <li>✓ Bot fəaliyyətinə görə CAPTCHA tətbiq edin</li>
          <li>✓ Saxta rəyləri AI ilə filtrləyin</li>
        </ul>
      </div>
    </div>
  );
}

function DisputesSection({ disputes, resolveDispute }: { disputes: DisputeRow[]; resolveDispute: (id: string, decided_for: "buyer" | "seller", compensation?: number) => void }) {
  return (
    <Table headers={["Tarix", "Sifariş", "Səbəb", "Status", "Kompensasiya", "Qərar"]}>
      {disputes.length === 0 ? <EmptyRow cols={6} text="Mübahisə yoxdur" /> : disputes.map((d) => (
        <tr key={d.id} className="border-t border-border">
          <td className="p-3 text-xs">{formatDate(d.created_at)}</td>
          <td className="p-3 font-mono text-xs">{d.order_id?.slice(0, 8).toUpperCase() ?? "—"}</td>
          <td className="p-3">{d.reason}</td>
          <td className="p-3">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${d.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{d.status}</span>
          </td>
          <td className="p-3">{d.compensation ? formatAZN(d.compensation) : "—"}</td>
          <td className="p-3">
            {d.status === "open" ? (
              <div className="flex gap-2">
                <button onClick={() => resolveDispute(d.id, "buyer")} className="text-xs px-2 py-1 rounded bg-success/10 text-success font-semibold">Alıcı lehinə</button>
                <button onClick={() => resolveDispute(d.id, "seller")} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-semibold">Satıcı lehinə</button>
              </div>
            ) : <span className="text-xs text-muted-foreground">{d.status}</span>}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function ContentSection() {
  const items = [
    { label: "Ana səhifə bannerleri", action: "Bannerlər bölməsindən idarə edin" },
    { label: "Qaydalar və şərtlər", action: "Tezliklə əlavə olunacaq" },
    { label: "FAQ - Tez verilən suallar", action: "Tezliklə əlavə olunacaq" },
    { label: "Xəbərlər və elanlar", action: "Tezliklə əlavə olunacaq" },
  ];
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">{it.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{it.action}</div>
          </div>
          <button onClick={() => toast.info(it.action)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary font-semibold inline-flex items-center gap-1">
            <Edit3 className="h-3 w-3" /> Redaktə
          </button>
        </div>
      ))}
    </div>
  );
}

function SettingsSection({ settings, updateSettings }: { settings: SettingsRow | null; updateSettings: (patch: Partial<SettingsRow>) => void }) {
  if (!settings) return <div className="text-muted-foreground">Yüklənir...</div>;
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold">Komissiya faizi (%)</label>
          <input type="number" defaultValue={settings.commission_percent} onBlur={(e) => updateSettings({ commission_percent: Number(e.target.value) })}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div>
          <label className="text-sm font-semibold">Çatdırılma əsas tarifi (AZN)</label>
          <input type="number" step="0.1" defaultValue={settings.delivery_base_fee} onBlur={(e) => updateSettings({ delivery_base_fee: Number(e.target.value) })}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div>
          <label className="text-sm font-semibold">Saxlama haqqı / gün (AZN)</label>
          <input type="number" step="0.1" defaultValue={settings.storage_fee_per_day} onBlur={(e) => updateSettings({ storage_fee_per_day: Number(e.target.value) })}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div>
          <label className="text-sm font-semibold">Min ödəniş (satıcı üçün, AZN)</label>
          <input type="number" defaultValue={settings.min_payout} onBlur={(e) => updateSettings({ min_payout: Number(e.target.value) })}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
        </div>
        <div>
          <label className="text-sm font-semibold">💼 Satıcı qeydiyyat haqqı (AZN)</label>
          <input type="number" step="0.5" defaultValue={settings.seller_signup_fee ?? 20} onBlur={(e) => updateSettings({ seller_signup_fee: Number(e.target.value) })}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          <div className="text-xs text-muted-foreground mt-1">Yeni satıcı qeydiyyat zamanı ödəyəcəyi birdəfəlik məbləğ</div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <div className="font-semibold">Texniki xidmət rejimi</div>
            <div className="text-xs text-muted-foreground">Aktiv olduqda saytın əksər funksiyaları dayandırılır</div>
          </div>
          <button onClick={() => updateSettings({ maintenance_mode: !settings.maintenance_mode })}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${settings.maintenance_mode ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`}>
            {settings.maintenance_mode ? "Aktiv" : "Deaktiv"}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="font-bold text-base">📢 Ayrıca ödənişli reklam tarifləri</div>
        <div className="text-xs text-muted-foreground -mt-2">Satıcı paket almadan tək məhsulu və ya mağazasını önə çəkə bilər. Qiymət və müddəti burdan idarə edirsiniz.</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Tək məhsul reklamı qiyməti (AZN)</label>
            <input type="number" step="0.5" defaultValue={settings.single_product_promo_price} onBlur={(e) => updateSettings({ single_product_promo_price: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold">Tək məhsul reklamı müddəti (gün)</label>
            <input type="number" defaultValue={settings.single_product_promo_days} onBlur={(e) => updateSettings({ single_product_promo_days: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold">Mağaza reklamı qiyməti (AZN)</label>
            <input type="number" step="0.5" defaultValue={settings.single_shop_promo_price} onBlur={(e) => updateSettings({ single_shop_promo_price: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold">Mağaza reklamı müddəti (gün)</label>
            <input type="number" defaultValue={settings.single_shop_promo_days} onBlur={(e) => updateSettings({ single_shop_promo_days: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold">🖼️ Banner reklamı qiyməti (AZN)</label>
            <input type="number" step="0.5" defaultValue={settings.single_banner_price ?? 5} onBlur={(e) => updateSettings({ single_banner_price: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="text-sm font-semibold">Banner reklamı müddəti (gün)</label>
            <input type="number" defaultValue={settings.single_banner_days ?? 30} onBlur={(e) => updateSettings({ single_banner_days: Number(e.target.value) })}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background" />
          </div>

        </div>
        <div>
          <label className="text-sm font-semibold">Reklam şərtləri (satıcıya göstərilir)</label>
          <textarea defaultValue={settings.promo_terms_text} onBlur={(e) => updateSettings({ promo_terms_text: e.target.value })}
            rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
      </div>
    </div>
  );
}

function SupportSection({ tickets, replyTicket }: { tickets: TicketRow[]; replyTicket: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={LifeBuoy} label="Açıq müraciətlər" value={tickets.filter((t) => t.status === "open").length} />
        <StatCard icon={CheckCircle2} label="Cavablandırılmış" value={tickets.filter((t) => t.status === "answered").length} />
        <StatCard icon={Users} label="Cəmi" value={tickets.length} />
      </div>
      <Table headers={["Mövzu", "Kateqoriya", "Tarix", "Status", "Əməliyyat"]}>
        {tickets.length === 0 ? <EmptyRow cols={5} /> : tickets.map((t) => (
          <tr key={t.id} className="border-t border-border">
            <td className="p-3 font-semibold">{t.subject}</td>
            <td className="p-3 text-xs">{t.category}</td>
            <td className="p-3 text-xs text-muted-foreground">{formatDate(t.created_at)}</td>
            <td className="p-3">
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${t.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{t.status}</span>
            </td>
            <td className="p-3">
              <button onClick={() => replyTicket(t.id)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary font-semibold">Cavab ver</button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

const TIER_PRESETS = [
  { tier: "silver", label: "Silver", icon: Award, color: "#9ca3af" },
  { tier: "gold", label: "Gold", icon: Star, color: "#f59e0b" },
  { tier: "premium", label: "Premium", icon: Gem, color: "#8b5cf6" },
  { tier: "vip", label: "VIP", icon: Crown, color: "#ef4444" },
];

function PackagesSection({ packages, savePackage, deletePackage, togglePackage }: {
  packages: AdPackageRow[];
  savePackage: (id: string | null, patch: Partial<AdPackageRow>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;
  togglePackage: (id: string, active: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState<AdPackageRow | null>(null);
  const [creating, setCreating] = useState(false);

  const blank: Partial<AdPackageRow> = {
    name: "", tier: "silver", price: 0, duration_days: 30,
    banner_slots: 1, sponsored_product_slots: 5, features: [],
    color: "#9ca3af", is_active: true, sort_order: packages.length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Satıcılara təklif edilən reklam paketlərini özünüz yaradın və qiymət/şərtləri istənilən vaxt dəyişin.
          </p>
        </div>
        <button onClick={() => { setEditing(blank as AdPackageRow); setCreating(true); }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Yeni paket
        </button>
      </div>

      {/* Quick presets */}
      {packages.length === 0 && (
        <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-5">
          <div className="font-bold mb-3">Sürətli başlanğıc — hazır şablonlar:</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TIER_PRESETS.map((t) => (
              <button key={t.tier} onClick={() => { setEditing({
                ...(blank as AdPackageRow),
                name: t.label, tier: t.tier, color: t.color,
                price: t.tier === "silver" ? 19 : t.tier === "gold" ? 49 : t.tier === "premium" ? 99 : 199,
                banner_slots: t.tier === "silver" ? 1 : t.tier === "gold" ? 2 : t.tier === "premium" ? 4 : 8,
                sponsored_product_slots: t.tier === "silver" ? 3 : t.tier === "gold" ? 10 : t.tier === "premium" ? 25 : 60,
                features: t.tier === "silver"
                  ? ["1 banner", "3 sponsorlu məhsul", "Əsas analitika"]
                  : t.tier === "gold"
                    ? ["2 banner", "10 sponsorlu məhsul", "Genişlənmiş analitika", "Email dəstək"]
                    : t.tier === "premium"
                      ? ["4 banner", "25 sponsorlu məhsul", "Top yerləşdirmə", "Prioritet dəstək"]
                      : ["8 banner", "60 sponsorlu məhsul", "Ana səhifə top", "Şəxsi menecer", "API girişi"],
              } as AdPackageRow); setCreating(true); }}
                className="text-left p-4 rounded-xl border-2 border-border hover:border-primary hover:shadow-card transition group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: t.color }}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div className="font-black">{t.label}</div>
                </div>
                <div className="text-xs text-muted-foreground">Şablon ilə başla</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {packages.map((p) => {
          const features = Array.isArray(p.features) ? (p.features as string[]) : [];
          const preset = TIER_PRESETS.find((t) => t.tier === p.tier);
          const Icon = preset?.icon ?? Award;
          return (
            <div key={p.id} className="rounded-2xl border-2 border-border bg-card overflow-hidden hover:shadow-elegant transition flex flex-col">
              <div className="p-4 text-white relative" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6" />
                    <div className="font-black text-lg">{p.name}</div>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full">{p.tier}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black">{p.price}</span>
                  <span className="text-sm opacity-90">₼ / {p.duration_days} gün</span>
                </div>
              </div>
              <div className="p-4 space-y-2 flex-1">
                <div className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{p.banner_slots}</span> banner ·{" "}
                  <span className="font-bold text-foreground">{p.sponsored_product_slots}</span> sponsorlu məhsul
                </div>
                {features.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2">
                <button onClick={() => { setEditing(p); setCreating(false); }}
                  className="flex-1 text-xs px-2 py-2 rounded-lg border border-border hover:bg-secondary font-semibold inline-flex items-center justify-center gap-1">
                  <Edit3 className="h-3.5 w-3.5" /> Redaktə
                </button>
                <button onClick={() => togglePackage(p.id, p.is_active)}
                  className={`text-xs px-2 py-2 rounded-lg font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {p.is_active ? "Aktiv" : "Deaktiv"}
                </button>
                <button onClick={() => deletePackage(p.id)}
                  className="text-xs p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <PackageEditor
          pkg={editing}
          isNew={creating}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await savePackage(creating ? null : editing.id, patch);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PackageEditor({ pkg, isNew, onClose, onSave }: {
  pkg: AdPackageRow;
  isNew: boolean;
  onClose: () => void;
  onSave: (patch: Partial<AdPackageRow>) => Promise<void>;
}) {
  const [form, setForm] = useState<AdPackageRow>(pkg);
  const features = Array.isArray(form.features) ? (form.features as string[]) : [];
  const setFeature = (i: number, v: string) => {
    const next = [...features]; next[i] = v;
    setForm({ ...form, features: next });
  };
  const addFeature = () => setForm({ ...form, features: [...features, ""] });
  const removeFeature = (i: number) => setForm({ ...form, features: features.filter((_, idx) => idx !== i) });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h3 className="text-xl font-black">{isNew ? "Yeni reklam paketi" : "Paketi redaktə et"}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><XCircle className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Paket adı">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" placeholder="Silver / Gold / VIP..." />
            </Field>
            <Field label="Tier (səviyyə)">
              <select value={form.tier} onChange={(e) => {
                const preset = TIER_PRESETS.find((t) => t.tier === e.target.value);
                setForm({ ...form, tier: e.target.value, color: preset?.color ?? form.color });
              }} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                {TIER_PRESETS.map((t) => <option key={t.tier} value={t.tier}>{t.label}</option>)}
                <option value="custom">Xüsusi</option>
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Qiymət (₼)">
              <input type="number" min={0} value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </Field>
            <Field label="Müddət (gün)">
              <input type="number" min={1} value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </Field>
            <Field label="Rəng">
              <input type="color" value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 px-1 rounded-lg border border-input bg-background" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Banner sayı">
              <input type="number" min={0} value={form.banner_slots}
                onChange={(e) => setForm({ ...form, banner_slots: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </Field>
            <Field label="Sponsorlu məhsul sayı">
              <input type="number" min={0} value={form.sponsored_product_slots}
                onChange={(e) => setForm({ ...form, sponsored_product_slots: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold">Şərtlər və üstünlüklər</label>
              <button type="button" onClick={addFeature} className="text-xs px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/70 font-bold inline-flex items-center gap-1">
                <Plus className="h-3 w-3" /> Əlavə et
              </button>
            </div>
            <div className="space-y-2">
              {features.length === 0 && <div className="text-xs text-muted-foreground">Hələ şərt əlavə edilməyib.</div>}
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <input value={f} onChange={(e) => setFeature(i, e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm"
                    placeholder="Məsələn: 24/7 dəstək" />
                  <button onClick={() => removeFeature(i)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" />
            Aktiv (satıcılar görə bilər)
          </label>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-secondary font-bold">Ləğv et</button>
          <button onClick={() => onSave(form)}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────
// AI Bot Section
// ─────────────────────────────────────────────────────────────────
interface AISettingsRow {
  id: string;
  enabled: boolean;
  enabled_shop: boolean;
  enabled_pvz: boolean;
  enabled_dispute: boolean;
  enabled_support: boolean;
  model: string;
  system_prompt_shop: string;
  system_prompt_pvz: string;
  system_prompt_dispute: string;
  system_prompt_support: string;
}
interface FaqRow {
  id: string; category: string; question: string; answer: string;
  audience: string; is_active: boolean; sort_order: number;
}

function AIBotSection() {
  const [settings, setSettings] = useState<AISettingsRow | null>(null);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [newFaq, setNewFaq] = useState({ category: "general", question: "", answer: "", audience: "buyer" });

  const load = async () => {
    const [{ data: s }, { data: f }] = await Promise.all([
      supabase.from("ai_settings").select("*").limit(1).maybeSingle(),
      supabase.from("faq_items").select("*").order("sort_order", { ascending: true }),
    ]);
    setSettings(s as AISettingsRow);
    setFaqs((f ?? []) as FaqRow[]);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("ai_settings").update({
      enabled: settings.enabled, enabled_shop: settings.enabled_shop,
      enabled_pvz: settings.enabled_pvz, enabled_dispute: settings.enabled_dispute,
      enabled_support: settings.enabled_support, model: settings.model,
      system_prompt_shop: settings.system_prompt_shop,
      system_prompt_pvz: settings.system_prompt_pvz,
      system_prompt_dispute: settings.system_prompt_dispute,
      system_prompt_support: settings.system_prompt_support,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("AI ayarları yeniləndi");
  };

  const addFaq = async () => {
    if (newFaq.question.trim().length < 3 || newFaq.answer.trim().length < 3) {
      toast.error("Sual və cavab daxil edin"); return;
    }
    const { error } = await supabase.from("faq_items").insert({ ...newFaq, sort_order: faqs.length });
    if (error) toast.error(error.message);
    else { toast.success("FAQ əlavə olundu"); setNewFaq({ category: "general", question: "", answer: "", audience: "buyer" }); load(); }
  };
  const deleteFaq = async (id: string) => {
    if (!confirm("Silinsin?")) return;
    await supabase.from("faq_items").delete().eq("id", id); load();
  };
  const toggleFaq = async (id: string, val: boolean) => {
    await supabase.from("faq_items").update({ is_active: !val }).eq("id", id); load();
  };

  if (!settings) return <div>Yüklənir…</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">AI Asistent ayarları</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {([
            ["enabled", "AI Aktiv (ümumi)"],
            ["enabled_shop", "Müştəri → Satıcı chat"],
            ["enabled_pvz", "Müştəri → PVZ chat"],
            ["enabled_dispute", "Mübahisə chat"],
            ["enabled_support", "Ümumi dəstək (support)"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg cursor-pointer">
              <span className="font-semibold text-sm">{label}</span>
              <input type="checkbox" checked={(settings as any)[k]}
                onChange={(e) => setSettings({ ...settings, [k]: e.target.checked } as AISettingsRow)}
                className="w-5 h-5" />
            </label>
          ))}
          <label className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg">
            <span className="font-semibold whitespace-nowrap text-sm">Model:</span>
            <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    className="flex-1 h-9 px-2 rounded border border-input bg-background text-sm">
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="openai/gpt-5-mini">GPT-5 Mini</option>
              <option value="openai/gpt-5">GPT-5</option>
            </select>
          </label>
        </div>

        <details className="bg-secondary/20 rounded-lg p-3 mb-3">
          <summary className="font-semibold cursor-pointer text-sm">Sistem promptları (genişlət)</summary>
          <div className="space-y-3 mt-3">
            {(["shop", "pvz", "dispute", "support"] as const).map((k) => (
              <div key={k}>
                <div className="text-xs font-bold text-muted-foreground mb-1">{k.toUpperCase()} prompt</div>
                <textarea value={(settings as any)[`system_prompt_${k}`]}
                  onChange={(e) => setSettings({ ...settings, [`system_prompt_${k}`]: e.target.value } as AISettingsRow)}
                  rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-y" />
              </div>
            ))}
          </div>
        </details>

        <button onClick={saveSettings} disabled={saving}
          className="bg-primary text-primary-foreground px-5 h-10 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
          {saving ? "Saxlanır..." : "Ayarları saxla"}
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">FAQ — AI bilik bazası ({faqs.length})</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-2 mb-3">
          <select value={newFaq.category} onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
            <option value="general">Ümumi</option><option value="order">Sifariş</option>
            <option value="payment">Ödəniş</option><option value="delivery">Çatdırılma</option>
            <option value="return">Qaytarma</option><option value="seller">Satıcı</option>
            <option value="pvz">PVZ</option><option value="bonus">Bonus</option>
          </select>
          <select value={newFaq.audience} onChange={(e) => setNewFaq({ ...newFaq, audience: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
            <option value="all">Hamı</option><option value="buyer">Müştəri</option>
            <option value="seller">Satıcı</option><option value="pvz">PVZ</option>
          </select>
          <input placeholder="Sual" value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                 className="md:col-span-2 h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <textarea placeholder="Cavab" value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                    rows={2} className="md:col-span-3 px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
          <button onClick={addFaq} className="bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 inline-flex items-center justify-center gap-1">
            <Plus className="h-4 w-4" /> Əlavə et
          </button>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {faqs.map((f) => (
            <div key={f.id} className="bg-secondary/30 border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{f.category}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-secondary rounded-full">{f.audience}</span>
                  {!f.is_active && <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">deaktiv</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleFaq(f.id, f.is_active)} className="p-1.5 hover:bg-secondary rounded">
                    <Power className={`h-4 w-4 ${f.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => deleteFaq(f.id)} className="p-1.5 hover:bg-rose-50 rounded">
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              </div>
              <div className="font-semibold text-sm">{f.question}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.answer}</div>
            </div>
          ))}
          {faqs.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">FAQ əlavə edin</div>}
        </div>
      </div>
    </div>
  );
}

interface AdminReturnRow {
  id: string; pickup_code: string | null; reason: string; status: string;
  cost_paid_by: string; images: string[]; pvz_received_at: string | null;
  created_at: string; buyer_id: string; seller_id: string; buyer_explanation: string | null;
  order_items: { title: string } | null;
}

function AdminReturnsSection() {
  const [list, setList] = useState<AdminReturnRow[]>([]);
  useEffect(() => {
    supabase.from("returns")
      .select("id,pickup_code,reason,status,cost_paid_by,images,pvz_received_at,created_at,buyer_id,seller_id,buyer_explanation,order_items(title)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setList((data ?? []) as unknown as AdminReturnRow[]));
  }, []);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 overflow-x-auto">
      <div className="font-bold mb-3">Bütün qaytarmalar ({list.length})</div>
      {list.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">Qaytarma yoxdur</div> : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground border-b">
            <th className="p-2">Kod</th><th>Məhsul</th><th>Səbəb</th><th>Xərc</th><th>PVZ</th><th>Status</th><th>Tarix</th>
          </tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2 font-mono text-xs">{r.pickup_code}</td>
              <td className="text-xs">{r.order_items?.title ?? "—"}</td>
              <td className="text-xs">{r.reason}</td>
              <td className="text-xs">{r.cost_paid_by === "seller" ? "Satıcı" : "Müştəri"}</td>
              <td className="text-xs">{r.pvz_received_at ? "✓" : "—"}</td>
              <td><span className="text-[10px] px-2 py-0.5 rounded bg-secondary">{r.status}</span></td>
              <td className="text-[10px]">{formatDate(r.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
