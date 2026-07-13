import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapView } from "@/components/MapView";
import { MapPin, Truck, Package, CheckCircle } from "lucide-react";

interface Props { orderItemId: string }

interface OrderInfo {
  status: string;
  pickup_code: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  pickup_point: { name: string; address: string; city: string; lat: number | null; lng: number | null } | null;
  courier: { full_name: string; phone: string; lat: number | null; lng: number | null; vehicle_type: string } | null;
}

const STATUS_FLOW = [
  { key: "pending", label: "Sifariş qəbul olundu", icon: Package },
  { key: "shipped", label: "Yola çıxıb", icon: Truck },
  { key: "ready", label: "PVZ-də hazırdır", icon: MapPin },
  { key: "delivered", label: "Təhvil verildi", icon: CheckCircle },
];

export function OrderTrackingMap({ orderItemId }: Props) {
  const [info, setInfo] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: item } = await supabase.from("order_items")
        .select("status, pickup_code, accepted_at, delivered_at, pickup_point_id, courier_id")
        .eq("id", orderItemId).maybeSingle();
      if (!item || !active) { setLoading(false); return; }

      const [pvzRes, courierRes] = await Promise.all([
        item.pickup_point_id
          ? supabase.from("pickup_points").select("name, address, city, lat, lng").eq("id", item.pickup_point_id).maybeSingle()
          : Promise.resolve({ data: null }),
        item.courier_id
          ? supabase.from("couriers_public").select("full_name, lat, lng, vehicle_type").eq("id", item.courier_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (active) {
        setInfo({
          status: item.status,
          pickup_code: item.pickup_code,
          accepted_at: item.accepted_at,
          delivered_at: item.delivered_at,
          pickup_point: pvzRes.data as any,
          courier: courierRes.data as any,
        });
        setLoading(false);
      }
    };
    load();

    const ch = supabase.channel(`track-${orderItemId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items", filter: `id=eq.${orderItemId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [orderItemId]);

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">Yüklənir...</div>;
  if (!info) return <div className="text-sm text-muted-foreground py-6 text-center">Sifariş tapılmadı</div>;

  const currentStep = info.delivered_at ? 3 : info.accepted_at ? 2 : info.status === "shipped" ? 1 : 0;

  const markers: import("@/components/MapView").MapMarker[] = [];
  if (info.pickup_point?.lat && info.pickup_point?.lng) {
    markers.push({ id: "pvz", lat: Number(info.pickup_point.lat), lng: Number(info.pickup_point.lng), title: info.pickup_point.name, description: info.pickup_point.address, kind: "pvz" });
  }
  if (info.courier?.lat && info.courier?.lng) {
    markers.push({ id: "courier", lat: Number(info.courier.lat), lng: Number(info.courier.lng), title: info.courier.full_name, description: info.courier.phone, kind: "courier" });
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          {STATUS_FLOW.map((s, i) => {
            const Icon = s.icon;
            const done = i <= currentStep;
            return (
              <div key={s.key} className="flex flex-col items-center text-center flex-1">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-1 transition ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className={`text-[10px] sm:text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`hidden sm:block absolute h-0.5 w-full ${done ? "bg-primary" : "bg-secondary"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      {markers.length > 0 ? (
        <div className="rounded-xl overflow-hidden border border-border h-72">
          <MapView markers={markers} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Xəritə üçün koordinatlar hələ təyin olunmayıb
        </div>
      )}

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {info.pickup_point && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">📦 Götürmə nöqtəsi</div>
            <div className="font-bold">{info.pickup_point.name}</div>
            <div className="text-sm text-muted-foreground">{info.pickup_point.city}, {info.pickup_point.address}</div>
            {info.pickup_code && (
              <div className="mt-2 inline-block px-3 py-1 rounded-md bg-primary/10 text-primary font-mono font-bold text-sm">
                Kod: {info.pickup_code}
              </div>
            )}
          </div>
        )}
        {info.courier && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1">🚚 Kuryer</div>
            <div className="font-bold">{info.courier.full_name}</div>
            <div className="text-sm text-muted-foreground">{info.courier.phone}</div>
            <div className="text-xs text-muted-foreground capitalize mt-1">{info.courier.vehicle_type}</div>
          </div>
        )}
      </div>
    </div>
  );
}
