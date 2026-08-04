import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, ShoppingBag, Sparkles, Store, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN } from "@/lib/format";
import { useTranslation } from "react-i18next";

const db = supabase as any;
interface TrendPost {
  id:string; seller_id:string; shop_id:string|null; title:string; body:string; media_url:string|null;
  media_type:"image"|"video"; product_id:string|null; link_url:string|null; published_at:string|null; created_at:string;
  shop?:{id:string;name:string;logo_url:string|null;city:string|null}|null;
  seller?:{id:string;shop_name:string|null;shop_logo_url:string|null}|null;
  products?:{id:string;title:string;price:number;old_price:number|null;image_url:string|null}|null;
}

export function TrendsFeed({ compact=false }:{ compact?:boolean }) {
  const {t}=useTranslation();
  const [posts,setPosts]=useState<TrendPost[]>([]);
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    const {data,error}=await db.from("eg_trends_posts")
      .select("id,seller_id,shop_id,title,body,media_url,media_type,product_id,link_url,published_at,created_at,products(id,title,price,old_price,image_url)")
      .eq("status","visible").order("sort_order",{ascending:false}).order("published_at",{ascending:false}).limit(compact?8:60);
    if(error){setPosts([]);setLoading(false);return;}
    const raw=(data??[]) as TrendPost[];
    const shopIds=[...new Set(raw.map(x=>x.shop_id).filter(Boolean))] as string[];
    const sellerIds=[...new Set(raw.map(x=>x.seller_id).filter(Boolean))] as string[];
    const [shopsResult,sellersResult]=await Promise.all([
      shopIds.length?db.from("shops").select("id,name,logo_url,city").in("id",shopIds):Promise.resolve({data:[]}),
      sellerIds.length?db.from("profiles_public").select("id,shop_name,shop_logo_url").in("id",sellerIds):Promise.resolve({data:[]}),
    ]);
    const shops=new Map<string,NonNullable<TrendPost["shop"]>>((shopsResult.data??[]).map((x:any)=>[x.id,x]));
    const sellers=new Map<string,NonNullable<TrendPost["seller"]>>((sellersResult.data??[]).map((x:any)=>[x.id,x]));
    setPosts(raw.map(post=>({...post,shop:post.shop_id?shops.get(post.shop_id)??null:null,seller:sellers.get(post.seller_id)??null})));
    setLoading(false);
  },[compact]);
  useEffect(()=>{void load();const channel=supabase.channel(compact?"home-trends-reels":"trends-reels").on("postgres_changes",{event:"*",schema:"public",table:"eg_trends_posts"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(channel);};},[compact,load]);

  if(compact)return <section className="space-y-4"><Header t={t}/>{loading?<Skeleton compact/>:posts.length===0?<Empty t={t}/>:<div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">{posts.map(post=><CompactCard key={post.id} post={post}/>)}</div>}<div className="text-right"><Link to="/trends" className="inline-flex items-center gap-1 text-sm font-black text-primary">Hamısına bax <ArrowRight className="h-4 w-4"/></Link></div></section>;

  return <section className="min-h-screen bg-[#09090b] text-white"><div className="mx-auto max-w-6xl px-3 py-5"><Header t={t} dark/>{loading?<Skeleton/>:posts.length===0?<Empty t={t}/>:<div className="h-[calc(100dvh-130px)] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-3xl bg-black">{posts.map(post=><Reel key={post.id} post={post}/>)}</div>}</div></section>;
}

function Header({t,dark=false}:{t:(key:string)=>string;dark?:boolean}){return <div className="flex items-end justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white"><Sparkles className="h-5 w-5"/></span><h1 className="text-2xl font-black">EG Trends</h1></div><p className={`mt-2 text-sm ${dark?"text-zinc-400":"text-muted-foreground"}`}>{t("trendsFeed.description")}</p></div></div>}
function CompactCard({post}:{post:TrendPost}){const shopName=post.shop?.name??post.seller?.shop_name??"EG Shop satıcısı";return <Link to="/trends" className="relative block aspect-[9/14] min-w-[220px] snap-start overflow-hidden rounded-2xl bg-zinc-900 sm:min-w-0">{post.media_url?(post.media_type==="video"?<video src={post.media_url} poster={post.products?.image_url??undefined} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={post.media_url} alt={post.title} loading="lazy" className="h-full w-full object-cover"/>):<div className="grid h-full place-items-center"><Sparkles/></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-4 text-white"><div className="text-xs font-bold text-white/75">{shopName}</div><h3 className="mt-1 line-clamp-2 font-black">{post.title}</h3>{post.products&&<div className="mt-2 text-sm font-black text-violet-300">{formatAZN(post.products.price)}</div>}</div></Link>}
function Reel({post}:{post:TrendPost}){const articleRef=useRef<HTMLElement|null>(null);const videoRef=useRef<HTMLVideoElement|null>(null);const [muted,setMuted]=useState(true);useEffect(()=>{const element=articleRef.current;if(!element)return;const observer=new IntersectionObserver(entries=>{const visible=(entries[0]?.intersectionRatio??0)>0.7;if(videoRef.current){if(visible)void videoRef.current.play().catch(()=>{});else videoRef.current.pause();}},{threshold:[0.25,0.7,0.95]});observer.observe(element);return()=>observer.disconnect();},[]);const shopId=post.shop?.id??post.shop_id;const shopName=post.shop?.name??post.seller?.shop_name??"EG Shop satıcısı";const logo=post.shop?.logo_url??post.seller?.shop_logo_url;return <article ref={articleRef} className="relative mx-auto flex h-full min-h-[640px] w-full snap-start items-center justify-center overflow-hidden bg-black"><div className="relative h-full w-full max-w-[520px] overflow-hidden sm:rounded-3xl">{post.media_url?(post.media_type==="video"?<video ref={videoRef} src={post.media_url} poster={post.products?.image_url??undefined} muted={muted} loop playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={post.media_url} alt={post.title} className="h-full w-full object-cover"/>):<div className="grid h-full place-items-center bg-zinc-900"><Sparkles className="h-12 w-12 text-violet-400"/></div>}<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/20"/>{post.media_type==="video"&&<button onClick={()=>setMuted(!muted)} className="absolute right-4 top-4 rounded-full bg-black/50 p-3 backdrop-blur" aria-label={muted?"Səsi aç":"Səsi bağla"}>{muted?<VolumeX className="h-5 w-5"/>:<Volume2 className="h-5 w-5"/>}</button>}<div className="absolute inset-x-0 bottom-0 p-5 pb-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/20 bg-zinc-800">{logo?<img src={logo} alt="" className="h-full w-full object-cover"/>:<Store className="h-5 w-5"/>}</span><div className="min-w-0 flex-1"><b className="block truncate">{shopName}</b>{post.shop?.city&&<span className="text-xs text-white/65">{post.shop.city}</span>}</div>{shopId&&<Link to="/shop/$id" params={{id:shopId}} className="rounded-full border border-white/30 bg-black/35 px-4 py-2 text-xs font-black backdrop-blur">Mağazaya keç</Link>}</div><h2 className="mt-4 text-xl font-black">{post.title}</h2><p className="mt-1 line-clamp-3 text-sm text-white/80">{post.body}</p>{post.products&&<Link to="/product/$id" params={{id:post.products.id}} className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur"><span className="h-14 w-14 overflow-hidden rounded-xl bg-zinc-800">{post.products.image_url&&<img src={post.products.image_url} alt="" className="h-full w-full object-cover"/>}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{post.products.title}</b><span className="font-black text-violet-300">{formatAZN(post.products.price)}</span></span><span className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-black"><ShoppingBag className="h-4 w-4"/>Məhsula bax</span></Link>}{post.link_url&&<a href={post.link_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/75">Ətraflı keçid <ExternalLink className="h-3.5 w-3.5"/></a>}</div></div></article>}
function Skeleton({compact=false}:{compact?:boolean}){return <div className={compact?"flex gap-3 overflow-hidden":"h-[70dvh] rounded-3xl bg-zinc-900"}>{compact&&Array.from({length:4}).map((_,i)=><div key={i} className="aspect-[9/14] min-w-[220px] animate-pulse rounded-2xl bg-secondary"/>)}</div>}
function Empty({t}:{t:(key:string)=>string}){return <div className="rounded-2xl border border-dashed border-violet-300/30 p-12 text-center"><Sparkles className="mx-auto h-8 w-8 text-violet-500"/><p className="mt-3 font-black">{t("trendsFeed.empty")}</p><p className="mt-1 text-sm opacity-60">{t("trendsFeed.emptyDesc")}</p></div>}
