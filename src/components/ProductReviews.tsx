import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  images: string[];
  created_at: string;
}
interface ProfileMap { [id: string]: { full_name: string | null; avatar_url: string | null } }

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("reviews").select("*")
      .eq("product_id", productId).order("created_at", { ascending: false });
    const list = (data ?? []) as Review[];
    setReviews(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles_public").select("id,full_name,avatar_url").in("id", ids);
      const map: ProfileMap = {};
      (profs ?? []).forEach((p) => { if (p.id) map[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
      setProfiles(map);
    }
  };
  useEffect(() => { load(); }, [productId]);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  const submit = async () => {
    if (!user) { toast.error("Rəy üçün daxil olun"); return; }
    if (myReview) { toast.error("Siz artıq rəy yazmısınız"); return; }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, 4)) {
        const path = `${user.id}/${productId}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("product-images").upload(path, f);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
          urls.push(publicUrl);
        }
      }
      const { error } = await supabase.from("reviews").insert({
        product_id: productId, user_id: user.id, rating, comment: comment.trim() || null, images: urls,
      });
      if (error) throw error;

      // Aggregate is recomputed automatically by DB trigger

      toast.success("Rəyiniz əlavə olundu");
      setComment(""); setFiles([]); setRating(5);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="pt-6 border-t border-border space-y-5">
      <h3 className="text-xl font-extrabold flex items-center gap-2">
        <Star className="h-5 w-5 text-warning fill-warning" /> Rəylər ({reviews.length})
      </h3>

      {user && !myReview && (
        <div className="bg-secondary/40 rounded-2xl p-4 space-y-3">
          <div className="font-bold text-sm">Rəyinizi yazın</div>
          <div className="flex gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} ulduz`}>
                <Star className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
                    placeholder="Məhsul haqqında fikriniz..."
                    className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-input cursor-pointer text-xs font-medium hover:bg-accent">
                📷 Şəkil çək
                <input type="file" accept="image/*" capture="environment" className="hidden"
                       onChange={(e) => setFiles((prev) => [...prev, ...[...(e.target.files ?? [])]].slice(0, 4))} />
              </label>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-input cursor-pointer text-xs font-medium hover:bg-accent">
                🖼 Qalereyadan seç
                <input type="file" accept="image/*" multiple className="hidden"
                       onChange={(e) => setFiles((prev) => [...prev, ...[...(e.target.files ?? [])]].slice(0, 4))} />
              </label>
            </div>
            {files.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                            className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground">Maksimum 4 şəkil. Məhsulun şəklini çəkib rəyinizlə birlikdə göndərin.</div>
          </div>
          <button onClick={submit} disabled={busy}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-bold inline-flex items-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" /> {busy ? "Göndərilir..." : "Rəyi göndər"}
          </button>
        </div>
      )}

      {!user && (
        <div className="bg-secondary/40 rounded-2xl p-4 text-sm text-muted-foreground">
          Rəy yazmaq üçün hesaba daxil olun.
        </div>
      )}

      <div className="space-y-3">
        {reviews.length === 0 && <div className="text-sm text-muted-foreground">Hələ rəy yoxdur. İlk olun!</div>}
        {reviews.map((r) => {
          const prof = profiles[r.user_id];
          return (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-bold">
                  {prof?.avatar_url ? <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" /> : (prof?.full_name?.[0] ?? "U")}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{prof?.full_name ?? "İstifadəçi"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-foreground/90 whitespace-pre-line">{r.comment}</p>}
              {r.images?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
