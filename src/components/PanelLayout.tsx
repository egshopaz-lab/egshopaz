import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Search, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { LiveClock } from "@/components/LiveClock";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface PanelNavItem {
  to?: string;
  key?: string;
  label: string;
  icon: LucideIcon;
  group?: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  items: PanelNavItem[];
  children: ReactNode;
}

const DEFAULT_PANEL_GROUPS: Record<string, string> = {
  dashboard: "İcmal",
  operations: "İcmal",
  analytics: "İcmal",
  customers: "İstifadəçilər",
  sellers: "İstifadəçilər",
  pvz_staff: "İstifadəçilər",
  couriers: "İstifadəçilər",
  categories: "Kataloq və biznes",
  products: "Kataloq və biznes",
  shops: "Kataloq və biznes",
  business_modules: "Kataloq və biznes",
  warehouses: "Sifariş və logistika",
  pickup_points: "Sifariş və logistika",
  orders: "Sifariş və logistika",
  reservations: "Sifariş və logistika",
  deliveries: "Sifariş və logistika",
  returns: "Sifariş və logistika",
  finance: "Maliyyə",
  treasury: "Maliyyə",
  payouts: "Maliyyə",
  commercial_settings: "Maliyyə",
  marketing: "Marketinq",
  banners: "Marketinq",
  packages: "Marketinq",
  trends: "Marketinq",
  promo: "Marketinq",
  disputes: "Nəzarət və dəstək",
  message_reports: "Nəzarət və dəstək",
  support: "Nəzarət və dəstək",
  audit: "Nəzarət və dəstək",
  security: "Sistem",
  content: "Sistem",
  settings: "Sistem",
  ai_bot: "Sistem",
};

export function PanelLayout({ title, subtitle, items, children }: Props) {
  const { pathname } = useLocation();
  const [navigationSearch, setNavigationSearch] = useState("");
  const activeItem = items.find((item) => item.active ?? (item.to ? pathname === item.to : false));
  const normalizedSearch = navigationSearch.trim().toLocaleLowerCase("az");
  const visibleItems = useMemo(
    () =>
      normalizedSearch
        ? items.filter((item) =>
            `${item.label} ${item.group ?? ""}`.toLocaleLowerCase("az").includes(normalizedSearch),
          )
        : items,
    [items, normalizedSearch],
  );
  const groupedItems = visibleItems.reduce<Array<{ label: string; items: PanelNavItem[] }>>(
    (groups, item) => {
      const label = item.group ?? (item.key ? DEFAULT_PANEL_GROUPS[item.key] : "") ?? "";
      const existing = groups.find((group) => group.label === label);
      if (existing) existing.items.push(item);
      else groups.push({ label, items: [item] });
      return groups;
    },
    [],
  );

  const navItem = (item: PanelNavItem, closeOnActivate = false) => {
    const isActive = item.active ?? (item.to ? pathname === item.to : false);
    const cls = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
      isActive
        ? "bg-gradient-soft text-primary font-semibold shadow-sm"
        : "text-foreground/80 hover:bg-secondary"
    }`;
    const inner = (
      <>
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 whitespace-normal">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="min-w-[18px] rounded-full bg-discount px-1.5 py-0.5 text-center text-[10px] font-bold text-discount-foreground">
            {item.badge}
          </span>
        )}
      </>
    );
    const content = item.onClick ? (
      <button type="button" onClick={item.onClick} className={cls}>
        {inner}
      </button>
    ) : (
      <Link to={item.to!} className={cls}>
        {inner}
      </Link>
    );
    return closeOnActivate ? (
      <SheetClose key={item.key ?? item.to ?? item.label} asChild>
        {content}
      </SheetClose>
    ) : (
      content
    );
  };

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 grid gap-4 lg:grid-cols-[272px_1fr] lg:gap-6">
      <aside className="h-fit min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-20 lg:self-start">
        <div className="px-3 py-3 border-b border-border mb-3 lg:mb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                {title}
              </div>
              {subtitle && <div className="text-sm font-bold mt-0.5 line-clamp-1">{subtitle}</div>}
            </div>
            <LiveClock compact />
          </div>
        </div>
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex h-11 w-full items-center gap-3 rounded-xl border border-input bg-background px-3 text-sm font-semibold"
              >
                <Menu className="h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {activeItem?.label ?? "Panel bölmələri"}
                </span>
                {activeItem?.badge ? (
                  <span className="rounded-full bg-discount px-2 py-0.5 text-[10px] font-bold text-discount-foreground">
                    {activeItem.badge}
                  </span>
                ) : null}
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col p-0">
              <SheetHeader className="border-b px-5 pb-4 pt-5 text-left">
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{subtitle ?? "İdarəetmə bölmələri"}</SheetDescription>
              </SheetHeader>
              <div className="px-4 pt-4">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={navigationSearch}
                    onChange={(event) => setNavigationSearch(event.target.value)}
                    placeholder="Bölmə axtar..."
                    className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm"
                  />
                </label>
              </div>
              <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-4">
                {groupedItems.map((group) => (
                  <div key={group.label || "main"}>
                    {group.label && (
                      <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                        {group.label}
                      </div>
                    )}
                    <div className="space-y-1">
                      {group.items.map((item) => navItem(item, true))}
                    </div>
                  </div>
                ))}
                {!groupedItems.length && (
                  <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Uyğun bölmə tapılmadı.
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <nav className="hidden lg:block lg:space-y-3">
          {items.length > 12 && (
            <label className="relative mb-3 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={navigationSearch}
                onChange={(event) => setNavigationSearch(event.target.value)}
                placeholder="Bölmə axtar..."
                className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm"
              />
            </label>
          )}
          {groupedItems.map((group) => (
            <div key={group.label || "main"}>
              {group.label && (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.key ?? item.to ?? item.label}>{navItem(item)}</div>
                ))}
              </div>
            </div>
          ))}
          {!groupedItems.length && (
            <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              Uyğun bölmə tapılmadı.
            </div>
          )}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
