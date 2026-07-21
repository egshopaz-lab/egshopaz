import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
    panelPath: "/" | "/seller" | "/pvz" | "/dashboard";
  }
> = {
  marketplace: { label: "Marketplace", role: "buyer", panelPath: "/" },
  seller: { label: "Satıcı portalı", role: "seller", panelPath: "/seller" },
  pvz: { label: "PVZ portalı", role: "pvz", panelPath: "/pvz" },
  admin: { label: "Admin portalı", role: "admin", panelPath: "/dashboard" },
};

export function portalFromHostname(hostname: string): Portal {
  const normalized = hostname.toLowerCase().split(":")[0];
  if (normalized === "seller.egshop.az" || normalized.startsWith("seller.")) return "seller";
  if (normalized === "pvz.egshop.az" || normalized.startsWith("pvz.")) return "pvz";
  if (normalized === "admin.egshop.az" || normalized.startsWith("admin.")) return "admin";
  return "marketplace";
}

type PortalContextValue = {
  portal: Portal;
  ready: boolean;
};

const PortalContext = createContext<PortalContextValue>({
  portal: "marketplace",
  ready: false,
});

export function PortalProvider({ children }: { children: ReactNode }) {
  // SSR cannot reliably infer the browser hostname here. Keep the server and
  // first client snapshot identical, then resolve the portal once for the
  // whole application immediately after hydration.
  const [portal, setPortal] = useState<Portal>("marketplace");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPortal(portalFromHostname(window.location.hostname));
    setReady(true);
  }, []);

  const value = useMemo(() => ({ portal, ready }), [portal, ready]);
  return createElement(PortalContext.Provider, { value }, children);
}

export function usePortal(): Portal {
  return useContext(PortalContext).portal;
}

export function usePortalReady(): boolean {
  return useContext(PortalContext).ready;
}

export function portalUrl(portal: Portal, path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PORTAL_URLS[portal]}${normalizedPath}`;
}

export function replaceWithPortal(portal: Portal, path = "/"): void {
  if (typeof window !== "undefined") window.location.replace(portalUrl(portal, path));
}
