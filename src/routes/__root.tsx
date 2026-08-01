import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryBar } from "@/components/CategoryBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MainSidebar } from "@/components/MainSidebar";
import { LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { MobileTabBar } from "@/components/MobileTabBar";
import { LanguageDomSync } from "@/components/LanguageDomSync";
import "@/i18n";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import { PortalProvider, portalUrl, usePortal, usePortalReady } from "@/lib/portals";
import { useMojibakeRepair } from "@/hooks/useMojibakeRepair";

import "../styles.css";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-brand">404</h1>
        <h2 className="mt-4 text-xl font-semibold">SÉ™hifÉ™ tapÄ±lmadÄ±</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AxtardÄ±ÄŸÄ±nÄ±z sÉ™hifÉ™ mÃ¶vcud deyil vÉ™ ya kÃ¶Ã§Ã¼rÃ¼lÃ¼b.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            Ana sÉ™hifÉ™yÉ™ qayÄ±t
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5.0, user-scalable=yes" },
      { title: "EG Shop â€” AzÉ™rbaycanÄ±n onlayn marketi" },
      { name: "description", content: "Milyonlarla mÉ™hsul, sÃ¼rÉ™tli Ã§atdÄ±rÄ±lma vÉ™ sÉ™rfÉ™li qiymÉ™tlÉ™r. EG Shop AzÉ™rbaycanda." },
      { property: "og:site_name", content: "EG Shop" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "az_AZ" },
      { property: "og:image", content: absoluteUrl("/brand/eg-social.svg") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteUrl("/brand/eg-social.svg") },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/brand/eg-logo-mark.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EG Shop",
          url: SITE_URL,
          logo: absoluteUrl("/brand/eg-logo-mark.png"),
          sameAs: [],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EG Shop",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/catalog?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function LiveClock() {
  // The server and browser must render the same text before hydration.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now
    ? now.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "--:--:--";
  const date = now
    ? `${String(now.getDate()).padStart(2, "0")} ${["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"][now.getMonth()]}, ${["Baz", "B.e", "Ã‡.a", "Ã‡", "C.a", "C", "Åž"][now.getDay()]}`
    : "-- ---";
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border">
      <Clock className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0 text-right">
        <div className="font-mono font-bold text-sm tabular-nums leading-tight">{time}</div>
        <div className="text-[10px] text-muted-foreground leading-tight">{date}</div>
      </div>
    </div>
  );
}

function WorkHeader({ label }: { label: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/brand/eg-logo-mark.png" alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <span className="shrink-0 text-lg font-black leading-none">EG Shop</span>
          <span className="hidden truncate text-sm font-bold text-muted-foreground sm:inline">Â· {label}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <LiveClock />
          {user && (
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</span>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="h-4 w-4 mr-1" /> Ã‡Ä±xÄ±ÅŸ
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  useMojibakeRepair();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const portal = usePortal();
  const portalReady = usePortalReady();
  const {
    user, isSeller, isAdmin, isPvz, loading,
    accountStatus, blockedUntil, blockReason, signOut,
  } = useAuth();
  const isDashboardPanel = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isSellerTrends = portal === "seller" && pathname === "/trends";
  const isSellerLanding = portal === "seller" && pathname === "/";
  const isSellerLoginLanding =
    portal === "seller" &&
    pathname === "/login" &&
    (typeof window === "undefined" || new URLSearchParams(window.location.search).get("form") !== "1");
  const isWorkPanel = isDashboardPanel;
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/login" || pathname === "/register" || pathname === "/reset-password";


  // One build serves four isolated portals. Cross-domain navigation uses full
  // URLs because browser sessions and canonical hosts are origin-scoped.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // PortalProvider resolves the hostname after hydration. Acting on the
    // initial marketplace fallback would send seller/PVZ dashboards to the
    // admin domain before the real subdomain is known.
    if (!portalReady) return;
    const query = window.location.search;

    if (portal === "marketplace") {
      const onboardingPortal = String(user?.user_metadata?.onboarding_portal ?? "");
      // Some confirmation emails can return to the Auth site URL instead of
      // RedirectTo. A confirmed, unpaid seller must continue with payment and
      // must never fall through to the customer cabinet on the marketplace.
      if (!loading && user && onboardingPortal === "seller" && !isSeller) {
        window.location.replace(portalUrl("seller", "/become-seller?start_payment=1"));
        return;
      }
      if (pathname === "/become-seller") window.location.replace(portalUrl("seller", "/register"));
      else if (isDashboardPanel) window.location.replace(portalUrl("admin", pathname + query));
      else if (pathname === "/auth") {
        const role = new URLSearchParams(query).get("role");
        const destination = role === "seller" ? "seller" : role === "pvz" ? "pvz" : role === "admin" ? "admin" : "marketplace";
        window.location.replace(portalUrl(destination, "/login"));
      }
      return;
    }

    if (pathname === "/auth") {
      navigate({ to: "/login", replace: true });
      return;
    }

    const correctPanel = isDashboardPanel || isSellerTrends;
    const sellerOnboarding = portal === "seller" && pathname === "/become-seller";
    if (isAuthRoute || correctPanel || sellerOnboarding) return;

    if (pathname === "/") {
      if (loading) return;
      if (portal === "seller" && !user) return;
      const target = !user
        ? "/login"
        : portal === "seller" ? (isSeller ? "/dashboard" : "/become-seller")
        : portal === "pvz" ? (isPvz ? "/dashboard" : "/login")
        : isAdmin ? "/dashboard" : "/login";
      navigate({ to: target, replace: true });
      return;
    }

    window.location.replace(portalUrl("marketplace", pathname + query));
  }, [isAdmin, isAuthRoute, isDashboardPanel, isPvz, isSeller, isSellerTrends, loading, navigate, pathname, portal, portalReady, user]);

  // Authentication and work-panel URLs are shared by multiple subdomains.
  // Until the browser hostname has been resolved, showing the marketplace
  // shell here would cause a visible wrong-page flash on admin/seller/PVZ.
  if (!portalReady && (isAuthRoute || isWorkPanel)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true" aria-label="Portal yÃ¼klÉ™nir">
        <img src="/brand/eg-logo-mark.png" alt="EG Shop" className="h-14 w-14 animate-pulse rounded-xl object-cover" />
      </div>
    );
  }

  if (!loading && user && accountStatus !== "active") {
    const statusLabel = accountStatus === "temporary_blocked"
      ? "Hesab mÃ¼vÉ™qqÉ™ti bloklanÄ±b"
      : accountStatus === "permanently_blocked"
        ? "Hesab daimi bloklanÄ±b"
        : "Hesab deaktiv edilib";
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-card">
          <h1 className="text-2xl font-extrabold text-destructive">{statusLabel}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Bu hesabÄ±n sistemÉ™ vÉ™ panellÉ™rÉ™ giriÅŸi dayandÄ±rÄ±lÄ±b.
          </p>
          {blockReason && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">SÉ™bÉ™b: {blockReason}</p>}
          {blockedUntil && accountStatus === "temporary_blocked" && (
            <p className="mt-3 text-sm text-muted-foreground">
              BitmÉ™ vaxtÄ±: {new Date(blockedUntil).toLocaleString("az-AZ")}
            </p>
          )}
          <Button className="mt-6" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Ã‡Ä±xÄ±ÅŸ
          </Button>
        </div>
      </div>
    );
  }

  if (isSellerLanding || isSellerLoginLanding) {
    return <Outlet />;
  }

  if (isWorkPanel || isSellerTrends || (portal !== "marketplace" && isAuthRoute) || (portal === "seller" && pathname === "/become-seller")) {
    const label = portal === "seller"
      ? pathname === "/become-seller" ? "SatÄ±cÄ± qeydiyyatÄ± vÉ™ Ã¶dÉ™niÅŸ" : "SatÄ±cÄ± portalÄ±"
      : portal === "pvz" ? "PVZ PUNKT portalÄ±"
      : "Admin portalÄ±";
    return (
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
        <WorkHeader label={label} />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col bg-background w-full">
        <MainSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <SiteHeader />
          <CategoryBar />
          <main className="flex-1 pb-20 lg:pb-0">
            <Outlet />
          </main>
          <SiteFooter />
          <MobileTabBar />
        </div>
      </div>
    </SidebarProvider>
  );
}

function RootComponent() {
  return (
    <PortalProvider>
      <AuthProvider>
        <LanguageDomSync />
        <AppShell />
        
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </PortalProvider>
  );
}

