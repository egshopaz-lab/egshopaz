import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import {
  Users, Package, ShoppingBag, DollarSign, Shield, LayoutDashboard,
  Truck, Warehouse, Store, Megaphone, BarChart3, Lock, Scale,
  FileText, Settings, LifeBuoy, AlertTriangle, TrendingUp, Plus, Trash2,
  CheckCircle2, XCircle, Power, Ban, Edit3, Bell, Tag, Crown, Gem, Star, Award, Bot, Sparkles, Undo2, Wallet, History, ListChecks,
} from "lucide-react";
import { AdminPayouts } from "@/components/AdminPayouts";
import { AdminTreasury } from "@/components/AdminTreasury";
import { AdminAdvertisingPackages } from "@/components/AdminAdvertisingPackages";
import { AdminTrends } from "@/components/AdminTrends";
import { AdminDashboardStats } from "@/components/AdminDashboardStats";
import { AdminAccountManagement } from "@/components/AdminAccountManagement";
import { AdminAuditLog } from "@/components/AdminAuditLog";
import { AdminDeliveryManagement } from "@/components/AdminDeliveryManagement";
import { AdminBannerManager } from "@/components/AdminBannerManager";
import { AdminCategoryManager } from "@/components/AdminCategoryManager";
import { AdminOperationsCenter } from "@/components/AdminOperationsCenter";
import { AdminShopManagement } from "@/components/AdminShopManagement";
import { AdminMessageReports } from "@/components/AdminMessageReports";
import { AdminFinanceCenter } from "@/components/AdminFinanceCenter";
import { toast } from "sonner";
import { PanelLayout, type PanelNavItem } from "@/components/PanelLayout";
import { AZ_CITY_NAMES, findCity } from "@/lib/azCities";

type TabKey =
  | "dashboard" | "operations" | "customers" | "sellers" | "couriers" | "deliveries" | "pvz_staff"
  | "categories" | "products" | "shops" | "warehouses" | "pickup_points"
  | "orders" | "returns" | "finance" | "treasury" | "payouts" | "marketing" | "banners" | "packages" | "trends" | "promo" | "analytics"
  | "security" | "audit" | "disputes" | "message_reports" | "content" | "settings" | "support" | "ai_bot";

interface Stat { users: number; products: number; orders: number; revenue: number; sellers: number }
interface ProfileRow { id: string; full_name: string | null; shop_name: string | null; created_at: string; phone: string | null }
interface RoleRow { user_id: string; role: string }
interface OrderRow { id: string; total: number; status: string; payment_status: string | null; created_at: string; buyer_id: string }
interface ProductRow { id: string; title: string; price: number; stock: number; is_active: boolean; seller_id: string; image_url: string | null; category_id: string | null }
interface CategoryRow { id: string; name: string; slug: string; icon: string | null; sort_order: number; parent_id: string | null }
interface CourierRow { id: string; full_name: string; phone: string; vehicle_type: string; city: string; is_active: boolean; rating: number; total_deliveries: number; earnings: number }
interface WarehouseRow { id: string; name: string; city: string; address: string; capacity: number; occupied: number; manager_name: string | null; is_active: boolean }
interface PickupRow { id: string; name: string; city: string; address: string; phone: string | null; is_active: boolean; working_hours: string; point_number: number | null }
interface BannerRow { id: string; title: string; image_url: string | null; link_url: string | null; position: string; is_active: boolean; clicks: number; impressions: number }
interface DisputeRow { id: string; order_id: string | null; buyer_id: string; seller_id: string | null; reason: string; status: string; compensation: number | null; created_at: string }
interface PromoRow { id: string; code: string; discount_percent: number | null; discount_amount: number | null; is_active: boolean; used_count: number; usage_limit: number | null; min_order: number }
interface SettingsRow { id: string; commission_percent: number; delivery_base_fee: number; delivery_confirmation_hours: number; storage_fee_per_day: number; maintenance_mode: boolean; min_payout: number; single_product_promo_price: number; single_product_promo_days: number; single_shop_promo_price: number; single_shop_promo_days: number; single_banner_price: number; single_banner_days: number; slot_product_fee: number; slot_shop_fee: number; slot_banner_fee: number; promo_terms_text: string; seller_signup_fee: number; acquisition_source_enabled: boolean; acquisition_source_required: boolean; seller_phone_otp_required: boolean }
interface TicketRow { id: string; subject: string; category: string; status: string; user_id: string; created_at: string; admin_reply: string | null }
interface AdPackageRow {
  id: string; name: string; tier: string; price: number; duration_days: number;
  banner_slots: number; sponsored_product_slots: number; features: string[] | unknown;
  color: string; is_active: boolean; sort_order: number;
}
interface AdminPermissionRow {
  role_key: string;
  permissions: string[];
  is_active: boolean;
}

export function AdminPanel() {
  const { user, isAdmin, loading, signOut } = useAuth();
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
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("admin_panel_unlocked") === "1";
  });
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (!loading && user && !isAdmin) {
      void signOut().then(() => navigate({ to: "/login", replace: true }));
    }
  }, [user, isAdmin, loading, navigate, signOut]);

  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    void (supabase as any).from("admin_staff_permissions").select("role_key,permissions,is_active").eq("admin_id", user.id).maybeSingle()
      .then(({ data, error }: { data: AdminPermissionRow | null; error: unknown }) => {
        if (error) {
          setAdminPermissions([]);
          return;
        }
        if (!data) {
          setAdminPermissions(["*"]);
          return;
        }
        if (data.is_active === false) {
          setAdminPermissions([]);
          return;
        }
        setAdminPermissions(data.role_key === "super_admin" ? ["*"] : (data.permissions ?? []));
      });
  }, [isAdmin, user?.id]);

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
    const results = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("id,total,status,payment_status,created_at,buyer_id", { count: "exact" }).order("created_at", { ascending: false }).limit(200),
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
    const [
      { count: u }, { count: p }, { data: os, count: orderCount }, { data: pr }, { data: rs },
      { data: prod }, { data: cats }, { data: cour }, { data: wh },
      { data: pp }, { data: bn }, { data: dsp }, { data: prm }, { data: stg }, { data: tkt }, { data: pkg },
    ] = results;
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) {
      toast.error(`Admin məlumatları tam yüklənmədi: ${firstError.message}`);
    }
    const orderRows = (os ?? []) as OrderRow[];
    const paidOrderRows = orderRows.filter((order) =>
      ["paid", "success", "completed"].includes(String(order.payment_status ?? "").toLowerCase())
      || ["paid", "completed"].includes(String(order.status).toLowerCase()),
    );
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
      users: u ?? 0, products: p ?? 0, orders: orderCount ?? orderRows.length,
      revenue: paidOrderRows.reduce((s, o) => s + Number(o.total), 0),
      sellers: roleRows.filter((r) => r.role === "seller").length,
    });
  };

  useEffect(() => { if (isAdmin && unlocked) reload(); }, [isAdmin, unlocked]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-[calc(100dvh-56px)] items-center justify-center bg-background" aria-busy="true" aria-label="Admin paneli yüklənir">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/brand/eg-icon.svg" alt="EG Shop" className="h-14 w-14 animate-pulse" />
          <p className="text-sm font-medium text-muted-foreground">Admin paneli yüklənir...</p>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-120px)] w-full max-w-md items-center px-4 py-8 sm:py-12">
        <div className="w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
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
    const { error } = await supabase.from("products").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Məhsul statusu yeniləndi"); reload(); }
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
    const { error } = await supabase.from("couriers").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Kuryer statusu yeniləndi"); reload(); }
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
    const { error } = await supabase.from("pickup_points").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("PVZ statusu yeniləndi"); reload(); }
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
    const { error } = await supabase.from("banners").update({ is_active: !active }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Banner statusu yeniləndi"); reload(); }
  };
  const deleteBanner = async (id: string) => {
    if (!confirm("Silmək?")) return;
    const { error } = await supabase.from("banners").delete().eq…15688 tokens truncated…ame="flex-1 text-xs px-2 py-2 rounded-lg border border-border hover:bg-secondary font-semibold inline-flex items-center justify-center gap-1">
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

