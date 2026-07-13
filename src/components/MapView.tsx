import { useEffect, useMemo, useRef, useState } from "react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  /** pvz | shop | address | courier | me | order */
  kind: "pvz" | "shop" | "address" | "courier" | "me" | "order";
  link?: string;
};

const COLORS: Record<MapMarker["kind"], string> = {
  pvz: "#3b82f6",
  shop: "#10b981",
  address: "#a855f7",
  courier: "#f97316",
  me: "#ef4444",
  order: "#eab308",
};

const ICONS: Record<MapMarker["kind"], string> = {
  pvz: "📦",
  shop: "🏬",
  address: "🏠",
  courier: "🚚",
  me: "📍",
  order: "🛍️",
};

interface Props {
  markers: MapMarker[];
  height?: number | string;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function MapView(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div
        className={`rounded-2xl overflow-hidden border border-border bg-secondary/30 flex items-center justify-center text-sm text-muted-foreground ${props.className ?? ""}`}
        style={{ height: props.height ?? 480, width: "100%" }}
      >
        Xəritə yüklənir...
      </div>
    );
  }
  return <MapInner {...props} />;
}

function MapInner({ markers, height = 480, center, zoom = 8, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (markers.length === 1) return [markers[0].lat, markers[0].lng];
    return [40.3, 47.7];
  }, [center, markers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("leaflet");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L: any = (mod as any).default ?? mod;
        if (cancelled || !containerRef.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(initialCenter, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setTimeout(() => { try { map.invalidateSize(); } catch { /* noop */ } }, 100);
        setReady(true);
      } catch (e) {
        console.error("[MapView] leaflet load failed", e);
        setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* noop */ }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    const valid = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    valid.forEach((m) => {
      const color = COLORS[m.kind];
      const emoji = ICONS[m.kind];
      const icon = L.divIcon({
        className: "lvbl-marker",
        html: `<div style="background:${color};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32],
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: m.title });
      const link = m.link ? `<br/><a href="${m.link}" style="color:#3b82f6;font-weight:600">Aç →</a>` : "";
      marker.bindPopup(
        `<div style="font-family:system-ui;min-width:160px"><b>${m.title}</b>${m.description ? `<br/><small>${m.description}</small>` : ""}${link}</div>`
      );
      marker.addTo(layer);
    });
    if (valid.length > 1) {
      const group = L.featureGroup(valid.map((m) => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds().pad(0.2));
    } else if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], Math.max(map.getZoom(), 12));
    }
  }, [markers, ready]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`rounded-2xl overflow-hidden border border-border bg-secondary/30 ${className}`}
        style={{ height, width: "100%", zIndex: 0 }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-destructive text-sm bg-background/80 rounded-2xl p-4 text-center">
          Xəritə yüklənmədi: {error}
        </div>
      )}
    </div>
  );
}
