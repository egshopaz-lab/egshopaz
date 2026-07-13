import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  images: string[];
  created_at: string;
}
interface ProductLite { id: string; title: string; image_url: string | null }
interface ProfileLite { full_name: string | null; avatar_url: string | null }

export function ShopReviews({ sellerId }: { sellerId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, ProductLite>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prods } = await supabase
        .from("products").select("id,title,image_url").eq("seller_id", sellerId);
      const pmap: Record<string, ProductLite> = {};
      (prods ?? []).forEach((p) => { pmap[p.id] = p as ProductLite; });
      setProducts(pmap);
      const ids = Object.keys(pmap);
      if (!ids.length) { setReviews([]); setLoading(false); return; }
      const { data: rev } = await supabase
        .from("reviews").select("*").in("product_id", ids)
        .order("created_at", { ascending: false }).limit(50);
      const list = (rev ?? []) as Review[];
      setReviews(list);
      const uids = [...new Set(list.map((r) => r.user_id))];
      if (uids.length) {
        const { data: profs } = await supabase
          .from("profiles_public").select("id,full_name,avatar_url").in("id", uids);
        const m: Record<string, ProfileLite> = {};
        (profs ?? []).forEach((p) => { if (p.id) m[p.id] = p as ProfileLite; });
        setProfiles(m);
      }
      setLoading(false);
    })();
  }, [sellerId]);

  if (loading) return <div className="text-muted-foreground text-sm">Yüklənir...</div>;
  if (!reviews.length) return (
    <div className="text-center py-12 bg-secondary/40 rounded-2xl text-muted-foreground">
      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
      Bu mağazaya hələ rəy yazılmayıb
    </div>
  );

  return (
    <div className="space-y-3">
      {reviews.map((r) => {
        const prof = profiles[r.user_id];
        const prod = products[r.product_id];
        const name = prof?.full_name || "İstifadəçi";
        return (
          <div key={r.id} className="p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {prof?.avatar_url
                  ? <img src={prof.avatar_url} alt={name} className="w-full h-full object-cover" />
                  : <span className="font-bold text-sm">{name[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-sm">{name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
                </div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  ))}
                </div>
                {r.comment && <p className="text-sm mt-2 text-foreground/90 whitespace-pre-line">{r.comment}</p>}
                {r.images?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {r.images.map((u, i) => (
                      <img key={i} src={u} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                    ))}
                  </div>
                )}
                {prod && (
                  <Link to="/product/$id" params={{ id: prod.id }} className="mt-3 flex items-center gap-2 p-2 bg-secondary/50 hover:bg-secondary rounded-xl transition">
                    {prod.image_url && <img src={prod.image_url} alt="" className="w-10 h-10 object-cover rounded-lg" />}
                    <span className="text-xs font-medium line-clamp-1">{prod.title}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
