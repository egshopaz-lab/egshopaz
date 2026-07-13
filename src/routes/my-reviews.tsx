import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/my-reviews")({
  head: () => ({ meta: [{ title: "Rəylərim — EG Shop" }] }),
  component: MyReviewsPage,
});

interface Review {
  id: string; rating: number; comment: string | null; created_at: string;
  product_id: string; products: { title: string; image_url: string | null } | null;
}

function MyReviewsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = () => {
    if (!user) return;
    supabase.from("reviews").select("*, products(title,image_url)").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data ?? []) as unknown as Review[]));
  };
  useEffect(load, [user]);

  const remove = async (id: string) => {
    if (!confirm("Rəyi silmək istəyirsiniz?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error("Silinmədi"); else { toast.success("Silindi"); load(); }
  };

  if (!user) return null;

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user.email ?? undefined} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><Star className="h-6 w-6 text-primary" /> {t("myReviews.title")}</h1>
        {reviews.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
            {t("myReviews.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Link to="/product/$id" params={{ id: r.product_id }} className="w-16 h-16 rounded-lg bg-secondary overflow-hidden shrink-0">
                    {r.products?.image_url && <img src={r.products.image_url} alt="" className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to="/product/$id" params={{ id: r.product_id }} className="font-semibold hover:text-primary line-clamp-1">
                      {r.products?.title ?? "Məhsul"}
                    </Link>
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">{formatDate(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="text-sm mt-2 text-foreground/80">{r.comment}</p>}
                  </div>
                  <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
