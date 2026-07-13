import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface Banner {
  id: string;
  title: string;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  seller_id: string | null;
}

const ROTATE_MS = 6000;

export function SellerBanners() {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    void (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("banners")
        .select("id,title,image_url,video_url,link_url,ends_at,seller_id,created_at")
        .eq("is_active", true)
        .eq("position", "home_top")
        .not("seller_id", "is", null)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(50);
      const bySeller = new Map<string, Banner>();
      for (const b of (data ?? []) as Banner[]) {
        if (!b.image_url && !b.video_url) continue;
        if (!b.seller_id) continue;
        if (!bySeller.has(b.seller_id)) bySeller.set(b.seller_id, b);
      }
      setBanners(Array.from(bySeller.values()));
    })();
  }, []);

  // Auto-rotate: video → next when ended; image → next on timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const current = banners[idx];
    if (current?.video_url) return; // handled by onEnded
    const t = setTimeout(() => setIdx((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [idx, banners]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    void v.play().catch(() => { /* ignore */ });
  }, [idx]);

  if (banners.length === 0) return null;

  const b = banners[idx];
  const next = () => setIdx((i) => (i + 1) % banners.length);

  const Inner = (
    <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] bg-secondary overflow-hidden">
      {/* Blurred backdrop to fill sides instead of black */}
      {b.image_url && (
        <img
          src={b.image_url}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
        />
      )}

      {b.video_url ? (
        <video
          ref={videoRef}
          key={b.id}
          src={b.video_url}
          poster={b.image_url ?? undefined}
          className="relative w-full h-full object-cover"
          muted
          autoPlay
          playsInline
          preload="metadata"
          onEnded={next}
        />
      ) : (
        <img
          src={b.image_url!}
          alt={b.title}
          fetchPriority="high"
          decoding="async"
          className="relative w-full h-full object-cover"
        />

      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      <div className="absolute top-3 left-3 bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
        {t("ads.adShort")}
      </div>

      <div className="absolute bottom-4 left-5 right-5 text-white font-black text-lg sm:text-2xl drop-shadow-lg line-clamp-2">
        {b.title}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setIdx(i); }}
              aria-label={t("ads.adAria", { index: i + 1 })}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="rounded-3xl overflow-hidden shadow-elegant">
      {b.link_url ? <a href={b.link_url} className="block">{Inner}</a> : Inner}
    </section>
  );
}
