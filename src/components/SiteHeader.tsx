import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  LogOut,
  Store,
  Camera,
  Sparkles,
  LayoutGrid,
  Tag,
  Compass,
  MapPin,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "@/components/NotificationsBell";

const VisualSearchDialog = lazy(() =>
  import("@/components/VisualSearchDialog").then((m) => ({ default: m.VisualSearchDialog })),
);
import { useTranslation } from "react-i18next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import egLogo from "@/assets/eg-logo.svg";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { portalUrl } from "@/lib/portals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-brand text-white shadow-sm">
      <div className="w-full px-3 py-2 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 sm:gap-4">
          <SidebarTrigger className="shrink-0 text-white" />

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
            aria-label="EG Shop"
          >
            <img
              src={egLogo}
              alt="EG Shop logo"
              width={512}
              height={512}
              className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
            />
            <span className="hidden items-baseline whitespace-nowrap text-xl leading-none tracking-tight text-white sm:flex sm:text-2xl">
              <strong className="font-black">EG</strong>
              <span className="font-semibold ml-1">Shop</span>
            </span>
          </Link>

          <form onSubmit={onSearch} className="hidden max-w-3xl flex-1 lg:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("common.searchPlaceholder")}
                className="w-full pl-10 pr-12 h-11 rounded-xl border border-white/20 bg-white text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/70 transition placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setVisualOpen(true)}
                title={t("home.visualSearchTitle")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-violet-50 text-violet-600 transition"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </form>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            <LanguageSwitcher />
            <Link
              to="/favorites"
              className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0"
            >
              <Heart className="h-5 w-5 mb-0.5" />
              <span>{t("header.favorites")}</span>
            </Link>
            <NotificationsBell />
            <Link
              to="/cart"
              className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0"
            >
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
                    <DropdownMenuItem
                      onClick={() => window.location.assign(portalUrl("seller", "/seller"))}
                    >
                      <Store className="h-4 w-4 mr-2" /> {t("header.sellerPanel")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> {t("header.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/login"
                className="flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 transition text-white min-w-0"
              >
                <User className="h-5 w-5 mb-0.5" />
                <span>{t("header.login")}</span>
              </Link>
            )}
          </nav>

          <nav
            className="ml-auto flex items-center gap-0.5 lg:hidden"
            aria-label={t("sidebar.mainMenu")}
          >
            <LanguageSwitcher />
            <Link
              to="/favorites"
              aria-label={t("header.favorites")}
              className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/15"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              to="/cart"
              aria-label={t("header.cart")}
              className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/15"
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>
            <Link
              to={user ? "/profile" : "/login"}
              aria-label={t("header.cabinet")}
              className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/15"
            >
              <User className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </div>

      <div className="hidden border-t border-white/10 bg-white/10 lg:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center gap-6 px-4 text-sm font-semibold text-white/90">
          <Link
            to="/catalog"
            search={{ q: undefined, cat: undefined } as never}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition"
          >
            <LayoutGrid className="h-4 w-4 text-white" />{" "}
            <span className="text-white">{t("sidebar.catalog")}</span>
          </Link>
          <Link to="/shops" className="transition hover:text-white">
            {t("sidebar.shops")}
          </Link>
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 transition hover:text-white"
          >
            <Compass className="h-4 w-4" /> {t("sidebar.discover")}
          </Link>
          <Link
            to="/trends"
            className="inline-flex items-center gap-1.5 transition hover:text-white"
          >
            <Sparkles className="h-4 w-4" /> EG Trends
          </Link>
          <Link
            to="/promotions"
            className="inline-flex items-center gap-1.5 transition hover:text-white"
          >
            <Tag className="h-4 w-4" /> {t("sidebar.promotions")}
          </Link>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/75">
            <MapPin className="h-3.5 w-3.5" /> {t("header.location")}
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <a
              href={portalUrl("seller", "/register")}
              className="text-white/75 transition hover:text-white"
            >
              {t("home.sellerCta")}
            </a>
            <a
              href={portalUrl("pvz", "/register")}
              className="text-white/75 transition hover:text-white"
            >
              {t("home.pvzCta")}
            </a>
          </div>
        </div>
      </div>

      {/* mobile search */}
      <form onSubmit={onSearch} className="px-3 pb-3 sm:px-4 lg:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.search")}
            className="h-11 w-full rounded-xl border border-white/30 bg-white pl-10 pr-11 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/70 sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setVisualOpen(true)}
            title={t("home.visualSearchTitle")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-violet-600 transition hover:bg-violet-50"
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
