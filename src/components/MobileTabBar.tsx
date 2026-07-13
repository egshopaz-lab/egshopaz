import { Link, useLocation } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, Heart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export function MobileTabBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const items = [
    { to: "/", icon: Home, label: t("sidebar.home") },
    { to: "/catalog", icon: LayoutGrid, label: t("sidebar.catalog"), search: { q: undefined, cat: undefined } as never },
    { to: "/cart", icon: ShoppingCart, label: t("header.cart") },
    { to: "/favorites", icon: Heart, label: t("header.favorites") },
    { to: user ? "/profile" : "/auth", icon: User, label: t("header.cabinet"), search: user ? undefined : ({ role: "buyer" } as never) },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to + it.label}
              to={it.to}
              search={it.search as never}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
              <span className="truncate max-w-[64px]">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
