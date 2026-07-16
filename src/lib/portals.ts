import { useEffect, useState } from "react";

export type Portal = "marketplace" | "seller" | "pvz" | "admin";
export type PortalRole = "buyer" | "seller" | "pvz" | "admin";

export const PORTAL_URLS: Record<Portal, string> = {
  marketplace: "https://egshop.az",
  seller: "https://seller.egshop.az",
  pvz: "https://pvz.egshop.az",
  admin: "https://admin.egshop.az",
};

export const PORTAL_CONFIG: Record<
  Portal,
  {
    label: string;
    role: PortalRole;
    panelPath: "/" | "/seller" | "/pvz" | "/admin";
  }
> = {
  marketplace: { label: "Marketplace", role: "buyer", panelPath: "/" },
  seller: { label: "Satıcı portalı", role: "seller", panelPath: "/seller" },
  pvz: { label: "PVZ portalı", role: "pvz", panelPath: "/pvz" },
  admin: { label: "Admin portalı", role: "admin", panelPath: "/admin" },
};

export function portalFromHostname(hostname: string): Portal {
  const normalized = hostname.toLowerCase().split(":")[0];
  if (normalized === "seller.egshop.az" || normalized.startsWith("seller.")) return "seller";
  if (normalized === "pvz.egshop.az" || normalized.startsWith("pvz.")) return "pvz";
  if (normalized === "admin.egshop.az" || normalized.startsWith("admin.")) return "admin";
  return "marketplace";
}

export function usePortal(): Portal {
  const [portal, setPortal] = useState<Portal>(() =>
    typeof window === "undefined" ? "marketplace" : portalFromHostname(window.location.hostname),
  );
  useEffect(() => setPortal(portalFromHostname(window.location.hostname)), []);
  return portal;
}

export function portalUrl(portal: Portal, path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PORTAL_URLS[portal]}${normalizedPath}`;
}

export function replaceWithPortal(portal: Portal, path = "/"): void {
  if (typeof window !== "undefined") window.location.replace(portalUrl(portal, path));
}
