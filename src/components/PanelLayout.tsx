import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LiveClock } from "@/components/LiveClock";

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

export function PanelLayout({ title, subtitle, items, children }: Props) {
  const { pathname } = useLocation();
  const activeItem = items.find((item) => item.active ?? (item.to ? pathname === item.to : false));
  const groupedItems = items.reduce<Array<{ label: string; items: PanelNavItem[] }>>(
    (groups, item) => {
      const label = item.group ?? "";
      const existing = groups.find((group) => group.label === label);
      if (existing) existing.items.push(item);
      else groups.push({ label, items: [item] });
      return groups;
    },
    [],
  );

  const activateMobileItem = (key: string) => {
    const item = items.find((candidate) => (candidate.key ?? candidate.to ?? candidate.label) === key);
    if (!item) return;
    if (item.onClick) item.onClick();
    else if (item.to && typeof window !== "undefined") window.location.assign(item.to);
  };

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 grid gap-4 lg:grid-cols-[272px_1fr] lg:gap-6">
      <aside className="bg-card border border-border rounded-2xl p-3 h-fit min-w-0 max-w-full overflow-hidden lg:sticky lg:top-20 lg:self-start">
        <div className="px-3 py-3 border-b border-border mb-3 lg:mb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</div>
              {subtitle && <div className="text-sm font-bold mt-0.5 line-clamp-1">{subtitle}</div>}
            </div>
            <LiveClock compact />
          </div>
        </div>
        <div className="lg:hidden">
          <label className="sr-only" htmlFor="panel-mobile-navigation">Panel bölməsi</label>
          <select
            id="panel-mobile-navigation"
            value={activeItem?.key ?? activeItem?.to ?? activeItem?.label ?? ""}
            onChange={(event) => activateMobileItem(event.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold"
          >
            {groupedItems.map((group) => (
              <optgroup key={group.label || "main"} label={group.label || "Əsas"}>
                {group.items.map((item) => (
                  <option
                    key={item.key ?? item.to ?? item.label}
                    value={item.key ?? item.to ?? item.label}
                  >
                    {item.label}{item.badge ? ` (${item.badge})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <nav className="hidden lg:block lg:space-y-3">
          {groupedItems.map((group) => (
            <div key={group.label || "main"}>
              {group.label && (
                <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((it) => {
                  const isActive = it.active ?? (it.to ? pathname === it.to : false);
                  const cls = `flex w-full items-center gap-3 whitespace-nowrap px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    isActive
                      ? "bg-gradient-soft text-primary font-semibold"
                      : "hover:bg-secondary text-foreground/80"
                  }`;
                  const inner = (
                    <>
                      <it.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      {it.badge !== undefined && it.badge > 0 && (
                        <span className="text-[10px] bg-discount text-discount-foreground rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                          {it.badge}
                        </span>
                      )}
                    </>
                  );
                  if (it.onClick) {
                    return (
                      <button key={it.key ?? it.label} onClick={it.onClick} className={cls}>
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <Link key={it.to ?? it.label} to={it.to!} className={cls}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
