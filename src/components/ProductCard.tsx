import { Link } from "@tanstack/react-router";
import { BadgeCheck, Heart, ImageOff, ShoppingCart, Star, Store, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatAZN, calcDiscount } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useFavorite } from "@/hooks/useFavorite";
import { addGuestCartItem } from "@/lib/guestCart";

export interface ProductCardData {
  id: string;
  title: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  video_url?: string | null;
  rating: number;
  reviews_count: number;
  brand: string | null;
  delivery_days_min?: number | null;
  delivery_days_max?: number | null;
  delivery_city?: string | null;
  free_shipping?: boolean | null;
  fast_delivery?: boolean | null;
  stock?: number | null;
  seller_id?: string | null;
  profiles?: {
    shop_name: string | null;
    full_name: string | null;
    shop_city?: string | null;
  } | null;
}

export function ProductCard({
  p,
  enableFavorite = true,
}: {
  p: ProductCardData;
  enableFavorite?: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const { isFav, toggle: toggleFav, busy: favBusy } = useFavorite(p.id, enableFavorite);
  const discount = calcDiscount(Number(p.price), p.old_price ? Number(p.old_price) : undefined);
  const shopName = p.profiles?.shop_name || p.profiles?.full_name || null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);

  useEffect(() => {
    if (!p.video_url || !wrapRef.current) return;
    const el = wrapRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const on = entry.isIntersecting && entry.intersectionRatio > 0.5;
          setVideoVisible(on);
          const v = videoRef.current;
          if (!v) return;
          if (on) v.play().catch(() => {});
          else v.pause();
        });
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [p.video_url]);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      addGuestCartItem(p.id);
      toast.success(t("product.addedToCart"));
      return;
    }
    setAdding(true);
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", p.id)
      .maybeSingle();
    let error: { message: string } | null = null;
    if (existing) {
      ({ error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("cart_items")
        .insert({ user_id: user.id, product_id: p.id, quantity: 1 }));
    }
    if (error) {
      toast.error(t("product.cartUpdateError", { message: error.message }));
      setAdding(false);
      return;
    }
    toast.success(t("product.addedToCart"));
    setAdding(false);
  };

  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group product-card flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-transparent bg-card p-1 transition duration-300 hover:-translate-y-1 hover:border-violet-100 hover:shadow-[0_18px_40px_-22px_rgba(88,28,135,.45)]"
    >
      <div ref={wrapRef} className="relative aspect-[3/4] overflow-hidden rounded-[0.8rem] bg-secondary">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.title}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span>ĹžÉ™kil yoxdur</span>
          </div>
        )}
        {p.video_url && (
          <video
            ref={videoRef}
            src={p.video_url}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${videoVisible ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {discount > 0 && (
          <span className="absolute bottom-2 left-2 rounded-md bg-discount px-2 py-0.5 text-xs font-extrabold text-discount-foreground shadow-sm">
            -{discount}%
          </span>
        )}
        {enableFavorite && (
          <button
            onClick={toggleFav}
            disabled={favBusy}
            className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition ${isFav ? "text-discount" : "text-foreground/70 hover:text-discount"}`}
            aria-label={t("product.addToFavorites")}
          >
            <Heart className={`h-5 w-5 ${isFav ? "fill-discount" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-1.5 pb-1.5 pt-2.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-lg font-black leading-none text-foreground sm:text-xl">
            {formatAZN(p.price)}
          </span>
          {p.old_price && Number(p.old_price) > Number(p.price) && (
            <span className="text-[12px] sm:text-[13px] text-muted-foreground line-through">
              {formatAZN(p.old_price)}
            </span>
          )}
        </div>
        <p className="line-clamp-2 min-h-[2.25rem] text-[13px] leading-snug text-foreground/75 sm:text-sm">
          {p.brand && <span className="font-bold mr-1">{p.brand}</span>}
          {p.title}
        </p>
        <div className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-primary/90">
          <Store className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            MaÄźaza: {shopName ?? "EG Shop satÄ±cÄ±sÄ±"}
          </span>
          {shopName && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="TÉ™sdiqlÉ™nmiĹź maÄźaza" />}
        </div>
        <div className="mt-auto flex h-4 items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{Number(p.rating).toFixed(1)}</span>
          <span>Â· {p.reviews_count}</span>
        </div>
        {(p.fast_delivery || p.free_shipping || p.delivery_days_min) && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {p.fast_delivery
                ? t("catalog.fastDelivery")
                : p.free_shipping
                  ? t("catalog.freeShipping")
                  : `${p.delivery_days_min} ${t("catalog.daysShort")}`}
            </span>
          </div>
        )}
        <button
          onClick={addToCart}
          disabled={adding || (p.stock != null && p.stock <= 0)}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-brand text-xs font-extrabold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-60 sm:h-10 sm:text-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>
            {p.stock != null && p.stock <= 0 ? t("product.outOfStock") : t("product.addToCart")}
          </span>
        </button>
      </div>
    </Link>
  );
}

