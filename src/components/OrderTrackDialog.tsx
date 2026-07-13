import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapView, type MapMarker } from "@/components/MapView";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  pickupPointId: string | null;
  courierId?: string | null;
  buyerAddress?: { city: string; street: string } | null;
}

export function OrderTrackDialog({ open, onClose, orderId, pickupPointId, courierId, buyerAddress }: Props) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const out: MapMarker[] = [];
      if (pickupPointId) {
        const { data } = await supabase.from("pickup_points").select("name,city,address,lat,lng").eq("id", pickupPointId).maybeSingle();
        if (data?.lat && data?.lng) out.push({
          id: "pvz", lat: Number(data.lat), lng: Number(data.lng), kind: "pvz",
          title: `📦 ${data.name}`, description: `${data.city} · ${data.address}`,
        });
      }
      // user's default address
      const { data: addr } = await supabase.from("addresses").select("title,city,street,lat,lng").order("is_default", { ascending: false }).limit(1).maybeSingle();
      if (addr?.lat && addr?.lng) out.push({
        id: "addr", lat: Number(addr.lat), lng: Number(addr.lng), kind: "address",
        title: `🏠 ${addr.title}`, description: `${addr.city} · ${addr.street}`,
      });
      if (courierId) {
        const { data: c } = await supabase.from("couriers_public").select("full_name,city,lat,lng").eq("id", courierId).maybeSingle();
        if (c?.lat && c?.lng) out.push({
          id: "cour", lat: Number(c.lat), lng: Number(c.lng), kind: "courier",
          title: `🚚 ${c.full_name}`, description: c.city ?? undefined,
        });
      }
      if (!cancelled) setMarkers(out);
    })();
    return () => { cancelled = true; };
  }, [open, orderId, pickupPointId, courierId]);

  // Realtime courier
  useEffect(() => {
    if (!open || !courierId) return;
    const ch = supabase.channel(`track-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "couriers", filter: `id=eq.${courierId}` }, (payload: any) => {
        setMarkers((prev) => prev.map((m) => m.id === "cour" ? { ...m, lat: Number(payload.new.lat), lng: Number(payload.new.lng) } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, courierId, orderId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="font-bold">Sifariş izləmə</div>
            <div className="text-xs text-muted-foreground">№ {orderId.slice(0, 8).toUpperCase()}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">
          {markers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">Hələlik koordinat məlumatı yoxdur. Satıcı/PVZ şəhər seçəndə xəritə görünəcək.</div>
          ) : (
            <MapView markers={markers} height={420} />
          )}
        </div>
      </div>
    </div>
  );
}
