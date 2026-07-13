import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LiveClock } from "@/components/LiveClock";

export interface PanelNavItem {
  to?: string;
  key?: string;
  label: string;
  icon: LucideIcon;
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

  return (
    <div className="container mx-auto px-4 py-6 grid gap-4 lg:grid-cols-[260px_1fr] lg:gap-6">
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
        <nav className="panel-scroll-row pb-1 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
          {items.map((it) => {
            const isActive = it.active ?? (it.to ? pathname === it.to : false);
            const cls = `flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 rounded-lg text-sm font-medium transition text-left lg:w-full lg:gap-3 ${
              isActive ? "bg-gradient-soft text-primary font-semibold" : "hover:bg-secondary text-foreground/80"
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
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
