import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Sparkles, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { useTranslation } from "react-i18next";

type LooseClient = { from: (table: string) => any };
const db = supabase as unknown as LooseClient;

interface TrendPost {
  id: string;
  seller_id: string;
  title: string;
  body: string;
  media_url: string | null;
  media_type: "image" | "video";
  product_id: string | null;
  link_url: string | null;
  published_at: string | null;
  created_at: string;
  profiles?: { shop_name: string | null; shop_logo_url: string | null } | null;
  products?: {
    id: string;
    title: string;
    price: number;
    old_price: number | null;
    image_url: string | null;
  } | null;
}

export function TrendsFeed({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<TrendPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(compact ? 6 : 9);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await db
      .from("eg_trends_posts")
      .select(
        "id,seller_id,title,body,media_url,media_type,product_id,link_url,published_at,created_at,products(id,title,price,old_price,image_url)",
      )
      .eq("status", "visible")
      .order("sort_order", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(compact ? 6 : 60);
    if (error) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const rawPosts = (data ?? []) as TrendPost[];
    const sellerIds = Array.from(new Set(rawPosts.map((post) => post.seller_id).filter(Boolean)));
    const { data: storefronts } = sellerIds.length
      ? await db.from("profiles_public").select("id,shop_name,shop_logo_url").in("id", sellerIds)
      : { data: [] };
    const storefrontMap = new Map<string, NonNullable<TrendPost["profiles"]>>(
      (storefronts ?? []).map(
        (profile: { id: string; shop_name: string | null; shop_logo_url: string | null }) => [
          profile.id,
          profile,
        ],
      ),
    );
    setPosts(
      rawPosts.map((post) => ({ ...post, profiles: storefrontMap.get(post.seller_id) ?? null })),
    );
    setLoading(false);
  }, [compact]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(compact ? "home-eg-trends" : "public-eg-trends")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eg_trends_posts" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eg_trends_subscriptions" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [compact, load]);

  useEffect(() => {
    if (compact || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(posts.length, count + 9));
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [compact, posts.length]);

  const visiblePosts = useMemo(() => posts.slice(0, visibleCount), [posts, visibleCount]);

  return (
    <section className={compact ? "space-y-4" : "container mx-auto px-4 py-6 space-y-5"}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-10 w-10 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className={compact ? "text-2xl font-black" : "text-3xl font-black"}>EG Trends</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{t("trendsFeed.description")}</p>
        </div>
        {compact && (
          <Link
            to="/trends"
            className="text-sm font-bold text-primary inline-flex items-center gap-1"
          >
            {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: compact ? 3 : 6 }).map((_, index) => (
            <div key={index} className="h-72 bg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-10 sm:py-12 text-center border border-dashed border-violet-200 bg-violet-50/40 rounded-2xl">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="mt-3 font-semibold text-foreground">{t("trendsFeed.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("trendsFeed.emptyDesc")}</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col"
              >
                {post.media_url &&
                  (post.media_type === "video" ? (
                    <video
                      src={post.media_url}
                      poster={post.products?.image_url ?? undefined}
                      className="w-full aspect-[9/14] max-h-[560px] object-cover bg-black"
                      muted
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt={post.title}
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                  ))}

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-7 w-7 rounded-full bg-secondary overflow-hidden inline-flex items-center justify-center">
                      {post.profiles?.shop_logo_url ? (
                        <img
                          src={post.profiles.shop_logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <b className="text-foreground">
                      {post.profiles?.shop_name || t("trendsFeed.sellerFallback")}
                    </b>
                    <span>·</span>
                    <span>{formatDate(post.published_at ?? post.created_at)}</span>
                  </div>
                  <h3 className="font-black text-lg mt-3">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line line-clamp-5">
                    {post.body}
                  </p>

                  {post.products && (
                    <Link
                      to="/product/$id"
                      params={{ id: post.products.id }}
                      className="mt-4 flex items-center gap-3 rounded-xl bg-secondary/60 p-3"
                    >
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                        {post.products.image_url && (
                          <img
                            src={post.products.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-sm">{post.products.title}</b>
                        <span className="font-black text-primary">
                          {formatAZN(post.products.price)}
                        </span>
                      </span>
                      <span className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground">
                        İndi al
                      </span>
                    </Link>
                  )}

                  <div className="mt-auto pt-4 flex gap-3">
                    {post.link_url && (
                      <a
                        href={post.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-primary inline-flex items-center gap-1"
                      >
                        {t("common.details")} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Link
                      to="/shop/$id"
                      params={{ id: post.seller_id }}
                      className="text-sm font-bold ml-auto"
                    >
                      {t("shop.title")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!compact && visibleCount < posts.length && (
            <div
              ref={sentinelRef}
              className="h-12 flex items-center justify-center text-sm text-muted-foreground"
            >
              Daha çox trend yüklənir...
            </div>
          )}
        </>
      )}
    </section>
  );
}
