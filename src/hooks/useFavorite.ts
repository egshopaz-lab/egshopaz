import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useFavorite(productId: string, enabled = true) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) { setIsFav(false); return; }
    if (!user?.id) { setIsFav(false); return; }
    let active = true;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("product_id", productId).maybeSingle()
      .then(({ data, error }) => { if (active && !error) setIsFav(!!data); });
    return () => { active = false; };
  }, [enabled, user?.id, productId]);

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!enabled) return;
    if (!user) { toast.error("Sevimlilər üçün daxil olun"); return; }
    if (busy) return;
    setBusy(true);
    if (isFav) {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
      if (error) { toast.error(`Sevimlilər yenilənmədi: ${error.message}`); setBusy(false); return; }
      setIsFav(false);
      toast.success("Sevimlilərdən çıxarıldı");
    } else {
      const { error } = await supabase
        .from("favorites")
        .upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id" });
      if (error) { toast.error(`Sevimlilərə əlavə olunmadı: ${error.message}`); setBusy(false); return; }
      setIsFav(true);
      toast.success("Sevimlilərə əlavə olundu");
    }
    setBusy(false);
  };

  return { isFav, toggle, busy };
}
