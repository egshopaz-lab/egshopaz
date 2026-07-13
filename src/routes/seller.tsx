import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SellerReturns } from "@/components/SellerReturns";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime, formatDate } from "@/lib/format";
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
} from "lucide-react";
import { SellerBalance } from "@/components/SellerBalance";
import { toast } from "sonner";
import { z } from "zod";
import QRCode from "qrcode";
import { PanelLayout, type PanelNavItem } from "@/components/PanelLayout";
import { SellerMessages } from "@/components/SellerMessages";
import { SellerAdvertising } from "@/components/SellerAdvertising";
import { SellerFollowers } from "@/components/SellerFollowers";
import { SellerAnalytics } from "@/components/SellerAnalytics";
import { BulkProductUpload } from "@/components/BulkProductUpload";
import { AISupportChat } from "@/components/AISupportChat";
import { CitySelect } from "@/components/CitySelect";
import { CategoryCascade } from "@/components/CategoryCascade";
import { findCity } from "@/lib/azCities";
import { DateRangeFilter, emptyRange, inRange, type DateRange } from "@/components/DateRangeFilter";

export const Route = createFileRoute("/seller")({
  head: () => ({ meta: [{ title: "Satıcı paneli — EG Shop" }] }),
  component: SellerPanel,
});

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
  title: z.string().trim().min(2, "Başlıq minimum 2 simvol").max(200),
  price: z.number().min(0.01, "Qiymət 0-dan böyük olmalıdır").max(1000000),
  old_price: z.number().min(0).max(1000000).nullable(),
  stock: z.number().int().min(0).max(100000),
  brand: z.string().trim().max(100),
  sku: z.string().trim().max(50),
  description: z.string().trim().max(2000),
  category_id: z.string().uuid().nullable(),
  weight: z.number().min(0).max(10000).nullable(),
});

const ORDER_STATUSES = [
  { v: "pending", l: "Gözləyir", c: "bg-warning/10 text-warning" },
  { v: "packed", l: "Paketləndi", c: "bg-purple-500/10 text-purple-600" },
  { v: "shipped", l: "Göndərildi", c: "bg-primary/10 text-primary" },
  { v: "delivered", l: "Çatdırıldı", c: "bg-success/10 text-success" },
  { v: "cancelled", l: "Ləğv edildi", c: "bg-destructive/10 text-destructive" },
];

function SellerPanel() {
  const { user, isSeller, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<
    | "dashboard"
    | "products"
    | "orders"
    | "messages"
    | "advertising"
    | "balance"
    | "analytics"
    | "bulk"
    | "shop"
    | "support"
    | "returns"
    | "followers"
  >("dashboard");

  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [sellerNotifs, setSellerNotifs] = useState<SellerNotif[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [ordersDateRange, setOrdersDateRange] = useState<DateRange>(emptyRange);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [myFollowers, setMyFollowers] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { role: "seller" } as never });
    if (!authLoading && user && !isSeller) navigate({ to: "/become-seller" });
  }, [user, isSeller, authLoading, navigate]);


  const load = async () => {
    if (!user) return;
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
      supabase.from("categories").select("id,name,name_ru,name_en,slug,parent_id,icon").order("sort_order"),
      supabase
        .from("order_items")
        .select(
          "id,title,price,quantity,image_url,order_id,status,product_id,pickup_code,customer_name,customer_phone,accepted_at,delivered_at,pickup_point_id",
        )
        .eq("seller_id", user.id)
        .order("id", { ascending: false })
        .limit(100),
      supabase
        .from("profiles")
        .select(
          "full_name,shop_name,phone,avatar_url,shop_description,shop_logo_url,shop_banner_url,shop_address,shop_city,shop_email,iban,bank_name,card_number,account_holder,payout_method,created_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("shop_followers").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
    ]);
    const firstError = productsError ?? categoriesError ?? itemsError ?? profileError;
    if (firstError) {
      toast.error(`Məlumat yüklənmədi: ${firstError.message}`);
      return;
    }
    const rawItems = (ois ?? []) as unknown as OrderItem[];
    const orderIds = [...new Set(rawItems.map((i) => i.order_id))];
    const { data: orderRows, error: ordersError } = orderIds.length
      ? await supabase
          .from("orders")
          .select("id,pickup_point_id,recipient_name,recipient_phone,created_at")
          .in("id", orderIds)
      : { data: [], error: null };
    if (ordersError) {
      toast.error(`Sifariş məlumatı yüklənmədi: ${ordersError.message}`);
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
      toast.error(`PVZ məlumatı yüklənmədi: ${pickupError.message}`);
      return;
    }
    const pickupMap = new Map((pickupRows ?? []).map((p) => [p.id, p]));
    setProducts((ps ?? []) as unknown as Product[]);
    setCategories((cs ?? []) as Category[]);
    setOrderItems(
      rawItems.map((item) => {
        const order = orderMap.get(item.order_id);
        const pickupPointId = item.pickup_point_id ?? order?.pickup_point_id ?? null;
        return {
          ...item,
          customer_name: item.customer_name ?? order?.recipient_name ?? null,
          customer_phone: item.customer_phone ?? order?.recipient_phone ?? null,
          order_created_at: order?.created_at ?? null,
          pickup_point: pickupPointId
            ? ((pickupMap.get(pickupPointId) as OrderItem["pickup_point"]) ?? null)
            : null,
        };
      }).sort((a, b) => {
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
  };
  useEffect(() => {
    if (user && isSeller) load();
  }, [user, isSeller]);

  useEffect(() => {
    if (!user || !isSeller) return;
    const ch = supabase
      .channel(`seller-orders-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `seller_id=eq.${user.id}` },
        load,
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
        .limit(20)
        .then(({ data }) => setSellerNotifs((data ?? []) as SellerNotif[]));
    };
    loadNotifs();
    const ch = supabase
      .channel(`seller-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        loadNotifs,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isSeller]);

  // Unread messages counter (with realtime)
  useEffect(() => {
    if (!user || !isSeller) return;
    const refreshUnread = () => {
      supabase
        .from("shop_messages")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("sender_role", "buyer")
        .is("read_at", null)
        .then(({ count }) => setUnreadMsgs(count ?? 0));
    };
    refreshUnread();
    const ch = supabase
      .channel(`seller-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shop_messages", filter: `seller_id=eq.${user.id}` },
        refreshUnread,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, isSeller]);

  if (!mounted || authLoading || !user || !isSeller) return null;

  const totalRevenue = orderItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const totalOrders = new Set(orderItems.map((i) => i.order_id)).size;
  const pendingOrders = orderItems.filter((i) => i.status === "pending").length;
  const lowStock = products.filter((p) => p.stock < 5 && p.is_active).length;
  const unreadSellerNotifs = sellerNotifs.filter((n) => !n.is_read).length;

  const uploadImages = async (files: FileList | null) => {
    if (!files || !user || !editing) return;
    setUploading(true);
    const newImages: string[] = [...(editing.images ?? [])];
    for (const file of Array.from(files)) {
      if (newImages.length >= 10) {
        toast.error("Maksimum 10 şəkil yükləyə bilərsiniz");
        break;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} 5MB-dan böyükdür`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} şəkil deyil`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      newImages.push(data.publicUrl);
    }
    setEditing({
      ...editing,
      images: newImages,
      image_url: editing.image_url || newImages[0] || null,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (url: string) => {
    if (!editing) return;
    const imgs = (editing.images ?? []).filter((i) => i !== url);
    setEditing({
      ...editing,
      images: imgs,
      image_url: editing.image_url === url ? (imgs[0] ?? null) : editing.image_url,
    });
  };

  const uploadVideo = async (file: File | null | undefined) => {
    if (!file || !user || !editing) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video 50MB-dan böyük ola bilməz");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Yalnız video fayl yükləyin");
      return;
    }
    // Check duration client-side
    const duration = await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(Math.round(v.duration));
      v.onerror = () => resolve(0);
      v.src = URL.createObjectURL(file);
    });
    if (duration > 60) {
      toast.error(`Video ${duration} saniyədir. Maksimum 60 saniyə olmalıdır.`);
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/videos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing({ ...editing, video_url: data.publicUrl, video_duration: duration });
    setUploading(false);
    toast.success("Video yükləndi");
  };

  const save = async () => {
    if (!user || !editing) return;
    const payload = {
      title: (editing.title ?? "").trim(),
      price: Number(editing.price ?? 0),
      old_price: editing.old_price ? Number(editing.old_price) : null,
      stock: Number(editing.stock ?? 0),
      brand: (editing.brand ?? "").trim(),
      sku: (editing.sku ?? "").trim(),
      description: (editing.description ?? "").trim(),
      category_id: editing.category_id ?? null,
      weight: editing.weight ? Number(editing.weight) : null,
    };
    const v = productSchema.safeParse(payload);
    if (!v.success) {
      toast.error(v.error.issues[0].message);
      return;
    }

    const images = editing.images ?? [];
    const data = {
      ...payload,
      images,
      image_url: editing.image_url || images[0] || null,
      brand: payload.brand || null,
      sku: payload.sku || null,
      description: payload.description || null,
      seller_id: user.id,
      is_active: editing.is_active ?? true,
      delivery_days_min: editing.delivery_days_min != null ? Number(editing.delivery_days_min) : 1,
      delivery_days_max: editing.delivery_days_max != null ? Number(editing.delivery_days_max) : 3,
      delivery_city: editing.delivery_city || "Bakı",
      free_shipping: !!editing.free_shipping,
      fast_delivery: !!editing.fast_delivery,
      condition: editing.condition || "new",
      is_giveaway: !!editing.is_giveaway,
      video_url: editing.video_url ?? null,
      video_duration: editing.video_duration ?? null,
    };

    if (editing.id) {
      const { error } = await supabase.from("products").update(data).eq("id", editing.id);
      if (error) {
        console.error("Product update error:", error);
        toast.error("Yadda saxlanmadı: " + (error.message || "naməlum xəta"));
        return;
      }
      toast.success("Yeniləndi");
    } else {
      const { error } = await supabase.from("products").insert(data);
      if (error) {
        console.error("Product insert error:", error);
        toast.error("Əlavə olunmadı: " + (error.message || "naməlum xəta"));
        return;
      }
      toast.success("Məhsul əlavə olundu");
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu məhsul silinsin? Bu əməliyyat geri qaytarıla bilməz.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Silinmədi: " + error.message);
      return;
    }
    toast.success("Məhsul silindi");
    load();
  };

  const promote = async (p: Product) => {
    if (!user) return;
    const raw = window.prompt(`"${p.title}" məhsulunu neçə gün irəli çəkmək istəyirsiniz? (1-30)`, "7");
    if (!raw) return;
    const days = Math.min(30, Math.max(1, parseInt(raw, 10) || 0));
    if (days < 1) { toast.error("Düzgün gün sayı daxil edin"); return; }
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("sponsored_products").insert({
      product_id: p.id,
      seller_id: user.id,
      position: "catalog_top",
      ends_at: endsAt,
      is_active: true,
    });
    if (error) { toast.error("Reklam yaradılmadı: " + error.message); return; }
    toast.success(`✨ "${p.title}" ${days} gün irəli çəkildi!`);
  };

  const openQR = async (p: Product) => {
    const url = `${window.location.origin}/product/${p.id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
    setQrProduct(p);
  };

  const downloadQR = () => {
    if (!qrDataUrl || !qrProduct) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${qrProduct.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
    a.click();
  };

  const toggleActive = async (p: Product) => {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const updateOrderStatus = async (item: OrderItem, status: string) => {
    if (item.accepted_at || item.delivered_at) {
      toast.error("PVZ qəbulundan sonra statusu yalnız PVZ dəyişə bilər");
      return;
    }
    const { error } = await supabase.from("order_items").update({ status }).eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status yeniləndi");
      load();
    }
  };

  const printShippingLabel = async (item: OrderItem) => {
    const pickupCode = item.pickup_code ?? "—";
    const qrDataUrl = await QRCode.toDataURL(pickupCode, { width: 320, margin: 1 });
    const orderCode = item.order_id.slice(0, 8).toUpperCase();
    const shopName = profile?.shop_name ?? "Mağaza";
    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    const customerName = escapeHtml(item.customer_name?.trim() || "—");
    const customerPhone = escapeHtml(item.customer_phone?.trim() || "—");
    const safeShopName = escapeHtml(shopName);
    const safeTitle = escapeHtml(item.title);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiket ${orderCode}</title>
<style>
  @page { size: 100mm 150mm; margin: 4mm; }
  * { box-sizing: border-box; font-family: -apple-system, system-ui, Arial, sans-serif; }
  body { margin: 0; padding: 6mm; color: #000; }
  .label { border: 2px solid #000; padding: 6mm; height: 138mm; display: flex; flex-direction: column; }
  .top { display:flex; justify-content:space-between; border-bottom: 1px dashed #999; padding-bottom: 4mm; margin-bottom: 4mm;}
  .shop { font-weight: 800; font-size: 14pt; }
  .code { font-family: monospace; font-weight: 800; font-size: 12pt; }
  .title { font-size: 13pt; font-weight: 700; margin: 3mm 0; line-height: 1.3; }
  .customer { border: 2px solid #000; padding: 3mm; margin: 2mm 0 3mm; font-size: 12pt; line-height: 1.45; }
  .customer .head { font-weight: 900; font-size: 11pt; text-transform: uppercase; margin-bottom: 1mm; }
  .customer b { font-size: 14pt; }
  .row { display:flex; justify-content:space-between; font-size: 11pt; margin: 2mm 0; }
  .qr { text-align:center; margin-top: auto; }
  .qr img { width: 55mm; height: 55mm; }
  .pickup { font-family: monospace; font-size: 18pt; font-weight: 800; letter-spacing: 3px; margin-top: 2mm; }
  .qr-cap { font-size: 9pt; color: #555; margin-top: 1mm; }
  .price { font-size: 16pt; font-weight: 800; }
  .footer { border-top: 1px dashed #999; padding-top: 3mm; margin-top: 3mm; font-size: 9pt; color: #555; text-align:center; }
  @media print { .noprint { display:none; } }
  .btn { background:#000; color:#fff; border:0; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:700; }
</style></head><body>
<div class="noprint" style="text-align:center;margin-bottom:8px;">
  <button class="btn" onclick="window.print()">🖨️ Çap et</button>
</div>
<div class="label">
  <div class="top">
    <div class="shop">📦 ${safeShopName}</div>
    <div class="code">#${orderCode}</div>
  </div>
  <div class="customer">
    <div class="head">Müştəri məlumatları</div>
    <div>Ad soyad: <b>${customerName}</b></div>
    <div>Telefon: <b>${customerPhone}</b></div>
  </div>
  <div class="title">${safeTitle}</div>
  <div class="row"><span>Say:</span><b>${item.quantity} ədəd</b></div>
  <div class="row"><span>Cəmi:</span><span class="price">${(Number(item.price) * item.quantity).toFixed(2)} ₼</span></div>
  <div class="qr">
    <img src="${qrDataUrl}" alt="QR"/>
    <div class="pickup">${pickupCode}</div>
    <div class="qr-cap">PVZ qəbul kodu</div>
  </div>
  <div class="footer">EG Shop · ${formatDate(new Date())}</div>
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) {
      toast.error("Pop-up bloklanıb. İcazə verin.");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const saveShop = async () => {
    if (!user || !profile) return;
    const ibanClean = (profile.iban ?? "").replace(/\s/g, "").toUpperCase();
    if (ibanClean && !/^AZ\d{2}[A-Z0-9]{20}$/.test(ibanClean)) {
      toast.error("IBAN formatı yanlışdır (məs: AZ21NABZ00000000137010001944)");
      return;
    }
    const cardClean = (profile.card_number ?? "").replace(/\s/g, "");
    if (cardClean && !/^\d{13,19}$/.test(cardClean)) {
      toast.error("Kart nömrəsi yanlışdır");
      return;
    }
    setSavingShop(true);
    const c = findCity(profile.shop_city);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        shop_name: profile.shop_name?.slice(0, 100) ?? null,
        full_name: profile.full_name?.slice(0, 100) ?? null,
        phone: profile.phone?.slice(0, 20) ?? null,
        avatar_url: profile.avatar_url ?? null,
        shop_description: profile.shop_description?.slice(0, 1000) ?? null,
        shop_logo_url: profile.shop_logo_url ?? null,
        shop_banner_url: profile.shop_banner_url ?? null,
        shop_address: profile.shop_address?.slice(0, 300) ?? null,
        shop_city: profile.shop_city?.slice(0, 100) ?? null,
        shop_email: profile.shop_email?.slice(0, 200) ?? null,
        shop_lat: c?.lat ?? null,
        shop_lng: c?.lng ?? null,
        iban: ibanClean || null,
        bank_name: profile.bank_name?.slice(0, 100) ?? null,
        card_number: cardClean || null,
        account_holder: profile.account_holder?.slice(0, 100) ?? null,
        payout_method: profile.payout_method ?? "iban",
      },
      { onConflict: "id" },
    );
    if (error) toast.error(error.message);
    else toast.success("Mağaza məlumatları yadda saxlanıldı");
    setSavingShop(false);
  };

  const uploadShopImage = async (file: File, field: "shop_logo_url" | "shop_banner_url") => {
    if (!user || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Şəkil 5MB-dan böyükdür");
      return;
    }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/shop-${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setProfile({ ...profile, [field]: data.publicUrl });
    toast.success("Yükləndi");
  };

  const navItems: PanelNavItem[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: tab === "dashboard",
      onClick: () => setTab("dashboard"),
    },
    {
      key: "products",
      label: "Məhsullar",
      icon: Package,
      badge: products.length,
      active: tab === "products",
      onClick: () => setTab("products"),
    },
    {
      key: "bulk",
      label: "Toplu yükləmə",
      icon: FileSpreadsheet,
      active: tab === "bulk",
      onClick: () => setTab("bulk"),
    },
    {
      key: "orders",
      label: "Sifarişlər",
      icon: ShoppingBag,
      badge: pendingOrders,
      active: tab === "orders",
      onClick: () => setTab("orders"),
    },
    {
      key: "returns",
      label: "Qaytarmalar",
      icon: Undo2,
      active: tab === "returns",
      onClick: () => setTab("returns"),
    },
    {
      key: "notifications",
      label: "Bildirişlər",
      icon: Bell,
      badge: unreadSellerNotifs,
      active: tab === "dashboard",
      onClick: () => setTab("dashboard"),
    },
    {
      key: "analytics",
      label: "Analitika",
      icon: BarChart3,
      active: tab === "analytics",
      onClick: () => setTab("analytics"),
    },
    {
      key: "messages",
      label: "Mesajlar",
      icon: MessageCircle,
      badge: unreadMsgs,
      active: tab === "messages",
      onClick: () => setTab("messages"),
    },
    {
      key: "advertising",
      label: "Reklam & Paketlər",
      icon: Megaphone,
      active: tab === "advertising",
      onClick: () => setTab("advertising"),
    },
    {
      key: "followers",
      label: "İzləyicilər",
      icon: Users,
      active: tab === "followers",
      onClick: () => setTab("followers"),
    },
    {
      key: "balance",
      label: "Balansım",
      icon: Wallet,
      active: tab === "balance",
      onClick: () => setTab("balance"),
    },
    {
      key: "shop",
      label: "Mağaza ayarları",
      icon: Settings,
      active: tab === "shop",
      onClick: () => setTab("shop"),
    },
    {
      key: "support",
      label: "AI Dəstək",
      icon: LifeBuoy,
      active: tab === "support",
      onClick: () => setTab("support"),
    },
  ];

  return (
    <PanelLayout title="Satıcı paneli" subtitle={profile?.shop_name ?? "Mağazam"} items={navItems}>
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: DollarSign, label: "Ümumi gəlir", value: formatAZN(totalRevenue) },
              { icon: ShoppingBag, label: "Sifarişlər", value: totalOrders },
              {
                icon: Package,
                label: "Aktiv məhsullar",
                value: products.filter((p) => p.is_active).length,
              },
              { icon: TrendingUp, label: "Gözləyən sifariş", value: pendingOrders },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className="text-2xl font-extrabold mt-1">{s.value}</div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-soft flex items-center justify-center text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {lowStock > 0 && (
            <div className="bg-warning/10 border border-warning/20 text-warning-foreground rounded-2xl p-4">
              <strong>{lowStock}</strong> məhsulun stoku azdır (5-dən az). Stoku yeniləyin.
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="font-bold text-lg mb-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Bildirişlər
              </span>
              {unreadSellerNotifs > 0 && (
                <button
                  onClick={async () => {
                    await supabase
                      .from("notifications")
                      .update({ is_read: true })
                      .eq("user_id", user.id)
                      .eq("is_read", false);
                  }}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Hamısı oxundu
                </button>
              )}
            </div>
            {sellerNotifs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Bildiriş yoxdur</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sellerNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border ${!n.is_read ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                  >
                    <div className="font-semibold text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                    {n.pickup_code && (
                      <div className="mt-1.5 inline-block font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        Kod: {n.pickup_code}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Tez başlamaq</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setTab("products");
                  setEditing({ title: "", price: 0, stock: 0, images: [], is_active: true });
                }}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition text-left"
              >
                <Plus className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Yeni məhsul əlavə et</span>
              </button>
              <button
                onClick={() => setTab("orders")}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition text-left"
              >
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Sifarişlərə bax</span>
              </button>
              <button
                onClick={() => setTab("shop")}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-secondary/50 transition text-left"
              >
                <Store className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Mağaza ayarları</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div>
          <button
            onClick={() =>
              setEditing({ title: "", price: 0, stock: 0, images: [], is_active: true })
            }
            className="mb-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Yeni məhsul
          </button>
          {products.length === 0 ? (
            <div className="bg-secondary/40 rounded-2xl p-10 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Hələ məhsul yoxdur. İlk məhsulunuzu əlavə edin.
              </p>
              <button
                onClick={() =>
                  setEditing({ title: "", price: 0, stock: 0, images: [], is_active: true })
                }
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold"
              >
                Məhsul əlavə et
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="p-3">Məhsul</th>
                    <th className="p-3">Qiymət</th>
                    <th className="p-3">Stok</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                            {p.image_url && (
                              <img
                                src={p.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to="/product/$id"
                              params={{ id: p.id }}
                              className="font-medium line-clamp-1 hover:text-primary"
                            >
                              {p.title}
                            </Link>
                            {p.sku && (
                              <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-semibold whitespace-nowrap">{formatAZN(p.price)}</td>
                      <td className="p-3">
                        <span className={p.stock < 5 ? "text-destructive font-semibold" : ""}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleActive(p)}
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                        >
                          {p.is_active ? "Aktiv" : "Deaktiv"}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setEditing(p)}
                            className="p-2 hover:bg-secondary rounded"
                            title="Redaktə"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => promote(p)}
                            className="p-2 bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground rounded"
                            title="İrəli çək (Reklam)"
                          >
                            <Rocket className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openQR(p)}
                            className="p-2 hover:bg-primary/10 hover:text-primary rounded"
                            title="QR kod"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded inline-flex items-center gap-1"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-xs font-semibold hidden sm:inline">Sil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          <DateRangeFilter value={ordersDateRange} onChange={setOrdersDateRange} />
          {(() => {
            const visibleOrders = orderItems.filter((i) => inRange(i.order_created_at ?? null, ordersDateRange));
            if (visibleOrders.length === 0) {
              return (
                <div className="bg-secondary/40 rounded-2xl p-10 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  Hələ sifariş yoxdur
                </div>
              );
            }
            return visibleOrders.map((i) => {
              const st = ORDER_STATUSES.find((s) => s.v === i.status) ?? ORDER_STATUSES[0];
              const canPack = i.status === "pending";
              const canShip =
                !i.accepted_at &&
                !i.delivered_at &&
                (i.status === "pending" || i.status === "packed");
              return (
                <div key={i.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-14 h-14 bg-secondary rounded-lg overflow-hidden shrink-0">
                      {i.image_url && (
                        <img src={i.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-semibold line-clamp-1">{i.title}</div>
                      <div className="text-xs text-muted-foreground">
                        № {i.order_id.slice(0, 8).toUpperCase()} · {i.quantity} ədəd · Kod:{" "}
                        <b className="font-mono">{i.pickup_code ?? "—"}</b>
                      </div>
                      {i.order_created_at && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          📅 Sifariş: {formatDateTime(i.order_created_at)}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Müştəri: {i.customer_name ?? "—"}
                        {i.customer_phone ? ` · ${i.customer_phone}` : ""}
                      </div>
                      {i.delivered_at ? (
                        <div className="text-[10px] text-success font-bold mt-1">
                          ✅ Müştəriyə təhvil verildi · {formatDateTime(i.delivered_at)}
                        </div>
                      ) : i.accepted_at ? (
                        <div className="text-[10px] text-primary font-bold mt-1">
                          📦 PVZ paketi qəbul etdi · {formatDateTime(i.accepted_at)}
                        </div>
                      ) : null}
                    </div>
                    <div className="font-extrabold whitespace-nowrap">
                      {formatAZN(Number(i.price) * i.quantity)}
                    </div>
                    <select
                      value={i.status}
                      onChange={(e) => updateOrderStatus(i, e.target.value)}
                      disabled={!!i.accepted_at || !!i.delivered_at}
                      className={`text-xs px-3 py-2 rounded-lg font-semibold border-0 ${st.c} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s.v} value={s.v}>
                          {s.l}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {canPack && (
                        <button
                          onClick={() => updateOrderStatus(i, "packed")}
                          className="px-3 py-2 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white text-xs font-bold inline-flex items-center gap-1"
                          title="Paketləndi olaraq qeyd et"
                        >
                          <Package className="h-3.5 w-3.5" /> Paketlə
                        </button>
                      )}
                      {canShip && (
                        <button
                          onClick={() => updateOrderStatus(i, "shipped")}
                          className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold inline-flex items-center gap-1"
                          title="PVZ-yə göndərildi olaraq qeyd et"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" /> Göndərildi
                        </button>
                      )}
                      <button
                        onClick={() => printShippingLabel(i)}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-bold inline-flex items-center gap-1"
                        title="Qablaşdırma etiketi (QR + sifariş kodu)"
                      >
                        <QrCode className="h-3.5 w-3.5" /> Etiket çap et
                      </button>
                    </div>
                  </div>
                  {i.pickup_point ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs">
                      <div className="font-bold text-primary mb-1">
                        📍 Çatdırılma PVZ #{i.pickup_point.point_number ?? "-"}
                      </div>
                      <div>
                        <b>{i.pickup_point.name}</b> — {i.pickup_point.city}
                      </div>
                      <div className="text-muted-foreground">{i.pickup_point.address}</div>
                      <div className="text-muted-foreground">
                        {i.pickup_point.working_hours}
                        {i.pickup_point.phone ? ` · ${i.pickup_point.phone}` : ""}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      PVZ punkt təyin olunmayıb
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {tab === "returns" && <SellerReturns sellerId={user.id} />}

      {tab === "messages" && <SellerMessages sellerId={user.id} />}

      {tab === "analytics" && <SellerAnalytics sellerId={user.id} />}

      {tab === "bulk" && <BulkProductUpload sellerId={user.id} onDone={load} />}

      {tab === "advertising" && <SellerAdvertising />}

      {tab === "balance" && <SellerBalance sellerId={user.id} />}

      {tab === "followers" && <SellerFollowers sellerId={user.id} />}

      {tab === "support" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" /> AI Dəstək
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Satıcı suallarınıza 24/7 avtomatik cavab — məhsul, sifariş, reklam, ödəniş,
              mübahisələr.
            </p>
          </div>
          <AISupportChat userId={user.id} audience="seller" />
        </div>
      )}

      {tab === "shop" && profile && (
        <div className="space-y-6 max-w-3xl">
          {/* Banner & Logo */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="relative h-40 bg-gradient-soft">
              {profile.shop_banner_url && (
                <img src={profile.shop_banner_url} alt="" className="w-full h-full object-cover" />
              )}
              <label className="absolute bottom-2 right-2 bg-background/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-background inline-flex items-center gap-1">
                <Upload className="h-3 w-3" /> Banner yüklə
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && uploadShopImage(e.target.files[0], "shop_banner_url")
                  }
                />
              </label>
              <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl border-4 border-card bg-secondary overflow-hidden">
                {profile.shop_logo_url && (
                  <img src={profile.shop_logo_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </div>
            <div className="pt-12 pb-4 px-6">
              <label className="text-xs text-primary font-semibold cursor-pointer inline-flex items-center gap-1 hover:underline">
                <Upload className="h-3 w-3" /> Loqo dəyişdir
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && uploadShopImage(e.target.files[0], "shop_logo_url")
                  }
                />
              </label>
            </div>
          </div>

          {/* Stats preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Məhsul</div>
                <div className="font-black text-lg">{products.length}</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">İzləyici</div>
                <div className="font-black text-lg flex items-center gap-1">
                  {myFollowers}
                  {myFollowers >= 100 && <BadgeCheck className="h-4 w-4 text-blue-500 fill-blue-500" />}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fəaliyyət</div>
                <div className="font-black text-lg">
                  {profile.created_at
                    ? `${Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} il`
                    : "—"}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reytinq</div>
                <div className="font-black text-lg">
                  {products.length > 0
                    ? (products.reduce((s, p) => s + Number(p.rating) * (p.reviews_count || 0), 0) /
                        Math.max(1, products.reduce((s, p) => s + (p.reviews_count || 0), 0))).toFixed(1)
                    : "0.0"}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" /> Mağaza məlumatları
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Mağaza adı *</label>
                <input
                  value={profile.shop_name ?? ""}
                  onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
                  maxLength={100}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Mağaza haqqında</label>
                <textarea
                  value={profile.shop_description ?? ""}
                  onChange={(e) => setProfile({ ...profile, shop_description: e.target.value })}
                  maxLength={1000}
                  placeholder="Müştərilərinizə özünüzdən bəhs edin..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background min-h-24"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Tam ad</label>
                <input
                  value={profile.full_name ?? ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  maxLength={100}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Telefon</label>
                <input
                  value={profile.phone ?? ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  maxLength={20}
                  placeholder="+994 ..."
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">E-poçt (mağaza)</label>
                <input
                  type="email"
                  value={profile.shop_email ?? ""}
                  onChange={(e) => setProfile({ ...profile, shop_email: e.target.value })}
                  maxLength={200}
                  placeholder="info@magaza.az"
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Şəhər</label>
                <CitySelect
                  value={profile.shop_city ?? ""}
                  onChange={(v) => setProfile({ ...profile, shop_city: v })}
                  includeEmpty
                  placeholder="Şəhər seçin"
                  className="mt-1 w-full h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Ünvan</label>
                <input
                  value={profile.shop_address ?? ""}
                  onChange={(e) => setProfile({ ...profile, shop_address: e.target.value })}
                  maxLength={300}
                  placeholder="H. Əliyev pr. 12"
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-border">
              <h4 className="font-bold text-base mb-1">💳 Ödəniş hesabı (payout)</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Sifariş tamamlandıqdan 3 gün sonra satış məbləği (komissiya çıxılmaqla) avtomatik bu hesaba köçürülür. IBAN tövsiyə olunur — limit yoxdur və qanuni sənədləşmə üçün uyğundur.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Üstün ödəniş üsulu</label>
                  <select
                    value={profile.payout_method ?? "iban"}
                    onChange={(e) => setProfile({ ...profile, payout_method: e.target.value })}
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  >
                    <option value="iban">IBAN (bank hesabı)</option>
                    <option value="card">Kart nömrəsi</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">Hesab sahibi</label>
                  <input
                    value={profile.account_holder ?? ""}
                    onChange={(e) => setProfile({ ...profile, account_holder: e.target.value.toUpperCase() })}
                    maxLength={100}
                    placeholder="ADI SOYADI / ŞİRKƏT ADI"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold">IBAN</label>
                  <input
                    value={profile.iban ?? ""}
                    onChange={(e) => setProfile({ ...profile, iban: e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "") })}
                    maxLength={34}
                    placeholder="AZ21 NABZ 0000 0000 1370 1000 1944"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground mt-1">28 simvol, AZ ilə başlayır. Bütün banklarda işləyir.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold">Bank adı</label>
                  <input
                    value={profile.bank_name ?? ""}
                    onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                    maxLength={100}
                    placeholder="Kapital Bank, ABB, ..."
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Kart nömrəsi (alternativ)</label>
                  <input
                    value={profile.card_number ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                      const f = v.replace(/(\d{4})/g, "$1 ").trim();
                      setProfile({ ...profile, card_number: f });
                    }}
                    maxLength={23}
                    placeholder="4169 7388 0000 0000"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground mt-1">m10, LeoBank, Birbank və s. Kiçik məbləğlər üçün uyğundur (gündəlik limit ola bilər).</p>
                </div>
              </div>
            </div>

            <button
              onClick={saveShop}
              disabled={savingShop}
              className="bg-primary text-primary-foreground rounded-lg px-6 h-11 font-bold hover:bg-primary/90 disabled:opacity-60"
            >
              {savingShop ? "..." : "Mağazanı yadda saxla"}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-card rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editing.id ? "Məhsulu redaktə et" : "Yeni məhsul"}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-secondary rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Images */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Şəkillər (1-dən 10-a qədər, ilk şəkil əsas olacaq) — {(editing.images ?? []).length}/10
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {(editing.images ?? []).map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square bg-secondary rounded-lg overflow-hidden group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                          Əsas
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary hover:bg-secondary/50 transition disabled:opacity-60"
                  >
                    {uploading ? (
                      <span className="text-xs">Yüklənir...</span>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Şəkil əlavə et</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadImages(e.target.files)}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> JPG, PNG, WebP. Maks 5MB.
                </p>
              </div>

              {/* Video (max 60 sec) */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  🎬 Məhsul videosu (maks. 60 saniyə) — opsional
                </label>
                {editing.video_url ? (
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video src={editing.video_url} controls className="w-full max-h-64" />
                    <button
                      onClick={() => setEditing({ ...editing, video_url: null, video_duration: null })}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {editing.video_duration && (
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {editing.video_duration} san
                      </span>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-secondary/50 transition">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Yüklənir..." : "Video seçin (MP4, WebM, maks 50MB, 60 san)"}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => uploadVideo(e.target.files?.[0])}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Qısa video məhsulun satışını artırır. 60 saniyədən uzun videolar avtomatik rədd edilir.
                </p>
              </div>


              <div>
                <label className="text-sm font-semibold">Başlıq *</label>
                <input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Məhsulun adı"
                  maxLength={200}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Təsvir</label>
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Məhsul haqqında ətraflı məlumat"
                  maxLength={2000}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background min-h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Qiymət (₼) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={editing.price ? String(editing.price) : ""}
                    onChange={(e) =>
                      setEditing({ ...editing, price: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Köhnə qiymət (₼)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={editing.old_price ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        old_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Endirim üçün"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">Stok *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editing.stock ? String(editing.stock) : ""}
                    onChange={(e) =>
                      setEditing({ ...editing, stock: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Marka</label>
                  <input
                    value={editing.brand ?? ""}
                    onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                    maxLength={100}
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">SKU kodu</label>
                  <input
                    value={editing.sku ?? ""}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                    maxLength={50}
                    placeholder="ART-001"
                    className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Çəki (kq)</label>
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
                <label className="text-sm font-semibold">Kateqoriya</label>
                <CategoryCascade
                  categories={categories}
                  value={editing.category_id ?? null}
                  onChange={(id: string | null) => setEditing({ ...editing, category_id: id })}
                />
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  🚚 Çatdırılma şərtləri
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Min gün</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={editing.delivery_days_min ? String(editing.delivery_days_min) : ""}
                      onChange={(e) =>
                        setEditing({ ...editing, delivery_days_min: e.target.value === "" ? 1 : parseInt(e.target.value) || 0 })
                      }
                      placeholder="1"
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Max gün</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={editing.delivery_days_max ? String(editing.delivery_days_max) : ""}
                      onChange={(e) =>
                        setEditing({ ...editing, delivery_days_max: e.target.value === "" ? 3 : parseInt(e.target.value) || 0 })
                      }
                      placeholder="3"
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Çatdırılma şəhəri
                  </label>
                  <CitySelect
                    value={editing.delivery_city ?? "Bakı"}
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
                    <span className="text-xs font-semibold">🆓 Pulsuz çatdırılma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:border-primary">
                    <input
                      type="checkbox"
                      checked={!!editing.fast_delivery}
                      onChange={(e) => setEditing({ ...editing, fast_delivery: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs font-semibold">⚡ 24 saat ərzində</span>
                  </label>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground">Vəziyyəti</label>
                  <select
                    value={editing.condition ?? "new"}
                    onChange={(e) => setEditing({ ...editing, condition: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                  >
                    <option value="new">Yeni</option>
                    <option value="used">İşlənmiş</option>
                  </select>
                </div>
                <label className="mt-3 flex items-center gap-2 cursor-pointer p-3 rounded-lg border-2 border-warning/40 bg-warning/5 hover:border-warning">
                  <input
                    type="checkbox"
                    checked={!!editing.is_giveaway}
                    onChange={(e) => setEditing({ ...editing, is_giveaway: e.target.checked })}
                    className="w-4 h-4 accent-warning"
                  />
                  <span className="text-sm font-bold">🎁 Uduşlu məhsul (ön səhifədə xüsusi bölmədə görünsün)</span>
                </label>
              </div>


              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold">Aktiv (mağazada göstər)</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 h-11 border border-border rounded-lg font-bold hover:bg-secondary"
                >
                  Ləğv et
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
              <h3 className="font-bold text-lg">Məhsul QR kodu</h3>
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
                <Download className="h-4 w-4" /> PNG yüklə
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
<div class="noprint" style="text-align:center;margin-bottom:8px;"><button class="btn" onclick="window.print()">🖨️ Çap et</button></div>
<div class="lbl">
  <div class="t">${qrProduct.title}</div>
  ${qrProduct.brand ? `<div class="b">${qrProduct.brand}</div>` : ""}
  <div class="p">${Number(qrProduct.price).toFixed(2)} ₼</div>
  <div class="qr"><img src="${qrDataUrl}" alt="QR"/></div>
  ${qrProduct.sku ? `<div class="sku">SKU: ${qrProduct.sku}</div>` : ""}
</div>
<script>setTimeout(()=>window.print(),300);</script>
</body></html>`;
                  const w = window.open("", "_blank", "width=380,height=520");
                  if (!w) {
                    toast.error("Pop-up bloklanıb");
                    return;
                  }
                  w.document.write(html);
                  w.document.close();
                }}
                className="flex-1 min-w-[120px] bg-secondary text-foreground px-3 py-2 rounded-lg font-bold hover:bg-secondary/80 inline-flex items-center justify-center gap-2 text-sm"
              >
                <QrCode className="h-4 w-4" /> Etiket çap et
              </button>
              <button
                onClick={() => setQrProduct(null)}
                className="px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  );
}
