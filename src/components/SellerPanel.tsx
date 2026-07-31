import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SellerReturns } from "@/components/SellerReturns";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime, formatDate } from "@/lib/format";
import { playNotificationSound, prepareNotificationSound } from "@/lib/notificationSound";
import {
  Package,
  ShoppingBag,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  X,
  Upload,
  Store,
  TrendingUp,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  MessageCircle,
  QrCode,
  Download,
  Megaphone,
  LifeBuoy,
  BarChart3,
  FileSpreadsheet,
  Bell,
  Check,
  Undo2,
  Rocket,
  Users,
  BadgeCheck,
  Heart,
  Calendar,
  Star,
  Wallet,
  Boxes,
  UserRound,
  PackageX,
  AlertTriangle,
  Blocks,
} from "lucide-react";
import { SellerBalance } from "@/components/SellerBalance";
import { toast } from "sonner";
import { z } from "zod";
import QRCode from "qrcode";
import { PanelLayout, type PanelNavItem } from "@/components/PanelLayout";
import { SellerMessages } from "@/components/SellerMessages";
import { SellerAdvertising } from "@/components/SellerAdvertising";
import { SellerTrends } from "@/components/SellerTrends";
import { SellerFollowers } from "@/components/SellerFollowers";
import { SellerAnalytics } from "@/components/SellerAnalytics";
import { BulkProductUpload } from "@/components/BulkProductUpload";
import { AISupportChat } from "@/components/AISupportChat";
import { CitySelect } from "@/components/CitySelect";
import { CategoryCascade } from "@/components/CategoryCascade";
import { findCity } from "@/lib/azCities";
import { DateRangeFilter, emptyRange, inRange, type DateRange } from "@/components/DateRangeFilter";
import { SellerExternalDelivery } from "@/components/SellerExternalDelivery";
import { SellerInventory } from "@/components/SellerInventory";
import { SellerCustomers } from "@/components/SellerCustomers";
import { SellerDashboardProfessional } from "@/components/SellerDashboardProfessional";
import { BusinessModuleSelector } from "@/components/BusinessModuleSelector";
import { SellerReservations } from "@/components/SellerReservations";
import { isReservationModule } from "@/lib/reservations";
import { ProductVariantEditor } from "@/components/ProductVariantEditor";
import type { ProductAttributeValue, ProductVariantValue } from "@/lib/productAttributes";
import {
  SellerNotificationCenter,
  type SellerNotificationItem,
} from "@/components/SellerNotificationCenter";
import {
  SellerOrdersWorkspace,
  type SellerOrderFilter,
  type SellerOrderItemRecord,
} from "@/components/SellerOrdersWorkspace";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Product {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  stock: number;
  image_url: string | null;
  images: string[];
  is_active: boolean;
  category_id: string | null;
  brand: string | null;
  description: string | null;
  sku: string | null;
  barcode?: string | null;
  min_stock?: number | null;
  attributes?: Record<string, ProductAttributeValue> | null;
  variants?: ProductVariantValue[] | null;
  stock_updated_at?: string | null;
  weight: number | null;
  rating: number;
  reviews_count: number;
  delivery_days_min?: number | null;
  delivery_days_max?: number | null;
  delivery_city?: string | null;
  free_shipping?: boolean | null;
  fast_delivery?: boolean | null;
  condition?: string | null;
  color?: string | null;
  size?: string | null;
  is_giveaway?: boolean | null;
  video_url?: string | null;
  video_duration?: number | null;
}
interface Category {
  id: string;
  name: string;
  name_ru?: string | null;
  name_en?: string | null;
  slug?: string | null;
  parent_id: string | null;
  icon?: string | null;
}

function getCategoryContext(categories: Category[], categoryId: string | null | undefined) {
  if (!categoryId) return "";
  const values: string[] = [];
  const visited = new Set<string>();
  let current = categories.find((category) => category.id === categoryId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    values.push(current.name, current.name_ru ?? "", current.name_en ?? "", current.slug ?? "");
    current = current.parent_id
      ? categories.find((category) => category.id === current?.parent_id)
      : undefined;
  }
  return values.filter(Boolean).join(" ");
}
interface OrderItem {
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
interface Profile {
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  shop_description: string | null;
  shop_logo_url: string | null;
  shop_banner_url: string | null;
  shop_address: string | null;
  shop_city: string | null;
  shop_email: string | null;
  iban: string | null;
  bank_name: string | null;
  card_number: string | null;
  account_holder: string | null;
  payout_method: string | null;
  created_at?: string | null;
}

type OrderViewFilter =
  | "all"
  | "paid"
  | "pending"
  | "preparing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "returned";
type ProductViewFilter = "all" | "active" | "low_stock" | "out_of_stock";
interface SellerNotif {
  id: string;
  title: string;
  body: string;
  type: string;
  pickup_code: string | null;
  is_read: boolean;
  created_at: string;
}

const productSchema = z.object({
  title: z.string().trim().min(8, "BaĹźlÄ±q minimum 8 simvol olmalÄ±dÄ±r").max(200),
  price: z.number().min(0.01, "QiymÉ™t 0-dan bĂ¶yĂĽk olmalÄ±dÄ±r").max(1000000),
  old_price: z.number().min(0).max(1000000).nullable(),
  stock: z.number().int().min(0).max(100000),
  brand: z.string().trim().min(2, "Marka daxil edilmÉ™lidir").max(100),
  sku: z.string().trim().max(50),
  barcode: z.string().trim().max(80),
  min_stock: z.number().int().min(0).max(100000),
  description: z.string().trim().min(40, "TÉ™svir minimum 40 simvol olmalÄ±dÄ±r").max(2000),
  category_id: z.string().uuid("Kateqoriya seĂ§ilmÉ™lidir"),
  weight: z.number().min(0).max(10000).nullable(),
});

const ORDER_STATUSES = [
  { v: "pending", l: "Yeni sifariĹź", c: "bg-warning/10 text-warning" },
  { v: "preparing", l: "HazÄ±rlanÄ±r", c: "bg-warning/10 text-warning" },
  { v: "packed", l: "PaketlÉ™ndi", c: "bg-purple-500/10 text-purple-600" },
  { v: "shipped", l: "GĂ¶ndÉ™rildi", c: "bg-primary/10 text-primary" },
  { v: "handed_to_courier", l: "KuryerÉ™ tÉ™hvil", c: "bg-primary/10 text-primary" },
  { v: "in_transit", l: "Ă‡atdÄ±rÄ±lÄ±r", c: "bg-primary/10 text-primary" },
  { v: "delivered", l: "MĂĽĹźtÉ™riyÉ™ tÉ™hvil", c: "bg-success/10 text-success" },
  { v: "completed", l: "TamamlandÄ±", c: "bg-success/10 text-success" },
  { v: "disputed", l: "MĂĽbahisÉ™dÉ™", c: "bg-destructive/10 text-destructive" },
  { v: "returned", l: "Geri qaytarÄ±ldÄ±", c: "bg-warning/10 text-warning" },
  { v: "cancelled", l: "LÉ™Äźv edildi", c: "bg-destructive/10 text-destructive" },
];

export function SellerPanel() {
  const { user, isSeller, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<
    | "dashboard"
    | "products"
    | "orders"
    | "messages"
    | "advertising"
    | "trends"
    | "balance"
    | "analytics"
    | "bulk"
    | "shop"
    | "support"
    | "returns"
    | "followers"
    | "inventory"
    | "customers"
    | "notifications"
    | "business_modules"
    | "reservations"
  >(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("trends_payment")
      ? "trends"
      : typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("section") &&
          [
            "dashboard",
            "products",
            "orders",
            "messages",
            "advertising",
            "balance",
            "analytics",
            "bulk",
            "shop",
            "support",
            "returns",
            "followers",
            "inventory",
            "customers",
            "notifications",
            "business_modules",
            "reservations",
          ].includes(new URLSearchParams(window.location.search).get("section")!)
        ? (new URLSearchParams(window.location.search).get("section") as any)
        : "dashboard",
  );

  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [sellerNotifs, setSellerNotifs] = useState<SellerNotif[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [ordersDateRange, setOrdersDateRange] = useState<DateRange>(emptyRange);
  const [orderViewFilter, setOrderViewFilter] = useState<OrderViewFilter>("all");
  const [productViewFilter, setProductViewFilter] = useState<ProductViewFilter>("all");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelLoading, setPanelLoading] = useState(true);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [myFollowers, setMyFollowers] = useState(0);
  const [selectedModuleCodes, setSelectedModuleCodes] = useState<string[]>([]);
  const [businessModulesLoading, setBusinessModulesLoading] = useState(true);
  const [businessModulesError, setBusinessModulesError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedOnceRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tab === "dashboard") url.searchParams.delete("section");
    else url.searchParams.set("section", tab);
    window.history.replaceState({ section: tab }, "", url);
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const section = new URLSearchParams(window.location.search).get("section");
      if (section) setTab(section as typeof tab);
      else setTab("dashboard");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openSection = (section: typeof tab) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (section === "dashboard") url.searchParams.delete("section");
      else url.searchParams.set("section", section);
      window.history.pushState({ section }, "", url);
    }
    setTab(section);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
    if (!authLoading && user && !isSeller) navigate({ to: "/become-seller" });
  }, [user, isSeller, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    if (!loadedOnceRef.current) setPanelLoading(true);
    setPanelError(null);
    const loadAllOrderItems = async () => {
      const pageSize = 1000;
      const rows: unknown[] = [];
      for (let from = 0; ; from += pageSize) {
        const result = await supabase
          .from("order_items")
          .select(
            "id,title,price,quantity,image_url,order_id,status,product_id,pickup_code,customer_name,customer_phone,accepted_at,delivered_at,pickup_point_id",
          )
          .eq("seller_id", user.id)
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);
        if (result.error) return { data: null, error: result.error };
        rows.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < pageSize) break;
      }
      return { data: rows, error: null };
    };
    const [
      { data: ps, error: productsError },
      { data: cs, error: categoriesError },
      { data: ois, error: itemsError },
      { data: pr, error: profileError },
      { count: followersCount },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,name_ru,name_en,slug,parent_id,icon")
        .order("sort_order"),
      loadAllOrderItems(),
      supabase
        .from("profiles")
        .select(
          "full_name,shop_name,phone,avatar_url,shop_description,shop_logo_url,shop_banner_url,shop_address,shop_city,shop_email,iban,bank_name,card_number,account_holder,payout_method,created_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("shop_followers")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id),
    ]);
    const firstError = productsError ?? categoriesError ?? itemsError ?? profileError;
    if (firstError) {
      toast.error(`MÉ™lumat yĂĽklÉ™nmÉ™di: ${firstError.message}`);
      setPanelError(firstError.message);
      setPanelLoading(false);
      return;
    }
    const rawItems = (ois ?? []) as unknown as OrderItem[];
    const orderIds = [...new Set(rawItems.map((i) => i.order_id))];
    const { data: orderRows, error: ordersError } = orderIds.length
      ? await supabase
          .from("orders")
          .select("id,pickup_point_id,recipient_name,recipient_phone,created_at,payment_status")
          .in("id", orderIds)
      : { data: [], error: null };
    if (ordersError) {
      toast.error(`SifariĹź mÉ™lumatÄ± yĂĽklÉ™nmÉ™di: ${ordersError.message}`);
      setPanelError(ordersError.message);
      setPanelLoading(false);
      return;
    }
    const orderMap = new Map((orderRows ?? []).map((o) => [o.id, o]));
    const pickupIds = [
      ...new Set(
        rawItems
          .map((i) => i.pickup_point_id ?? orderMap.get(i.order_id)?.pickup_point_id)
          .filter(Boolean),
      ),
    ] as string[];
    const { data: pickupRows, error: pickupError } = pickupIds.length
      ? await supabase
          .from("pickup_points")
          .select("id,name,city,address,point_number,working_hours")
          .in("id", pickupIds)
      : { data: [], error: null };
    if (pickupError) {
      toast.error(`PVZ mÉ™lumatÄ± yĂĽklÉ™nmÉ™di: ${pickupError.message}`);
      setPanelError(pickupError.message);
      setPanelLoading(false);
      return;
    }
    const pickupMap = new Map((pickupRows ?? []).map((p) => [p.id, p]));
    setProducts((ps ?? []) as unknown as Product[]);
    setCategories((cs ?? []) as Category[]);
    setOrderItems(
      rawItems
        .map((item) => {
          const order = orderMap.get(item.order_id);
          const pickupPointId = item.pickup_point_id ?? order?.pickup_point_id ?? null;
          return {
            ...item,
            customer_name: item.customer_name ?? order?.recipient_name ?? null,
            customer_phone: item.customer_phone ?? order?.recipient_phone ?? null,
            order_created_at: order?.created_at ?? null,
            order_payment_status: order?.payment_status ?? null,
            pickup_point: pickupPointId
              ? ((pickupMap.get(pickupPointId) as OrderItem["pickup_point"]) ?? null)
              : null,
          };
        })
        .sort((a, b) => {
          const aDate = orderMap.get(a.order_id)?.created_at ?? "";
          const bDate = orderMap.get(b.order_id)?.created_at ?? "";
          return bDate.localeCompare(aDate);
        }),
    );
    setProfile(
      (pr as Profile) ?? {
        full_name: "",
        shop_name: "",
        phone: "",
        avatar_url: "",
        shop_description: "",
        shop_logo_url: "",
        shop_banner_url: "",
        shop_address: "",
        shop_city: "",
        shop_email: "",
        iban: "",
        bank_name: "",
        card_number: "",
        account_holder: "",
        payout_method: "iban",
      },
    );
    setMyFollowers(followersCount ?? 0);
    loadedOnceRef.current = true;
    setPanelLoading(false);
  };
  useEffect(() => {
    if (user && isSeller) load();
  }, [user, isSeller]);

  useEffect(() => {
    if (!user || !isSeller) return;
    let cancelled = false;
    setBusinessModulesLoading(true);
    setBusinessModulesError(null);

    (supabase as any)
      .from("seller_business_modules")
      .select("module_code")
      .eq("seller_id", user.id)
      .then(
        ({
          data,
          error,
        }: {
          data: Array<{ module_code: string }> | null;
          error: { message: string } | null;
        }) => {
          if (cancelled) return;
          if (error) {
            setBusinessModulesError(error.message);
            setBusinessModulesLoading(false);
            return;
          }
          setSelectedModuleCodes((data ?? []).map((row) => row.module_code));
          setBusinessModulesLoading(false);
        },
      );

    return () => {
      cancelled = true;
    };
  }, [user, isSeller]);

  useEffect(() => {
    if (!user || !isSeller) return;
    const ch = supabase
      .channel(`seller-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `seller_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const changed = payload.new as Partial<OrderItem> & { id?: string };
            if (changed.id) {
              setOrderItems((current) =>
                current.map((item) => (item.id === changed.id ? { ...item, ...changed } : item)),
              );
              return;
            }
          }
          void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isSeller]);

  useEffect(() => {
    if (!user || !isSeller) return;
    const loadNotifs = () => {
      supabase
        .from("notifications")
        .select("id,title,body,type,pickup_code,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data }) => setSellerNotifs((data ?? []) as SellerNotif[]));
    };
    loadNotifs();
    const ch = supabase
      .channel(`seller-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        loadNotifs,
  …22731 tokens truncated…    <input
                    value={editing.sku ?? ""}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                    maxLength={50}
                    placeholder="ART-001"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Barkod</label>
                  <input
                    value={editing.barcode ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, barcode: e.target.value.replace(/\s/g, "") })
                    }
                    maxLength={80}
                    placeholder="8691234567890"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Minimum stok xÉ™bÉ™rdarlÄ±ÄźÄ±</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editing.min_stock ?? 5}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        min_stock: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Ă‡É™ki (kq)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={editing.weight ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        weight: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="0"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold">Kateqoriya *</label>
                <p className="mb-2 text-xs text-muted-foreground">KateqoriyanÄ± É™vvÉ™l seĂ§in â€” uyÄźun xĂĽsusiyyÉ™t vÉ™ variant sahÉ™lÉ™ri avtomatik hazÄ±rlanacaq.</p>
                <CategoryCascade
                  categories={categories}
                  value={editing.category_id ?? null}
                  onChange={(id: string | null) => setEditing({ ...editing, category_id: id })}
                />
              </div>

              <div className="hidden border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm">MÉ™hsul variantlarÄ±</h4>
                    <p className="text-xs text-muted-foreground">
                      RÉ™ng, Ă¶lĂ§ĂĽ vÉ™ ya baĹźqa seĂ§imlÉ™r ĂĽĂ§ĂĽn ayrÄ±ca SKU, stok vÉ™ qiymÉ™t yaradÄ±n.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        variants: [
                          ...(editing.variants ?? []),
                          {
                            attributes: { color: "" },
                            name: "RÉ™ng",
                            value: "",
                            sku: "",
                            stock: 0,
                            price: Number(editing.price ?? 0),
                          },
                        ],
                      })
                    }
                    className="px-3 py-2 rounded-lg bg-secondary text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 inline mr-1" /> Variant É™lavÉ™ et
                  </button>
                </div>
                {(editing.variants ?? []).map((variant, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 rounded-lg bg-secondary/40"
                  >
                    <input
                      value={variant.name}
                      onChange={(e) => {
                        const next = [...(editing.variants ?? [])];
                        next[index] = { ...variant, name: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="Tip: RÉ™ng"
                      className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
                    />
                    <input
                      value={variant.value}
                      onChange={(e) => {
                        const next = [...(editing.variants ?? [])];
                        next[index] = { ...variant, value: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="DÉ™yÉ™r: Qara"
                      className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
                    />
                    <input
                      value={variant.sku ?? ""}
                      onChange={(e) => {
                        const next = [...(editing.variants ?? [])];
                        next[index] = { ...variant, sku: e.target.value };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="SKU"
                      className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      value={variant.stock ?? 0}
                      onChange={(e) => {
                        const next = [...(editing.variants ?? [])];
                        next[index] = {
                          ...variant,
                          stock: Math.max(0, parseInt(e.target.value, 10) || 0),
                        };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="Stok"
                      className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={variant.price ?? ""}
                      onChange={(e) => {
                        const next = [...(editing.variants ?? [])];
                        next[index] = {
                          ...variant,
                          price: Math.max(0, Number(e.target.value) || 0),
                        };
                        setEditing({ ...editing, variants: next });
                      }}
                      placeholder="QiymÉ™t"
                      className="h-9 px-2 rounded-lg border border-input bg-background text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          variants: (editing.variants ?? []).filter(
                            (_, variantIndex) => variantIndex !== index,
                          ),
                        })
                      }
                      className="h-9 rounded-lg text-destructive hover:bg-destructive/10"
                      title="VariantÄ± sil"
                    >
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>

              <ProductVariantEditor
                categoryContext={getCategoryContext(categories, editing.category_id)}
                basePrice={Number(editing.price ?? 0)}
                attributes={editing.attributes ?? {}}
                variants={editing.variants ?? []}
                onAttributesChange={(attributes) => setEditing({ ...editing, attributes })}
                onVariantsChange={(variants) => setEditing({
                  ...editing,
                  variants,
                  stock: variants.length
                    ? variants.filter((variant) => variant.is_active !== false).reduce((total, variant) => total + Number(variant.stock || 0), 0)
                    : editing.stock,
                })}
              />

              <div className="hidden">
                <label className="text-sm font-semibold">Kateqoriya</label>
                <CategoryCascade
                  categories={categories}
                  value={editing.category_id ?? null}
                  onChange={(id: string | null) => setEditing({ ...editing, category_id: id })}
                />
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  đźšš Ă‡atdÄ±rÄ±lma ĹźÉ™rtlÉ™ri
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Min gĂĽn</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={editing.delivery_days_min ? String(editing.delivery_days_min) : ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          delivery_days_min:
                            e.target.value === "" ? 1 : parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="1"
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Max gĂĽn</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={editing.delivery_days_max ? String(editing.delivery_days_max) : ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          delivery_days_max:
                            e.target.value === "" ? 3 : parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="3"
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Ă‡atdÄ±rÄ±lma ĹźÉ™hÉ™ri
                  </label>
                  <CitySelect
                    value={editing.delivery_city ?? "BakÄ±"}
                    onChange={(v) => setEditing({ ...editing, delivery_city: v })}
                    className="mt-1 w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:border-primary">
                    <input
                      type="checkbox"
                      checked={!!editing.free_shipping}
                      onChange={(e) => setEditing({ ...editing, free_shipping: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-semibold">đź†“ Pulsuz Ă§atdÄ±rÄ±lma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:border-primary">
                    <input
                      type="checkbox"
                      checked={!!editing.fast_delivery}
                      onChange={(e) => setEditing({ ...editing, fast_delivery: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-semibold">âšˇ 24 saat É™rzindÉ™</span>
                  </label>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground">VÉ™ziyyÉ™ti</label>
                  <select
                    value={editing.condition ?? "new"}
                    onChange={(e) => setEditing({ ...editing, condition: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                  >
                    <option value="new">Yeni</option>
                    <option value="used">Ä°ĹźlÉ™nmiĹź</option>
                  </select>
                </div>
                <label className="mt-3 flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 border-warning/40 bg-warning/5 hover:border-warning">
                  <input
                    type="checkbox"
                    checked={!!editing.is_giveaway}
                    onChange={(e) => setEditing({ ...editing, is_giveaway: e.target.checked })}
                    className="w-4 h-4 accent-warning"
                  />
                  <span className="text-sm font-bold">
                    đźŽ UduĹźlu mÉ™hsul (Ă¶n sÉ™hifÉ™dÉ™ xĂĽsusi bĂ¶lmÉ™dÉ™ gĂ¶rĂĽnsĂĽn)
                  </span>
                </label>
              </div>

              <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
                <strong>Admin yoxlamasÄ±:</strong> mÉ™hsul yadda saxlandÄ±qdan sonra yoxlamaya
                gĂ¶ndÉ™rilÉ™cÉ™k vÉ™ yalnÄ±z tÉ™sdiqdÉ™n sonra kataloqda gĂ¶rĂĽnÉ™cÉ™k.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 h-11 border border-border rounded-lg font-bold hover:bg-secondary"
                >
                  LÉ™Äźv et
                </button>
                <button
                  onClick={save}
                  disabled={uploading}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60"
                >
                  Yadda saxla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {qrProduct && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setQrProduct(null)}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">MÉ™hsul QR kodu</h3>
              <button onClick={() => setQrProduct(null)} className="p-1 hover:bg-secondary rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{qrProduct.title}</p>
            {qrDataUrl && (
              <div className="bg-white p-4 rounded-xl flex items-center justify-center mb-4">
                <img src={qrDataUrl} alt="QR" className="w-full max-w-[280px]" />
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-4 break-all bg-secondary/50 p-2 rounded">
              {window.location.origin}/product/{qrProduct.id}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={downloadQR}
                className="flex-1 min-w-[120px] bg-primary text-primary-foreground px-3 py-2 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center justify-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" /> PNG yĂĽklÉ™
              </button>
              <button
                onClick={() => {
                  if (!qrProduct || !qrDataUrl) return;
                  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${qrProduct.title}</title>
<style>
  @page { size: 80mm 100mm; margin: 3mm; }
  * { box-sizing: border-box; font-family: -apple-system, system-ui, Arial, sans-serif; }
  body { margin: 0; padding: 4mm; }
  .lbl { border: 2px solid #000; padding: 4mm; height: 92mm; display:flex; flex-direction:column; align-items:center; text-align:center; }
  .t { font-weight: 800; font-size: 12pt; line-height: 1.25; margin-bottom: 2mm; }
  .b { font-size: 9pt; color: #666; margin-bottom: 2mm; }
  .p { font-size: 18pt; font-weight: 900; margin: 2mm 0; }
  .qr { margin: auto 0; } .qr img { width: 45mm; height: 45mm; }
  .sku { font-family: monospace; font-size: 9pt; margin-top: 2mm; }
  @media print { .noprint { display:none; } }
  .btn { background:#000; color:#fff; border:0; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:700; }
</style></head><body>
<div class="noprint" style="text-align:center;margin-bottom:8px;"><button class="btn" onclick="window.print()">đź–¨ď¸Ź Ă‡ap et</button></div>
<div class="lbl">
  <div class="t">${qrProduct.title}</div>
  ${qrProduct.brand ? `<div class="b">${qrProduct.brand}</div>` : ""}
  <div class="p">${Number(qrProduct.price).toFixed(2)} â‚Ľ</div>
  <div class="qr"><img src="${qrDataUrl}" alt="QR"/></div>
  ${qrProduct.sku ? `<div class="sku">SKU: ${qrProduct.sku}</div>` : ""}
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
                  const w = window.open("", "_blank", "width=380,height=520");
                  if (!w) {
                    toast.error("Pop-up bloklanÄ±b");
                    return;
                  }
                  w.document.write(html);
                  w.document.close();
                }}
                className="flex-1 min-w-[120px] bg-secondary text-foreground px-3 py-2 rounded-lg font-bold hover:bg-secondary/80 inline-flex items-center justify-center gap-2 text-sm"
              >
                <QrCode className="h-4 w-4" /> Etiket Ă§ap et
              </button>
              <button
                onClick={() => setQrProduct(null)}
                className="px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm"
              >
                BaÄźla
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  );
}

