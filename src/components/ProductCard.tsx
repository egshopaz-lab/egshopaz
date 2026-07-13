import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatAZN, calcDiscount } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useFavorite } from "@/hooks/useFavorite";

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
}

export function ProductCard({ p, enableFavorite = true }: { p: ProductCardData; enableFavorite?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const { isFav, toggle: toggleFav, busy: favBusy } = useFavorite(p.id, enableFavorite);
  const discount = calcDiscount(Number(p.price), p.old_price ? Number(p.old_price) : undefined);
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
          if (on) v.play().catch(() => {}); else v.pause();
        });
      },
      { threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [p.video_url]);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error(t("cart.loginRequired")); return; }
    setAdding(true);
    const { data: existing } = await supabase
      .from("cart_items").select("id, quantity")
      .eq("user_id", user.id).eq("product_id", p.id).maybeSingle();
    let error: { message: string } | null = null;
    if (existing) {
      ({ error } = await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: p.id, quantity: 1 }));
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
      className="group min-w-0 flex flex-col rounded-xl overflow-hidden bg-card h-full min-h-[420px]"
    >
      <div ref={wrapRef} className="relative aspect-[3/4.2] bg-secondary overflow-hidden rounded-xl">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title} loading="lazy"
               className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
        )}
        {p.video_url && (
          <video
            ref={videoRef}
            src={p.video_url}
            muted loop playsInline preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${videoVisible ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-discount text-discount-foreground text-xs font-extrabold px-2 py-0.5 rounded-md">
            -{discount}%
          </span>
        )}
        {enableFavorite && (
          <button
            onClick={toggleFav}
            disabled={favBusy}
            className={`absolute top-2 right-2 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center transition ${isFav ? "text-discount" : "text-foreground/70 hover:text-discount"}`}
            aria-label={t("product.addToFavorites")}
          >
            <Heart className={`h-5 w-5 ${isFav ? "fill-discount" : ""}`} />
          </button>
        )}
      </div>

      <div className="pt-2.5 pb-1.5 px-1.5 flex flex-col gap-1.5 flex-1 justify-between">
        <div className="flex items-baseline gap-2 min-w-0 h-6">
          <span className="text-lg sm:text-xl font-black text-discount leading-none">
            {formatAZN(p.price)}
          </span>
          {p.old_price && Number(p.old_price) > Number(p.price) && (
            <span className="text-[12px] sm:text-[13px] text-muted-foreground line-through">{formatAZN(p.old_price)}</span>
          )}
        </div>
        <p className="text-[13px] sm:text-sm line-clamp-2 text-foreground/85 leading-snug min-h-[2.25rem]">
          {p.brand && <span className="font-bold mr-1">{p.brand}</span>}
          {p.title}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto h-4">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{Number(p.rating).toFixed(1)}</span>
          <span>· {p.reviews_count}</span>
        </div>
        <button
          onClick={addToCart}
          disabled={adding}
          className="mt-1 w-full h-10 flex items-center justify-center bg-gradient-brand text-primary-foreground disabled:opacity-60 rounded-lg text-sm font-bold transition hover:opacity-95"
        >
          {t("product.addToCart")}
        </button>
      </div>
    </Link>
  );
}
