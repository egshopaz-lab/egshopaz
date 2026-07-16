import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplacePromoHero } from "@/components/MarketplacePromoHero";

interface HomeBanner {
  id: string;
  title: string;
  image_url: string | null;
  mobile_image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  alt_text: string | null;
  ad_label: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
}

const isInternalLink = (url: string) => url.startsWith("/") && !url.startsWith("//");

export function HomeBannerCarousel() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const touchStart = useRef<number | null>(null);
  const viewed = useRef(new Set<string>());

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const now = Date.now();
      const { data } = await supabase
        .from("banners")
        .select(
          "id,title,image_url,mobile_image_url,video_url,link_url,alt_text,ad_label,starts_at,ends_at,priority",
        )
        .eq("is_active", true)
        .eq("position", "home_top")
        .order("priority", { ascending: false })
        .limit(12);
      if (!mounted) return;
      const deliverable = ((data ?? []) as HomeBanner[]).filter((banner) => {
        const started = !banner.starts_at || new Date(banner.starts_at).getTime() <= now;
        const activeNow = !banner.ends_at || new Date(banner.ends_at).getTime() > now;
        return (
          started &&
          activeNow &&
          Boolean(banner.image_url || banner.mobile_image_url || banner.video_url)
        );
      });
      setBanners(deliverable);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const banner = banners[active];
    if (!banner || viewed.current.has(banner.id)) return;
    viewed.current.add(banner.id);
    void supabase.rpc("record_banner_impression", { p_banner_id: banner.id });
  }, [active, banners]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % banners.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return (
      <section className="animate-pulse" aria-label="Banner yüklənir">
        <div className="h-[220px] rounded-3xl bg-secondary sm:h-[300px]" />
      </section>
    );
  }

  if (banners.length === 0) return <MarketplacePromoHero />;

  const banner = banners[active];
  const go = (delta: number) =>
    setActive((value) => (value + delta + banners.length) % banners.length);
  const followBanner = () => {
    if (!banner.link_url) return;
    void supabase.rpc("record_banner_click", { p_banner_id: banner.id });
    if (isInternalLink(banner.link_url)) window.location.assign(banner.link_url);
    else window.open(banner.link_url, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="group relative overflow-hidden rounded-3xl bg-slate-950 shadow-elegant"
      aria-roledescription="carousel"
      aria-label="Kampaniyalar"
      onTouchStart={(event) => {
        touchStart.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return;
        const distance =
          (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(distance) > 45) go(distance < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      <button
        type="button"
        onClick={followBanner}
        disabled={!banner.link_url}
        className="relative block h-[220px] w-full text-left sm:h-[300px] lg:h-[360px] disabled:cursor-default"
        aria-label={banner.alt_text || banner.title}
      >
        {banner.video_url ? (
          <video
            key={banner.video_url}
            src={banner.video_url}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <picture>
            {banner.mobile_image_url && (
              <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />
            )}
            <img
              key={banner.image_url || banner.mobile_image_url}
              src={banner.image_url || banner.mobile_image_url || ""}
              alt={banner.alt_text || banner.title}
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          </picture>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {banner.ad_label || "Reklam"}
        </span>
      </button>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Əvvəlki banner"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow transition hover:scale-105 sm:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Növbəti banner"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow transition hover:scale-105 sm:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-2 backdrop-blur">
            {banners.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`${index + 1}-ci banner`}
                className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-white" : "w-1.5 bg-white/55"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
