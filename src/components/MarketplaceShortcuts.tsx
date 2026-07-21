import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BadgePercent, Sparkles, Store, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MarketplaceShortcuts() {
  const { t } = useTranslation();
  const items = [
    { to: "/promotions" as const, icon: BadgePercent, eyebrow: t("sidebar.promotions"), title: t("home.dailyDeals"), tone: "from-rose-500 to-orange-400" },
    { to: "/shops" as const, icon: Store, eyebrow: t("sidebar.shops"), title: t("ads.featuredShops"), tone: "from-violet-600 to-fuchsia-500" },
    { to: "/trends" as const, icon: Sparkles, eyebrow: "EG Trends", title: t("trendsFeed.description"), tone: "from-indigo-600 to-cyan-500" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label={t("home.discover")}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className={`group relative min-h-32 overflow-hidden rounded-[1.4rem] bg-gradient-to-br ${item.tone} p-4 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-h-36 sm:p-5`}>
            <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex h-full flex-col justify-between gap-5">
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur"><Icon className="h-5 w-5" /></span>
                <ArrowUpRight className="h-5 w-5 text-white/75 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">{item.eyebrow}</span>
                <p className="mt-1 line-clamp-2 text-base font-black leading-tight sm:text-lg">{item.title}</p>
              </div>
            </div>
          </Link>
        );
      })}
      <div className="col-span-full flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-xs font-semibold text-muted-foreground sm:text-sm">
        <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {t("home.trustDelivery")}</span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <span>{t("home.trustSecure")}</span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <span>{t("home.trustReturns")}</span>
      </div>
    </section>
  );
}

