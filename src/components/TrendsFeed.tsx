import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Sparkles, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { useTranslation } from "react-i18next";

type LooseClient = { from: (table: string) => any };
const db = supabase as unknown as LooseClient;

interface TrendPost {
  id: string; seller_id: string; title: string; body: string; media_url: string | null;
  link_url: string | null; published_at: string | null; created_at: string;
  profiles?: { shop_name: string | null; shop_logo_url: string | null } | null;
}

export function TrendsFeed({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<TrendPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await db.from("eg_trends_posts")
      .select("id,seller_id,title,body,media_url,link_url,published_at,created_at,profiles!eg_trends_posts_seller_id_fkey(shop_name,shop_logo_url)")
      .eq("status", "visible")
      .order("sort_order", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(compact ? 6 : 60);
    setPosts((data ?? []) as TrendPost[]);
    setLoading(false);
  }, [compact]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(compact ? "home-eg-trends" : "public-eg-trends")
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_posts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_subscriptions" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [compact, load]);

  return <section className={compact ? "space-y-4" : "container mx-auto px-4 py-6 space-y-5"}>
    <div className="flex items-end justify-between gap-3">
      <div><div className="flex items-center gap-2"><span className="h-10 w-10 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center"><Sparkles className="h-5 w-5" /></span><h2 className={compact ? "text-2xl font-black" : "text-3xl font-black"}>EG Trends</h2></div><p className="text-sm text-muted-foreground mt-2">{t("trendsFeed.description")}</p></div>
      {compact && <Link to="/trends" className="text-sm font-bold text-primary inline-flex items-center gap-1">{t("common.viewAll")} <ArrowRight className="h-4 w-4" /></Link>}
    </div>
    {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: compact ? 3 : 6 }).map((_, i) => <div key={i} className="h-72 bg-secondary rounded-lg animate-pulse" />)}</div> : posts.length === 0 ? <div className="py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground">{t("trendsFeed.empty")}</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{posts.map((post) => <article key={post.id} className="border border-border rounded-lg bg-card overflow-hidden flex flex-col">{post.media_url && <img src={post.media_url} alt={post.title} className="w-full aspect-video object-cover" loading="lazy" />}<div className="p-4 flex-1 flex flex-col"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-7 w-7 rounded-full bg-secondary overflow-hidden inline-flex items-center justify-center">{post.profiles?.shop_logo_url ? <img src={post.profiles.shop_logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-3.5 w-3.5" />}</span><b className="text-foreground">{post.profiles?.shop_name || t("trendsFeed.sellerFallback")}</b><span>·</span><span>{formatDate(post.published_at ?? post.created_at)}</span></div><h3 className="font-black text-lg mt-3">{post.title}</h3><p className="text-sm text-muted-foreground mt-2 whitespace-pre-line line-clamp-5">{post.body}</p><div className="mt-auto pt-4 flex gap-3">{post.link_url && <a href={post.link_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary inline-flex items-center gap-1">{t("common.details")} <ExternalLink className="h-3.5 w-3.5" /></a>}<Link to="/shop/$id" params={{ id: post.seller_id }} className="text-sm font-bold ml-auto">{t("shop.title")}</Link></div></div></article>)}</div>}
  </section>;
}

