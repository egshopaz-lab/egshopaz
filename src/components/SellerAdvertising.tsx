import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatAZN, formatDateTime, formatDate } from "@/lib/format";
import {
  Check, Crown, Sparkles, Star, CreditCard, Calendar, TrendingUp,
  Receipt, Loader2, X, Image as ImageIcon, Plus, Trash2, Megaphone, Package, Store,
} from "lucide-react";
import { toast } from "sonner";

interface Pkg {
  id: string;
  name: string;
  tier: string;
  price: number;
  duration_days: number;
  banner_slots: number;
  sponsored_product_slots: number;
  shop_promo_slots: number;
  features: string[];
  color: string;
}
interface Sub {
  id: string;
  package_id: string;
  starts_at: string;
  ends_at: string;
  payment_status: string;
  amount: number;
  is_active: boolean;
  ad_packages?: Pkg | null;
}
interface Tx {
  id: string;
  amount: number;
  status: string;
  method: string;
  description: string | null;
  created_at: string;
}
interface Banner {
  id: string;
  title: string;
  image_url: string | null;
  video_url?: string | null;
  link_url: string | null;
  position: string;
  is_active: boolean;
  ends_at: string | null;
}
interface Product {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
}
interface Sponsored {
  id: string;
  product_id: string;
  position: string;
  is_active: boolean;
  ends_at: string;
  products?: Product | null;
}

const TIER_ICONS: Record<string, typeof Crown> = {
  silver: Star,
  premium: Sparkles,
  gold: Star,
  vip: Crown,
};

interface PromoSettings {
  single_product_promo_price: number;
  single_product_promo_days: number;
  single_shop_promo_price: number;
  single_shop_promo_days: number;
  single_banner_price: number;
  single_banner_days: number;
  promo_terms_text: string;
}


type CheckoutTarget =
  | { kind: "pkg"; pkg: Pkg }
  | { kind: "one_product"; productId: string; productTitle: string; price: number; days: number }
  | { kind: "one_shop"; price: number; days: number }
  | { kind: "one_banner"; price: number; days: number; form: { title: string; link_url: string; image_url: string; video_url: string } }
  | { kind: "slot_product"; productId: string; productTitle: string; price: number }
  | { kind: "slot_shop"; price: number }
  | { kind: "slot_banner"; price: number; form: { title: string; link_url: string; image_url: string; video_url: string } };


// Fixed prices for slot activations (kept low because seller already paid for package)
const SLOT_PRODUCT_FEE = 1;
const SLOT_SHOP_FEE = 1;
const SLOT_BANNER_FEE = 1;

const CARD_STORAGE_KEY = "elzan_saved_card_v1";

export function SellerAdvertising() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sponsored, setSponsored] = useState<Sponsored[]>([]);
  const [sponsoredShops, setSponsoredShops] = useState<{ id: string; ends_at: string; is_active: boolean }[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [promoSettings, setPromoSettings] = useState<PromoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvc: "" });
  const [saveCard, setSaveCard] = useState(false);
  const [postPay, setPostPay] = useState(false); // post-package chooser
  const [oneOffPickProduct, setOneOffPickProduct] = useState(false); // paid one-off product picker

  // Banner form
  const [bannerForm, setBannerForm] = useState<{ title: string; link_url: string; image_url: string; video_url: string } | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBannerVideo, setUploadingBannerVideo] = useState(false);

  // Sponsored (slot-based) form
  const [pickProduct, setPickProduct] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [pk, sb, tx, bn, sp, ss, pr, st] = await Promise.all([
      supabase.from("ad_packages").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("seller_subscriptions").select("*, ad_packages(*)").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("payment_transactions").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("banners").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("sponsored_products").select("*, products(id,title,image_url,price)").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("sponsored_shops").select("id,ends_at,is_active").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("products").select("id,title,image_url,price").eq("seller_id", user.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("system_settings").select("single_product_promo_price,single_product_promo_days,single_shop_promo_price,single_shop_promo_days,single_banner_price,single_banner_days,promo_terms_text").limit(1).maybeSingle(),
    ]);
    setPackages((pk.data ?? []) as unknown as Pkg[]);
    setSubs((sb.data ?? []) as unknown as Sub[]);
    setTxs((tx.data ?? []) as unknown as Tx[]);
    setBanners((bn.data ?? []) as unknown as Banner[]);
    setSponsored((sp.data ?? []) as unknown as Sponsored[]);
    setSponsoredShops((ss.data ?? []) as { id: string; ends_at: string; is_active: boolean }[]);
    setMyProducts((pr.data ?? []) as unknown as Product[]);
    setPromoSettings((st.data as PromoSettings | null) ?? null);
    setLoading(false);
  };


  useEffect(() => { void load(); }, [user]);

  const activeSub = subs.find((s) => s.is_active && new Date(s.ends_at) > new Date());
  const activeBanners = banners.filter((b) => b.is_active && (!b.ends_at || new Date(b.ends_at) > new Date()));
  const activeSponsored = sponsored.filter((s) => s.is_active && new Date(s.ends_at) > new Date());
  const activeShopPromos = sponsoredShops.filter((s) => s.is_active && new Date(s.ends_at) > new Date());

  const bannersLeft = (activeSub?.ad_packages?.banner_slots ?? 0) - activeBanners.length;
  const sponsoredLeft = (activeSub?.ad_packages?.sponsored_product_slots ?? 0) - activeSponsored.length;
  const shopPromoLeft = (activeSub?.ad_packages?.shop_promo_slots ?? 0) - activeShopPromos.length;

  const checkoutMeta = (() => {
    if (!checkout) return null;
    if (checkout.kind === "pkg") return { label: `${checkout.pkg.name} paketi`, price: checkout.pkg.price, color: checkout.pkg.color, days: checkout.pkg.duration_days };
    if (checkout.kind === "one_product") return { label: `Məhsul reklamı: ${checkout.productTitle}`, price: checkout.price, color: "#f59e0b", days: checkout.days };
    if (checkout.kind === "one_shop") return { label: "Mağaza reklamı (ana səhifə)", price: checkout.price, color: "#3b82f6", days: checkout.days };
    if (checkout.kind === "one_banner") return { label: `Banner reklamı: ${checkout.form.title || "Yeni banner"}`, price: checkout.price, color: "#3b82f6", days: checkout.days };
    if (checkout.kind === "slot_product") return { label: `Slot aktivasiyası: ${checkout.productTitle}`, price: checkout.price, color: "#f59e0b", days: 0 };
    if (checkout.kind === "slot_shop") return { label: "Slot aktivasiyası: Mağaza", price: checkout.price, color: "#3b82f6", days: 0 };
    return { label: "Slot aktivasiyası: Banner", price: checkout.price, color: "#3b82f6", days: 0 };

  })();

  // Prefill saved card when opening checkout
  useEffect(() => {
    if (!checkout) return;
    try {
      const raw = localStorage.getItem(CARD_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as typeof card;
        setCard(saved);
        setSaveCard(true);
      }
    } catch { /* ignore */ }
  }, [checkout]);

  const purchase = async () => {
    if (!user || !checkout || !checkoutMeta) return;
    if (!card.number || !card.name || !card.expiry || !card.cvc) {
      toast.error("Bütün kart məlumatlarını doldurun");
      return;
    }
    setPaying(true);
    try {
      // Persist/clear saved card
      try {
        if (saveCard) localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(card));
        else localStorage.removeItem(CARD_STORAGE_KEY);
      } catch { /* ignore */ }

      if (checkout.kind === "pkg") {
        const ends = new Date(); ends.setDate(ends.getDate() + checkoutMeta.days);
        const { data: sub, error: subErr } = await supabase.from("seller_subscriptions").insert({
          seller_id: user.id,
          package_id: checkout.pkg.id,
          ends_at: ends.toISOString(),
          amount: checkout.pkg.price,
          payment_status: "completed",
          payment_method: "mock_card",
          is_active: true,
        }).select().single();
        if (subErr) throw subErr;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, subscription_id: sub.id, amount: checkout.pkg.price,
          status: "completed", method: "mock_card",
          description: `${checkout.pkg.name} paketi (${checkout.pkg.duration_days} gün)`,
        });
        toast.success(`${checkout.pkg.name} paketi aktiv edildi! 🎉`);
        setCheckout(null);
        if (!saveCard) setCard({ number: "", name: "", expiry: "", cvc: "" });
        await load();
        setPostPay(true);
        return;
      }

      if (checkout.kind === "one_product") {
        const ends = new Date(); ends.setDate(ends.getDate() + checkout.days);
        const { error } = await supabase.from("sponsored_products").insert({
          seller_id: user.id, product_id: checkout.productId,
          position: "catalog_top", is_active: true, ends_at: ends.toISOString(),
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, amount: checkout.price, status: "completed", method: "mock_card",
          description: `Tək məhsul reklamı: ${checkout.productTitle} (${checkout.days} gün)`,
        });
        toast.success("Məhsul ana səhifədə önə çəkildi! 🎉");
      } else if (checkout.kind === "one_shop") {
        const ends = new Date(); ends.setDate(ends.getDate() + checkout.days);
        const { error } = await supabase.from("sponsored_shops").insert({
          seller_id: user.id, ends_at: ends.toISOString(), is_active: true,
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, amount: checkout.price, status: "completed", method: "mock_card",
          description: `Mağaza reklamı (${checkout.days} gün)`,
        });
        toast.success("Mağazanız ana səhifədə önə çəkildi! 🎉");
      } else if (checkout.kind === "one_banner") {
        const ends = new Date(); ends.setDate(ends.getDate() + checkout.days);
        const { error } = await supabase.from("banners").insert({
          seller_id: user.id,
          title: checkout.form.title.trim().slice(0, 200),
          image_url: checkout.form.image_url || null,
          video_url: checkout.form.video_url || null,
          link_url: checkout.form.link_url.trim().slice(0, 500) || null,
          position: "home_top",
          is_active: true,
          ends_at: ends.toISOString(),
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, amount: checkout.price, status: "completed", method: "mock_card",
          description: `Banner reklamı: ${checkout.form.title} (${checkout.days} gün)`,
        });
        toast.success("Banner əlavə olundu 🎉");
        setBannerForm(null);
      } else if (checkout.kind === "slot_product") {
        if (!activeSub) throw new Error("Aktiv paket yoxdur");
        const { error } = await supabase.from("sponsored_products").insert({
          seller_id: user.id, subscription_id: activeSub.id, product_id: checkout.productId,
          position: "catalog_top", is_active: true, ends_at: activeSub.ends_at,
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, subscription_id: activeSub.id, amount: checkout.price,
          status: "completed", method: "mock_card",
          description: `Slot aktivasiyası — Məhsul: ${checkout.productTitle}`,
        });
        toast.success("Məhsul önə çəkildi 🎉");
        setPickProduct(false);
      } else if (checkout.kind === "slot_shop") {
        if (!activeSub) throw new Error("Aktiv paket yoxdur");
        const { error } = await supabase.from("sponsored_shops").insert({
          seller_id: user.id, subscription_id: activeSub.id, ends_at: activeSub.ends_at, is_active: true,
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, subscription_id: activeSub.id, amount: checkout.price,
          status: "completed", method: "mock_card",
          description: "Slot aktivasiyası — Mağaza reklamı",
        });
        toast.success("Mağazanız önə çəkildi 🎉");
      } else if (checkout.kind === "slot_banner") {
        if (!activeSub) throw new Error("Aktiv paket yoxdur");
        const { error } = await supabase.from("banners").insert({
          seller_id: user.id,
          subscription_id: activeSub.id,
          title: checkout.form.title.trim().slice(0, 200),
          image_url: checkout.form.image_url || null,
          video_url: checkout.form.video_url || null,
          link_url: checkout.form.link_url.trim().slice(0, 500) || null,
          position: "home_top",
          is_active: true,
          ends_at: activeSub.ends_at,
        });
        if (error) throw error;
        await supabase.from("payment_transactions").insert({
          seller_id: user.id, subscription_id: activeSub.id, amount: checkout.price,
          status: "completed", method: "mock_card",
          description: `Slot aktivasiyası — Banner: ${checkout.form.title}`,
        });
        toast.success("Banner əlavə olundu 🎉");
        setBannerForm(null);
      }
      setCheckout(null);
      if (!saveCard) setCard({ number: "", name: "", expiry: "", cvc: "" });
      await load();
    } catch (e) {
      toast.error("Ödəniş alınmadı: " + (e as Error).message);
    } finally {
      setPaying(false);
    }
  };

  const uploadBannerImage = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Şəkil 5MB-dan böyükdür"); return; }
    setUploadingBanner(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); setUploadingBanner(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setBannerForm((f) => f ? { ...f, image_url: data.publicUrl } : f);
    setUploadingBanner(false);
  };

  const uploadBannerVideo = async (file: File) => {
    if (!user) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Video 50MB-dan böyükdür"); return; }
    // Check duration <= 60s
    const durationOk = await new Promise<boolean>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { resolve(v.duration <= 61); URL.revokeObjectURL(v.src); };
      v.onerror = () => resolve(false);
      v.src = URL.createObjectURL(file);
    });
    if (!durationOk) { toast.error("Video 60 saniyədən qısa olmalıdır"); return; }
    setUploadingBannerVideo(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/banner-video-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); setUploadingBannerVideo(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setBannerForm((f) => f ? { ...f, video_url: data.publicUrl } : f);
    setUploadingBannerVideo(false);
  };

  const saveBanner = async () => {
    if (!user || !bannerForm) return;
    if (!bannerForm.title.trim()) { toast.error("Başlıq daxil edin"); return; }
    if (!bannerForm.image_url && !bannerForm.video_url) { toast.error("Şəkil və ya video yükləyin"); return; }

    // Active subscription → use included slot (still uses slot_banner small fee path)
    if (activeSub) {
      if (bannersLeft <= 0) { toast.error("Banner limiti dolub. Yeni paket alın."); return; }
      setCheckout({ kind: "slot_banner", price: SLOT_BANNER_FEE, form: bannerForm });
      return;
    }

    // No subscription → paid one-off banner (admin-set price + days)
    const price = Number(promoSettings?.single_banner_price ?? 5);
    const days = Number(promoSettings?.single_banner_days ?? 30);
    setCheckout({ kind: "one_banner", price, days, form: bannerForm });
  };



  const deleteBanner = async (id: string) => {
    if (!confirm("Bu banner silinsin?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    await load();
  };

  const toggleBanner = async (b: Banner) => {
    await supabase.from("banners").update({ is_active: !b.is_active }).eq("id", b.id);
    await load();
  };

  const promoteProduct = async (productId: string) => {
    if (!user || !activeSub) return;
    if (sponsoredLeft <= 0) { toast.error("Sponsor məhsul limiti dolub"); return; }
    const exists = activeSponsored.find((s) => s.product_id === productId);
    if (exists) { toast.error("Bu məhsul artıq önə çəkilib"); return; }
    const product = myProducts.find((p) => p.id === productId);
    if (!product) return;
    setPickProduct(false);
    setCheckout({ kind: "slot_product", productId, productTitle: product.title, price: SLOT_PRODUCT_FEE });
  };


  const removeSponsored = async (id: string) => {
    if (!confirm("Bu məhsul sponsorluqdan çıxarılsın?")) return;
    const { error } = await supabase.from("sponsored_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Çıxarıldı");
    await load();
  };

  const promoteShop = async () => {
    if (!user || !activeSub) return;
    if (shopPromoLeft <= 0) { toast.error("Mağaza reklamı limiti dolub"); return; }
    setCheckout({ kind: "slot_shop", price: SLOT_SHOP_FEE });
  };

  const removeShopPromo = async (id: string) => {
    if (!confirm("Mağaza reklamı dayandırılsın?")) return;
    const { error } = await supabase.from("sponsored_shops").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Çıxarıldı");
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Active subscription */}
      {activeSub && activeSub.ad_packages && (
        <div className="rounded-2xl p-6 border-2" style={{ borderColor: activeSub.ad_packages.color, background: `linear-gradient(135deg, ${activeSub.ad_packages.color}15, transparent)` }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Aktiv paket</div>
              <div className="flex items-center gap-2 mt-1">
                {(() => { const I = TIER_ICONS[activeSub.ad_packages.tier] ?? Crown; return <I className="h-6 w-6" style={{ color: activeSub.ad_packages.color }} />; })()}
                <h3 className="text-2xl font-extrabold">{activeSub.ad_packages.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Bitir</div>
              <div className="font-bold flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(activeSub.ends_at)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-card/60 rounded-xl p-3"><div className="text-xs text-muted-foreground">Banner (qalır / cəmi)</div><div className="font-bold text-lg">{Math.max(0, bannersLeft)} / {activeSub.ad_packages.banner_slots}</div></div>
            <div className="bg-card/60 rounded-xl p-3"><div className="text-xs text-muted-foreground">Sponsor məhsul</div><div className="font-bold text-lg">{Math.max(0, sponsoredLeft)} / {activeSub.ad_packages.sponsored_product_slots}</div></div>
            <div className="bg-card/60 rounded-xl p-3"><div className="text-xs text-muted-foreground">Mağaza reklamı</div><div className="font-bold text-lg">{Math.max(0, shopPromoLeft)} / {activeSub.ad_packages.shop_promo_slots ?? 0}</div></div>
            <div className="bg-card/60 rounded-xl p-3"><div className="text-xs text-muted-foreground">Müddət</div><div className="font-bold text-lg">{activeSub.ad_packages.duration_days} gün</div></div>
          </div>
        </div>
      )}

      {/* === SHOP PROMOTION === */}
      {activeSub ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Mağaza reklamı (ana səhifədə)</h2>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{activeShopPromos.length}/{activeSub.ad_packages?.shop_promo_slots ?? 0}</span>
            </div>
            <button
              onClick={promoteShop}
              disabled={shopPromoLeft <= 0}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus className="h-4 w-4" /> Mağazamı önə çək
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Mağazanız ana səhifədə "Önə çıxan mağazalar" bölməsində görünəcək. Müştərilər mağazanızı izləyə bilərlər.</p>
          {activeShopPromos.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">Hələ aktiv mağaza reklamı yoxdur.</div>
          ) : (
            <div className="space-y-2">
              {activeShopPromos.map((s) => (
                <div key={s.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                  <div className="text-sm">
                    <div className="font-semibold">Aktiv mağaza reklamı</div>
                    <div className="text-xs text-muted-foreground">Bitir: {formatDate(s.ends_at)}</div>
                  </div>
                  <button onClick={() => removeShopPromo(s.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}


      {/* === BANNER MANAGER (always available to sellers) === */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Ana səhifə bannerlərim</h2>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
              {activeBanners.length}/{activeSub ? (activeSub.ad_packages?.banner_slots ?? 0) : "∞"}
            </span>
            {!activeSub && (
              <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">ÖDƏNİŞLİ</span>
            )}
          </div>
          <button
            onClick={() => setBannerForm({ title: "", link_url: "", image_url: "", video_url: "" })}
            disabled={!!activeSub && bannersLeft <= 0}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="h-4 w-4" /> Yeni banner
          </button>
        </div>
        {!activeSub && (
          <p className="text-xs text-muted-foreground mb-3">
            Banner reklamı ödənişlidir: <b>{Number(promoSettings?.single_banner_price ?? 5)} AZN</b> / <b>{Number(promoSettings?.single_banner_days ?? 30)} gün</b>. Qiymət admin tərəfindən tənzimlənir. Reklam paketi alanlar paketin slotlarından istifadə edir.
          </p>
        )}

        {banners.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">Hələ banner yoxdur. Ana səhifədə görünmək üçün əlavə edin.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {banners.map((b) => (
              <div key={b.id} className="border border-border rounded-xl overflow-hidden">
                <div className="aspect-[3/1] bg-secondary">
                  {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />}
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm line-clamp-1">{b.title}</div>
                    <div className="text-xs text-muted-foreground">{b.is_active ? "Aktiv" : "Pasiv"} • {b.ends_at ? formatDate(b.ends_at) : "—"}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleBanner(b)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/70">{b.is_active ? "Söndür" : "Yandır"}</button>
                    <button onClick={() => deleteBanner(b.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === SPONSORED PRODUCTS MANAGER === */}
      {activeSub ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-bold">Önə çəkilmiş məhsullarım</h2>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{activeSponsored.length}/{activeSub.ad_packages?.sponsored_product_slots ?? 0}</span>
            </div>
            <button
              onClick={() => setPickProduct(true)}
              disabled={sponsoredLeft <= 0}
              className="bg-warning text-warning-foreground px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus className="h-4 w-4" /> Məhsul önə çək
            </button>
          </div>
          {sponsored.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Hələ önə çəkilmiş məhsul yoxdur.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {sponsored.map((s) => s.products && (
                <div key={s.id} className="border border-border rounded-xl overflow-hidden relative">
                  <button onClick={() => removeSponsored(s.id)} className="absolute top-1 right-1 z-10 bg-destructive/90 text-destructive-foreground rounded-full p-1 hover:bg-destructive"><X className="h-3.5 w-3.5" /></button>
                  <div className="aspect-square bg-secondary">
                    {s.products.image_url && <img src={s.products.image_url} alt={s.products.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-2">
                    <div className="text-xs line-clamp-2">{s.products.title}</div>
                    <div className="font-bold text-sm">{formatAZN(s.products.price)}</div>
                    <div className="text-[10px] text-muted-foreground">Bitir: {formatDate(s.ends_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* === ONE-OFF PAID PROMOTION (paketsiz, admin qiymətli) === */}
      {promoSettings && (
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Ayrıca ödənişli reklam (paketsiz)</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{promoSettings.promo_terms_text}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setOneOffPickProduct(true)}
              className="border border-border rounded-xl p-4 text-left hover:border-warning hover:bg-warning/5 transition"
            >
              <div className="flex items-center gap-2 mb-1"><Package className="h-5 w-5 text-warning" /> <span className="font-bold">Tək məhsulu önə çək</span></div>
              <div className="text-xs text-muted-foreground">{promoSettings.single_product_promo_days} gün</div>
              <div className="text-xl font-extrabold text-warning mt-1">{formatAZN(promoSettings.single_product_promo_price)}</div>
            </button>
            <button
              onClick={() => setCheckout({ kind: "one_shop", price: promoSettings.single_shop_promo_price, days: promoSettings.single_shop_promo_days })}
              className="border border-border rounded-xl p-4 text-left hover:border-primary hover:bg-primary/5 transition"
            >
              <div className="flex items-center gap-2 mb-1"><Store className="h-5 w-5 text-primary" /> <span className="font-bold">Mağazamı önə çək</span></div>
              <div className="text-xs text-muted-foreground">{promoSettings.single_shop_promo_days} gün</div>
              <div className="text-xl font-extrabold text-primary mt-1">{formatAZN(promoSettings.single_shop_promo_price)}</div>
            </button>
          </div>
        </div>
      )}

      {/* Packages */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Reklam paketləri</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {packages.map((p) => {
            const Icon = TIER_ICONS[p.tier] ?? Crown;
            const isActive = activeSub?.package_id === p.id;
            return (
              <div key={p.id} className="rounded-2xl p-6 border-2 bg-card relative overflow-hidden transition hover:shadow-lg" style={{ borderColor: isActive ? p.color : "hsl(var(--border))" }}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10" style={{ background: p.color }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-6 w-6" style={{ color: p.color }} />
                    <h3 className="text-2xl font-extrabold">{p.name}</h3>
                  </div>
                  <div className="text-3xl font-extrabold mb-1" style={{ color: p.color }}>{formatAZN(p.price)}</div>
                  <div className="text-xs text-muted-foreground mb-4">{p.duration_days} gün</div>
                  <ul className="space-y-2 mb-5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: p.color }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isActive}
                    onClick={() => setCheckout({ kind: "pkg", pkg: p })}
                    className="w-full py-2.5 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
                    style={{ background: p.color }}
                  >
                    {isActive ? "✓ Aktiv" : "Al"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Ödəniş tarixçəsi</h2>
        </div>
        {txs.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-sm">Hələ ödəniş yoxdur</div>
        ) : (
          <div className="divide-y divide-border">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold text-sm">{t.description ?? "Ödəniş"}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(t.created_at)} • {t.method}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatAZN(t.amount)}</div>
                  <div className={`text-xs ${t.status === "completed" ? "text-success" : "text-warning"}`}>{t.status === "completed" ? "Tamamlandı" : t.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner form modal */}
      {bannerForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setBannerForm(null)}>
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2"><Megaphone className="h-5 w-5" /> Yeni banner</h3>
              <button onClick={() => setBannerForm(null)} className="p-1 hover:bg-secondary rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Başlıq</label>
                <input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="Yay endirimi 50%" className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Link (məhsul və ya kateqoriya)</label>
                <input value={bannerForm.link_url} onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })} placeholder="/catalog və ya /product/..." className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Şəkil (3:1 nisbət tövsiyə olunur) — opsional</label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {bannerForm.image_url ? (
                    <div className="relative">
                      <img src={bannerForm.image_url} alt="" className="w-full max-h-40 object-cover rounded" />
                      <button onClick={() => setBannerForm({ ...bannerForm, image_url: "" })} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBannerImage(e.target.files[0])} />
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{uploadingBanner ? "Yüklənir..." : "Şəkil seç (max 5MB)"}</span>
                    </label>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Video (max 60 san., səssiz oynayacaq) — opsional</label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {bannerForm.video_url ? (
                    <div className="relative">
                      <video src={bannerForm.video_url} className="w-full max-h-40 object-cover rounded" muted playsInline controls />
                      <button onClick={() => setBannerForm({ ...bannerForm, video_url: "" })} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBannerVideo(e.target.files[0])} />
                      <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">{uploadingBannerVideo ? "Yüklənir..." : "Video seç (max 60 san, 50MB)"}</span>
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Video yükləsəniz, banner ana səhifədə avtomatik səssiz oynayacaq.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-5">
              {!activeSub && (
                <div className="text-xs text-muted-foreground">
                  Ödəniş: <b className="text-foreground">{Number(promoSettings?.single_banner_price ?? 5)} AZN</b> ({Number(promoSettings?.single_banner_days ?? 30)} gün)
                </div>
              )}
              <div className="flex justify-end gap-2 sm:ml-auto">
                <button onClick={() => setBannerForm(null)} className="px-4 py-2 rounded-lg border border-border">Ləğv et</button>
                <button onClick={saveBanner} disabled={uploadingBanner || uploadingBannerVideo} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold disabled:opacity-60">
                  {activeSub ? "Yarat" : "Ödə və yarat"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Pick product to promote */}
      {pickProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPickProduct(false)}>
          <div className="bg-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-warning" /> Önə çəkmək üçün məhsul seç</h3>
              <button onClick={() => setPickProduct(false)} className="p-1 hover:bg-secondary rounded"><X className="h-5 w-5" /></button>
            </div>
            {myProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p>Aktiv məhsul yoxdur. Əvvəlcə məhsul əlavə edin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {myProducts.map((p) => {
                  const already = activeSponsored.some((s) => s.product_id === p.id);
                  return (
                    <button
                      key={p.id}
                      disabled={already}
                      onClick={() => promoteProduct(p.id)}
                      className="border border-border rounded-xl overflow-hidden text-left hover:border-warning disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <div className="aspect-square bg-secondary">
                        {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="p-2">
                        <div className="text-xs line-clamp-2">{p.title}</div>
                        <div className="font-bold text-sm">{formatAZN(p.price)}</div>
                        {already && <div className="text-[10px] text-warning">✓ Artıq önə çəkilib</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal (mock) */}
      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !paying && setCheckout(null)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Ödəniş — {checkoutMeta?.label}
              </h3>
              <button onClick={() => !paying && setCheckout(null)} className="p-1 hover:bg-secondary rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4 text-xs">
              ⚠️ <strong>Demo rejimi:</strong> Real ödəniş baş vermir. İstənilən test kartı işləyir.
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kart nömrəsi</label>
                <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kart sahibi</label>
                <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="ALI MAMMADOV" className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Bitir</label>
                  <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="12/28" className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">CVC</label>
                  <input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" maxLength={4} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="h-4 w-4 rounded border-border" />
                <span className="text-sm">Kart məlumatlarını yadda saxla (növbəti ödənişdə avtomatik dolacaq)</span>
              </label>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
              <div>
                <div className="text-xs text-muted-foreground">Ödənilən məbləğ</div>
                <div className="text-2xl font-extrabold" style={{ color: checkoutMeta?.color }}>{formatAZN(checkoutMeta?.price ?? 0)}</div>
                {promoSettings?.promo_terms_text && checkout.kind !== "pkg" && (
                  <div className="text-[11px] text-muted-foreground mt-2 max-w-xs">{promoSettings.promo_terms_text}</div>
                )}
              </div>
              <button onClick={purchase} disabled={paying} className="px-6 py-3 rounded-xl font-bold text-white disabled:opacity-60" style={{ background: checkoutMeta?.color }}>
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ödə"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-payment chooser */}
      {postPay && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPostPay(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">🎉 Paket aktivləşdi — növbəti addım?</h3>
              <button onClick={() => setPostPay(false)} className="p-1 hover:bg-secondary rounded"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Reklamınızı necə yerləşdirək?</p>
            <div className="grid gap-3">
              <button onClick={() => { setPostPay(false); setPickProduct(true); }} disabled={sponsoredLeft <= 0}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-warning hover:bg-warning/5 disabled:opacity-50 disabled:cursor-not-allowed text-left transition">
                <Package className="h-6 w-6 text-warning shrink-0" />
                <div><div className="font-bold">Məhsulu önə çək</div><div className="text-xs text-muted-foreground">Konkret bir məhsulu kataloqun başına çıxar ({Math.max(0, sponsoredLeft)} slot qalır)</div></div>
              </button>
              <button onClick={() => { setPostPay(false); void promoteShop(); }} disabled={shopPromoLeft <= 0}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed text-left transition">
                <Store className="h-6 w-6 text-primary shrink-0" />
                <div><div className="font-bold">Mağazanı önə çək</div><div className="text-xs text-muted-foreground">Bütün mağazanız "Önə çıxan mağazalar" bölməsində ({Math.max(0, shopPromoLeft)} slot qalır)</div></div>
              </button>
              <button onClick={() => { setPostPay(false); setBannerForm({ title: "", link_url: "", image_url: "", video_url: "" }); }} disabled={bannersLeft <= 0}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed text-left transition">
                <Megaphone className="h-6 w-6 text-primary shrink-0" />
                <div><div className="font-bold">Banner əlavə et</div><div className="text-xs text-muted-foreground">Ana səhifənin üstündə böyük banner ({Math.max(0, bannersLeft)} slot qalır)</div></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-off paid product picker */}
      {oneOffPickProduct && promoSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOneOffPickProduct(false)}>
          <div className="bg-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5 text-warning" /> Ödənişli reklam — məhsul seç</h3>
              <button onClick={() => setOneOffPickProduct(false)} className="p-1 hover:bg-secondary rounded"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Qiymət: <b>{formatAZN(promoSettings.single_product_promo_price)}</b> • Müddət: <b>{promoSettings.single_product_promo_days} gün</b></p>
            {myProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-2" /><p>Aktiv məhsul yoxdur.</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {myProducts.map((p) => (
                  <button key={p.id}
                    onClick={() => { setOneOffPickProduct(false); setCheckout({ kind: "one_product", productId: p.id, productTitle: p.title, price: promoSettings.single_product_promo_price, days: promoSettings.single_product_promo_days }); }}
                    className="border border-border rounded-xl overflow-hidden text-left hover:border-warning transition">
                    <div className="aspect-square bg-secondary">
                      {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2"><div className="text-xs line-clamp-2">{p.title}</div><div className="font-bold text-sm">{formatAZN(p.price)}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
