import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Heart, LogOut, Store, Camera, Sparkles } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LiveClock } from "@/components/LiveClock";

const VisualSearchDialog = lazy(() =>
  import("@/components/VisualSearchDialog").then((m) => ({ default: m.VisualSearchDialog }))
);
import { useTranslation } from "react-i18next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import egLogo from "@/assets/eg-logo.svg";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { portalUrl } from "@/lib/portals";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Header with sidebar trigger
export function SiteHeader() {
  const { user, signOut, isSeller } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [visualOpen, setVisualOpen] = useState(false);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/catalog", search: { q: q || undefined, cat: undefined } as never });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border shadow-sm">
      <div className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center bg-gradient-brand text-white">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
          <SidebarTrigger className="shrink-0 text-white" />

          <Link to="/" className="flex items-center gap-3 shrink-0 transition-opacity hover:opacity-95" aria-label="EG Shop">
            <img src={egLogo} alt="EG Shop logo" width={512} height={512} className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 rounded-full object-contain ring-2 ring-white/35 shadow-lg bg-white/10" />
            <span className="text-xl sm:text-2xl md:text-3xl uppercase tracking-wide leading-none text-white whitespace-nowrap" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              SHOP
            </span>
          </Link>
          <div className="block">
            <LiveClock compact />
          </div>


          <form onSubmit={onSearch} className="flex-1 max-w-2xl hidden lg:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("common.searchPlaceholder")}
                className="w-full pl-10 pr-12 h-11 rounded-lg border border-white/30 bg-white/20 focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition text-white placeholder:text-white/70"
              />
              <button
                type="button"
                onClick={() => setVisualOpen(true)}
                title={t("home.visualSearchTitle")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/20 text-white transition"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </form>

          <nav className="order-3 sm:order-none w-full sm:w-auto sm:ml-auto grid grid-cols-5 sm:flex items-center gap-1 sm:gap-2 pt-2 sm:pt-0 border-t border-white/15 sm:border-t-0">
            <LanguageSwitcher />
            <Link to="/discover" className="hidden lg:flex flex-col items-center text-xs px-3 py-1.5 hover:text-white/80 transition text-white">
              <span className="h-5 w-5 mb-0.5 text-base">🔥</span>
              <span>{t("sidebar.discover")}</span>
            </Link>
            <Link to="/trends" className="hidden lg:flex flex-col items-center text-xs px-3 py-1.5 hover:text-white/80 transition text-white">
              <Sparkles className="h-5 w-5 mb-0.5" />
              <span>EG Trends</span>
            </Link>
            <Link to="/favorites" className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0">
              <Heart className="h-5 w-5 mb-0.5" />
              <span>{t("header.favorites")}</span>
            </Link>
            <NotificationsBell />
            <Link to="/cart" className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0">
              <ShoppingCart className="h-5 w-5 mb-0.5" />
              <span>{t("header.cart")}</span>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition outline-none text-white min-w-0">
                  <User className="h-5 w-5 mb-0.5" />
                  <span>{t("header.cabinet")}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isSeller && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                      <User className="h-4 w-4 mr-2" /> {t("header.personalCabinet")}
                    </DropdownMenuItem>
                  )}
                  {isSeller && (
                    <DropdownMenuItem onClick={() => window.location.assign(portalUrl("seller", "/seller"))}>
                      <Store className="h-4 w-4 mr-2" /> {t("header.sellerPanel")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                    <LogOut className="h-4 w-4 mr-2" /> {t("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0">
                <User className="h-5 w-5 mb-0.5" />
                <span>{t("header.login")}</span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* mobile search */}
      <form onSubmit={onSearch} className="lg:hidden px-3 sm:px-4 pb-3 bg-gradient-brand">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
            className="w-full pl-10 pr-11 h-11 rounded-lg border border-white/30 bg-white/20 focus:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 transition text-base sm:text-sm text-white placeholder:text-white/70"
          />
          <button
            type="button"
            onClick={() => setVisualOpen(true)}
            title={t("home.visualSearchTitle")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/20 text-white transition"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
      </form>

      {visualOpen && (
        <Suspense fallback={null}>
          <VisualSearchDialog open={visualOpen} onOpenChange={setVisualOpen} />
        </Suspense>
      )}
    </header>
  );
}
