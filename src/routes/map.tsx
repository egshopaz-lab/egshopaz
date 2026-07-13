import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapView, type MapMarker } from "@/components/MapView";
import { Map as MapIcon, Package, Store, Home, Truck, Navigation } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [
    { title: "Xəritə — PVZ, mağaza və sifariş izləmə" },
    { name: "description", content: "Bütün çatdırış nöqtələri, mağazalar, ünvanlar və canlı sifariş izləmə bir xəritədə." },
  ]}),
  component: MapPage,
});

type Layer = "pvz" | "shops" | "addresses" | "couriers" | "me";

function MapPage() {
  const { user } = useAuth();
  const [pvz, setPvz] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [addrs, setAddrs] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    pvz: true, shops: true, addresses: true, couriers: true, me: true,
  });

  useEffect(() => {
    supabase.from("pickup_points").select("id,name,city,address,working_hours,lat,lng")
      .then(({ data }) => setPvz(data ?? []));
    supabase.from("seller_shops_public").select("id,shop_name,shop_city,shop_address,shop_lat,shop_lng")
      .not("shop_lat", "is", null).not("shop_name", "is", null)
      .then(({ data }) => setShops(data ?? []));
    supabase.from("couriers_public").select("id,full_name,city,vehicle_type,lat,lng,last_seen_at")
      .then(({ data }) => setCouriers(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("addresses").select("id,title,city,street,lat,lng").eq("user_id", user.id)
      .then(({ data }) => setAddrs(data ?? []));
  }, [user]);

  // Get my GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Real-time courier updates
  useEffect(() => {
    const ch = supabase.channel("couriers-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "couriers" }, (payload: any) => {
        setCouriers((prev) => prev.map((c) => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];
    if (layers.pvz) pvz.forEach((p) => p.lat && p.lng && out.push({
      id: `pvz-${p.id}`, lat: Number(p.lat), lng: Number(p.lng), kind: "pvz",
      title: `📦 ${p.name}`, description: `${p.city} · ${p.address}<br/>${p.working_hours}${p.phone ? ` · ${p.phone}` : ""}`,
    }));
    if (layers.shops) shops.forEach((s) => s.shop_lat && s.shop_lng && out.push({
      id: `shop-${s.id}`, lat: Number(s.shop_lat), lng: Number(s.shop_lng), kind: "shop",
      title: `🏬 ${s.shop_name}`, description: `${s.shop_city ?? ""}${s.shop_address ? " · " + s.shop_address : ""}`,
      link: `/shop/${s.id}`,
    }));
    if (layers.addresses) addrs.forEach((a) => a.lat && a.lng && out.push({
      id: `addr-${a.id}`, lat: Number(a.lat), lng: Number(a.lng), kind: "address",
      title: `🏠 ${a.title}`, description: `${a.city} · ${a.street}`,
    }));
    if (layers.couriers) couriers.forEach((c) => c.lat && c.lng && out.push({
      id: `cour-${c.id}`, lat: Number(c.lat), lng: Number(c.lng), kind: "courier",
      title: `🚚 ${c.full_name}`, description: `${c.city} · ${c.vehicle_type}`,
    }));
    if (layers.me && myPos) out.push({
      id: "me", lat: myPos.lat, lng: myPos.lng, kind: "me", title: "📍 Mən buradayam",
    });
    return out;
  }, [pvz, shops, addrs, couriers, myPos, layers]);

  const toggle = (k: Layer) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const counts = {
    pvz: pvz.filter((p) => p.lat && p.lng).length,
    shops: shops.length,
    addresses: addrs.filter((a) => a.lat && a.lng).length,
    couriers: couriers.filter((c) => c.lat && c.lng).length,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <MapIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl md:text-3xl font-extrabold">Xəritə</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Azərbaycan üzrə bütün çatdırış nöqtələri, mağazalar, ünvanlarınız və canlı sifariş izləmə.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <ChipBtn active={layers.pvz} onClick={() => toggle("pvz")} icon={<Package className="h-4 w-4" />} color="bg-blue-500" label={`PVZ (${counts.pvz})`} />
        <ChipBtn active={layers.shops} onClick={() => toggle("shops")} icon={<Store className="h-4 w-4" />} color="bg-emerald-500" label={`Mağazalar (${counts.shops})`} />
        <ChipBtn active={layers.addresses} onClick={() => toggle("addresses")} icon={<Home className="h-4 w-4" />} color="bg-purple-500" label={`Ünvanlarım (${counts.addresses})`} />
        <ChipBtn active={layers.couriers} onClick={() => toggle("couriers")} icon={<Truck className="h-4 w-4" />} color="bg-orange-500" label={`Kuryerlər (${counts.couriers})`} />
        <ChipBtn active={layers.me} onClick={() => toggle("me")} icon={<Navigation className="h-4 w-4" />} color="bg-red-500" label="Mən" />
      </div>

      <MapView markers={markers} height={600} />

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/pickup-points" className="bg-card border border-border rounded-xl p-3 hover:border-primary text-sm">
          <div className="font-bold mb-1">📦 PVZ siyahısı</div>
          <div className="text-xs text-muted-foreground">Bütün çatdırış nöqtələri</div>
        </Link>
        <Link to="/orders" className="bg-card border border-border rounded-xl p-3 hover:border-primary text-sm">
          <div className="font-bold mb-1">🛍️ Sifarişlərim</div>
          <div className="text-xs text-muted-foreground">İzləmə üçün açın</div>
        </Link>
        <Link to="/addresses" className="bg-card border border-border rounded-xl p-3 hover:border-primary text-sm">
          <div className="font-bold mb-1">🏠 Ünvanlarım</div>
          <div className="text-xs text-muted-foreground">Çatdırılma ünvanları</div>
        </Link>
        <Link to="/catalog" className="bg-card border border-border rounded-xl p-3 hover:border-primary text-sm">
          <div className="font-bold mb-1">🏬 Mağazalar</div>
          <div className="text-xs text-muted-foreground">Bütün mağazalar</div>
        </Link>
      </div>
    </div>
  );
}

function ChipBtn({ active, onClick, icon, label, color }: any) {
  return (
    <button onClick={onClick}
            className={`inline-flex items-center gap-2 h-9 px-3 rounded-full text-sm font-semibold border transition ${
              active ? `${color} text-white border-transparent` : "bg-secondary text-foreground border-border hover:border-primary"
            }`}>
      {icon} {label}
    </button>
  );
}
