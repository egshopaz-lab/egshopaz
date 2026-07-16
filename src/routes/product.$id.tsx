import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, calcDiscount } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { Star, ShoppingCart, Heart, Truck, ShieldCheck, MessageCircle, Send, Store, MapPin, X, ZoomIn, ChevronLeft, ChevronRight, PackageSearch, Home, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ProductReviews } from "@/components/ProductReviews";
import { CompareButton } from "@/components/CompareButton";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { useFavorite } from "@/hooks/useFavorite";
import { PinchZoomImage } from "@/components/PinchZoomImage";
import { absoluteUrl } from "@/lib/site";
import { addGuestCartItem } from "@/lib/guestCart";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("id,title,description,price,image_url,brand,stock")
      .eq("id", params.id)
      .maybeSingle();
    return { product: data };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.product;
    const url = absoluteUrl(`/product/${params.id}`);
    if (!p) {
      return {
        meta: [
          { title: "Məhsul — EG Shop" },
          { name: "description", content: "EG Shop məhsul səhifəsi." },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = `${p.title} — EG Shop`;
    const rawDesc = (p.description ?? "").replace(/\s+/g, " ").trim();
    const desc = (rawDesc || `${p.title} EG Shop-da sərfəli qiymətə. Sürətli çatdırılma və təhlükəsiz ödəniş.`).slice(0, 160);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { property: "og:type", content: "product" },
    ];
    if (p.image_url) {
      meta.push({ property: "og:image", content: p.image_url });
      meta.push({ name: "twitter:image", content: p.image_url });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.title,
          description: desc,
          image: p.image_url || undefined,
          brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
          offers: {
            "@type": "Offer",
            url,
            price: Number(p.price),
            priceCurrency: "AZN",
            availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }),
      }],
    };
  },
  component: ProductPage,
});

interface Product {
  id: string; title: string; description: string | null;
  price: number; old_price: number | null; image_url: string | null;
  images?: string[] | null;
  rating: number; reviews_count: number; brand: string | null;
  stock: number; seller_id: string;
  video_url?: string | null; video_duration?: number | null;
  delivery_days_min?: number | null; delivery_days_max?: number | null;
  delivery_city?: string | null; free_shipping?: boolean | null; fast_delivery?: boolean | null;
}

function ProductPage() {
  const { id } = Route.useParams();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] ?? "az";
  const shippingCopy = language === "ru"
    ? { delivery: "Доставка", days: "Ожидаемый срок", dayUnit: "дн.", city: "Город отправки", free: "Бесплатная доставка", paid: "Стоимость рассчитывается при оформлении", returns: "Возврат и обмен", returnText: "Условия возврата зависят от категории и состояния товара. Перед заказом ознакомьтесь с правилами возврата." }
    : language === "en"
      ? { delivery: "Delivery", days: "Estimated time", dayUnit: "days", city: "Dispatch city", free: "Free delivery", paid: "Cost is calculated at checkout", returns: "Returns and exchanges", returnText: "Return conditions depend on the product category and condition. Review the return rules before ordering." }
      : { delivery: "Çatdırılma", days: "Təxmini müddət", dayUnit: "gün", city: "Göndəriş şəhəri", free: "Pulsuz çatdırılma", paid: "Qiymət sifariş zamanı hesablanır", returns: "Qaytarma və dəyişdirmə", returnText: "Qaytarma şərtləri məhsulun kateqoriyası və vəziyyətindən asılıdır. Sifarişdən əvvəl qaytarma qaydaları ilə tanış olun." };
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFav, toggle: toggleFavorite, busy: favoriteBusy } = useFavorite(id);
  const [p, setP] = useState<Product | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [shopInfo, setShopInfo] = useState<{
    id: string; shop_name: string | null; full_name: string | null;
    shop_logo_url: string | null; shop_description: string | null; shop_city: string | null;
  } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const sendMessage = async () => {
    if (!user) { navigate({ to: "/auth", search: { role: "buyer" } as never }); return; }
    if (!p) return;
    const body = msgBody.trim();
    if (body.length < 2) { toast.error(t("orders.messageShort")); return; }
    if (user.id === p.seller_id) { toast.error(t("orders.ownShopError")); return; }
    setMsgSending(true);
    const { error } = await supabase.from("shop_messages").insert({
      buyer_id: user.id,
      seller_id: p.seller_id,
      product_id: p.id,
      sender_role: "buyer",
      body,
    });
    setMsgSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("product.msgSent"));
    setMsgBody("");
    setMsgOpen(false);
  };

  const toggleFollow = async () => {
    if (!user) { navigate({ to: "/auth", search: { role: "buyer" } as never }); return; }
    if (!p) return;
    if (user.id === p.seller_id) { toast.error(t("product.ownShopFollowError")); return; }
    if (isFollowing) {
      await supabase.from("shop_followers").delete().eq("user_id", user.id).eq("seller_id", p.seller_id);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
      toast.success(t("product.unfollowedShop"));
    } else {
      const { error } = await supabase.from("shop_followers").insert({ user_id: user.id, seller_id: p.seller_id });
      if (error) { toast.error(error.message); return; }
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
      toast.success(t("product.followedShop"));
    }
  };

  useEffect(() => {
    setLoading(true);
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      setP(data as Product | null);
      if (data) {
        const imgs = ((data as any).images as string[] | null) ?? [];
        setActiveImage((data as any).image_url || imgs[0] || null);
        const [{ data: seller }, { count }] = await Promise.all([
          supabase.from("profiles_public").select("id,shop_name,full_name,shop_logo_url,shop_description,shop_city").eq("id", data.seller_id).maybeSingle(),
          supabase.from("shop_followers").select("id", { count: "exact", head: true }).eq("seller_id", data.seller_id),
        ]);
        const name = seller?.shop_name || seller?.full_name || t("product.seller");
        setShopName(name);
        setShopInfo(seller as any);
        setFollowersCount(count ?? 0);
        if (user) {
          const { data: f } = await supabase.from("shop_followers").select("id").eq("user_id", user.id).eq("seller_id", data.seller_id).maybeSingle();
          setIsFollowing(!!f);
        }
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const addToCart = async () => {
    if (!p) return;
    if (!user) {
      addGuestCartItem(p.id);
      toast.success(t("product.addedToCart"));
      return;
    }
    const { data: existing } = await supabase.from("cart_items")
      .select("id,quantity").eq("user_id", user.id).eq("product_id", p.id).maybeSingle();
    let error: { message: string } | null = null;
    if (existing) {
      if (existing.quantity >= p.stock) {
        toast.error(t("product.maxStock", { count: p.stock }));
        return;
      }
      ({ error } = await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: p.id, quantity: 1 }));
    }
    if (error) { toast.error(t("product.cartUpdateError", { message: error.message })); return; }
    toast.success(t("product.addedToCart"));
  };

  if (loading) return (
    <div className="container mx-auto px-3 sm:px-4 py-6">
      <div className="mb-5 h-4 w-48 rounded bg-secondary animate-pulse" />
      <div className="grid gap-7 lg:grid-cols-2 lg:gap-10">
        <div className="aspect-square rounded-3xl bg-secondary animate-pulse" />
        <div className="space-y-4 pt-2">
          <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
          <div className="h-9 w-4/5 rounded bg-secondary animate-pulse" />
          <div className="h-4 w-44 rounded bg-secondary animate-pulse" />
          <div className="mt-8 h-48 rounded-3xl bg-secondary animate-pulse" />
          <div className="h-28 rounded-2xl bg-secondary animate-pulse" />
        </div>
      </div>
    </div>
  );
  if (!p) return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-violet-200 bg-violet-50/30 px-6 py-14 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><PackageSearch className="h-7 w-7" /></span>
        <h1 className="mt-5 text-2xl font-black">{t("product.notFound")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("product.notFoundDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary hover:text-primary"><Home className="h-4 w-4" /> {t("product.home")}</Link>
          <Link to="/catalog" search={{ q: undefined, cat: undefined } as never} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><RotateCcw className="h-4 w-4" /> {t("product.backToCatalog")}</Link>
        </div>
      </div>
    </div>
  );

  const discount = calcDiscount(Number(p.price), p.old_price ? Number(p.old_price) : undefined);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-7">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground mb-5">
        <Link to="/" className="hover:text-primary">{t("product.home")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/catalog" search={{ q: undefined, cat: undefined } as never} className="hover:text-primary">{t("catalog.title")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground font-medium">{p.title}</span>
      </div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] lg:gap-10 xl:gap-14">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => activeImage && setZoomOpen(true)}
            className="block w-full aspect-square bg-white border border-border rounded-3xl overflow-hidden relative group shadow-sm"
          >
            {activeImage ? (
              <>
                <img src={activeImage} alt={p.title} className="w-full h-full object-contain p-3 sm:p-5" />
                <span className="absolute bottom-4 right-4 bg-slate-950/75 text-white rounded-xl p-2.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">{t("product.noImage")}</div>
            )}
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-discount text-discount-foreground text-sm font-bold px-3 py-1.5 rounded-lg">
                -{discount}%
              </span>
            )}
          </button>
          {(() => {
            const imgs = (p.images ?? []).filter(Boolean);
            const all = p.image_url && !imgs.includes(p.image_url) ? [p.image_url, ...imgs] : imgs;
            if (all.length < 2) return null;
            return (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {all.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden border-2 bg-white transition ${activeImage === url ? "border-primary" : "border-border hover:border-primary/50"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            );
          })()}
          {p.video_url && (
            <div className="rounded-2xl overflow-hidden bg-black relative">
              <video
                src={p.video_url}
                controls
                muted
                playsInline
                preload="metadata"
                className="w-full max-h-96"
              />
              <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                🎬 {t("product.video")} {p.video_duration ? `· ${p.video_duration}${t("product.secondsShort")}` : ""}
              </span>
            </div>
          )}
        </div>

        {zoomOpen && activeImage && (() => {
          const imgs = (p.images ?? []).filter(Boolean);
          const all = p.image_url && !imgs.includes(p.image_url) ? [p.image_url, ...imgs] : imgs;
          const list = all.length ? all : [activeImage];
          const idx = Math.max(0, list.indexOf(activeImage));
          const go = (delta: number) => {
            const next = (idx + delta + list.length) % list.length;
            setActiveImage(list[next]);
            setZoom(1);
          };
          return (
            <div
              onClick={() => setZoomOpen(false)}
              className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center select-none touch-none overflow-hidden"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setZoomOpen(false); }}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center z-10"
                aria-label={t("product.closeAria")}
              >
                <X className="h-5 w-5" />
              </button>
              {list.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-11 h-11 flex items-center justify-center z-10"
                    aria-label={t("product.prevAria")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-11 h-11 flex items-center justify-center z-10"
                    aria-label={t("product.nextAria")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
                    {idx + 1} / {list.length}
                  </div>
                </>
              )}
              <PinchZoomImage
                src={activeImage}
                alt={p.title}
                onSwipe={(dir) => go(dir)}
                onClose={() => setZoomOpen(false)}
              />
            </div>
          );
        })()}


        <div className="space-y-5 self-start">
          {p.brand && <div className="inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-violet-700">{p.brand}</div>}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">{p.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700"><Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="font-bold">{Number(p.rating).toFixed(1)}</span>
            </span>
            <span className="text-muted-foreground">{t("product.reviewsShort", { count: p.reviews_count })}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{p.stock > 0 ? t("product.inStock") : t("product.outOfStock")}</span>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/70 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-950">{formatAZN(p.price)}</span>
              {p.old_price && Number(p.old_price) > Number(p.price) && (
                <span className="text-lg text-muted-foreground line-through">{formatAZN(p.old_price)}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addToCart}
                disabled={p.stock === 0}
                className="flex-1 min-h-[52px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-3.5 font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg shadow-primary/15"
              >
                <ShoppingCart className="h-5 w-5" />
                {p.stock === 0 ? t("product.outOfStock") : t("product.addToCart")}
              </button>
              <button
                onClick={toggleFavorite}
                disabled={favoriteBusy}
                className="w-[52px] h-[52px] rounded-xl border border-border bg-white hover:border-primary hover:text-primary flex items-center justify-center transition"
                aria-label={t("product.favoriteAria")}
              >
                <Heart className={`h-5 w-5 ${isFav ? "fill-discount text-discount" : ""}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t("product.securePurchase")} ·
              {t("product.stockLabel")}: <span className="font-semibold text-success">{t("product.stockUnits", { count: p.stock })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
              <Truck className="h-5 w-5 text-primary shrink-0" />
              <span>{p.fast_delivery ? t("product.fastDelivery") : shippingCopy.delivery}</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <span>{t("product.securePurchase")}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 text-sm space-y-3">
            <h3 className="font-bold flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />{shippingCopy.delivery}</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-muted-foreground">
              <div>{shippingCopy.days}: <strong className="text-foreground">{p.delivery_days_min ?? 1}–{p.delivery_days_max ?? 3} {shippingCopy.dayUnit}</strong></div>
              <div>{shippingCopy.city}: <strong className="text-foreground">{p.delivery_city || "Bakı"}</strong></div>
              <div className="sm:col-span-2">{p.free_shipping ? shippingCopy.free : shippingCopy.paid}</div>
            </div>
            <div className="border-t border-border pt-3">
              <h3 className="font-bold mb-1">{shippingCopy.returns}</h3>
              <p className="text-muted-foreground">{shippingCopy.returnText} <Link to="/terms" className="text-primary hover:underline">{t("footer.terms")}</Link></p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Link to="/shop/$id" params={{ id: p.seller_id }} className="shrink-0">
                <div className="w-12 h-12 rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
                  {shopInfo?.shop_logo_url
                    ? <img src={shopInfo.shop_logo_url} alt={shopName} className="w-full h-full object-cover" />
                    : <Store className="h-5 w-5 text-muted-foreground" />}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link to="/shop/$id" params={{ id: p.seller_id }} className="font-bold hover:text-primary inline-flex items-center gap-1.5">
                  <Store className="h-4 w-4" /> {shopName}
                </Link>
                {shopInfo?.shop_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{shopInfo.shop_description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {shopInfo?.shop_city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{shopInfo.shop_city}</span>}
                  <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{t("product.followers", { count: followersCount })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {user?.id !== p.seller_id && (
                <button
                  onClick={toggleFollow}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm transition ${isFollowing ? "bg-primary/10 text-primary border border-primary/30" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <Heart className={`h-4 w-4 ${isFollowing ? "fill-primary" : ""}`} />
                  {isFollowing ? t("product.following") : t("product.follow")}
                </button>
              )}
              {user?.id !== p.seller_id && (
                <button
                  onClick={() => setMsgOpen((v) => !v)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border hover:border-primary hover:text-primary transition font-semibold text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("product.writeShop")}
                </button>
              )}
            </div>

            {msgOpen && (
              <div className="mt-1 bg-secondary/50 border border-border rounded-xl p-3 space-y-2">
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder={t("product.shopMsgPlaceholder")}
                  rows={3}
                  className="w-full p-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setMsgOpen(false); setMsgBody(""); }}
                    className="text-sm px-3 py-1.5 rounded-lg hover:bg-secondary"
                  >
                    {t("orders.cancelShort")}
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={msgSending || msgBody.trim().length < 2}
                    className="text-sm px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {msgSending ? "..." : t("common.send")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {p.description && (
            <div className="pt-4 border-t border-border">
              <h3 className="font-bold mb-2">{t("product.description")}</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{p.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-10">
        <ProductRecommendations mode="together" productId={p.id} />
        <ProductRecommendations mode="for_you" />
        <ProductReviews productId={p.id} />
      </div>
      <div className="fixed bottom-20 right-4 z-40 md:bottom-8">
        <CompareButton productId={p.id} />
      </div>
    </div>
  );
}
