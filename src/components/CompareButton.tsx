import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function CompareButton({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("compare_items").select("id").eq("user_id", user.id).eq("product_id", productId).maybeSingle()
      .then(({ data }) => setActive(!!data));
  }, [user, productId]);

  const toggle = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (active) {
      await supabase.from("compare_items").delete().eq("user_id", user.id).eq("product_id", productId);
      setActive(false);
      toast.success(t("compare.removed"));
    } else {
      const { count } = await supabase.from("compare_items").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count ?? 0) >= 4) { toast.error(t("compare.max")); return; }
      const { error } = await supabase.from("compare_items").insert({ user_id: user.id, product_id: productId });
      if (error) { toast.error(error.message); return; }
      setActive(true);
      toast.success(t("compare.added"), {
        action: { label: t("compare.view"), onClick: () => navigate({ to: "/compare" }) },
      });
    }
  };

  return (
    <button onClick={toggle} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${active ? "border-primary text-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
      <Scale className="h-4 w-4" /> {active ? t("compare.inCompare") : t("compare.compare")}
    </button>
  );
}
