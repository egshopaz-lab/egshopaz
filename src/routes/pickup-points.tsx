import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { MapPin, Clock, Phone, Search } from "lucide-react";

export const Route = createFileRoute("/pickup-points")({
  head: () => ({ meta: [{ title: "Çatdırış nöqtələri — EG Shop" }] }),
  component: PickupPointsPage,
});

interface PVZ { id: string; name: string; city: string; address: string; working_hours: string; point_number: number | null }

function PickupPointsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items } = useBuyerNav();
  const [list, setList] = useState<PVZ[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("pickup_points").select("*").eq("is_active", true).order("point_number", { ascending: true })
      .then(({ data }) => setList((data ?? []) as PVZ[]));
  }, []);

  const filtered = list.filter((p) =>
    !q || p.city.toLowerCase().includes(q.toLowerCase()) || p.address.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase()) || String(p.point_number ?? "").includes(q)
  );

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user?.email ?? t("pickupPoints.title")} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> {t("pickupPoints.title")}</h1>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchPlaceholder")}
                 className="w-full pl-10 pr-4 h-11 rounded-lg border border-input bg-background" />
        </div>
        {filtered.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
            {t("pickupPoints.noPoints")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="font-bold mb-1">#{p.point_number ?? "-"} · {p.name}</div>
                <div className="text-xs text-primary font-semibold mb-2">{p.city}</div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {p.address}</div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {p.working_hours}</div>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
