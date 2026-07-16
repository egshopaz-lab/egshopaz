import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgePercent, ShieldCheck, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function MarketplacePromoHero() {
  const { t } = useTranslation();

  return (
    <section className="grid gap-3 lg:grid-cols-[1.7fr_1fr]" aria-label={t("home.heroBadge")}>
      <Link
        to="/catalog"
        search={{ q: undefined, cat: undefined } as never}
        className="group relative min-h-[176px] overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-600 via-violet-700 to-indigo-950 p-5 text-white shadow-elegant sm:min-h-[230px] sm:p-8"
      >
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-[-55%] right-[8%] h-64 w-64 rounded-full border-[38px] border-white/10" />
        <div className="relative flex h-full max-w-xl flex-col justify-between">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] backdrop-blur">
            <BadgePercent className="h-3.5 w-3.5" /> {t("home.marketplaceDealBadge")}
          </span>
          <div className="mt-7">
            <h1 className="max-w-lg text-3xl font-black leading-[1.02] tracking-tight sm:text-5xl">
              {t("home.marketplaceDealTitle")}
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">
              {t("home.marketplaceDealDesc")}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700 transition group-hover:-translate-y-0.5">
              {t("home.shopNow")} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        <Link
          to="/catalog"
          search={{ q: undefined, cat: "elektronika" } as never}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 p-4 text-slate-900 transition hover:-translate-y-0.5 sm:p-5"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">
            {t("home.heroElectronics")}
          </span>
          <strong className="mt-2 block max-w-[13rem] text-lg leading-tight sm:text-2xl">
            {t("home.electronicsDeal")}
          </strong>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-800">
            {t("home.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          to="/promotions"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 p-4 text-slate-900 transition hover:-translate-y-0.5 sm:p-5"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-orange-700">
            {t("sidebar.promotions")}
          </span>
          <strong className="mt-2 block max-w-[13rem] text-lg leading-tight sm:text-2xl">
            {t("home.dailyDeals")}
          </strong>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-800">
            {t("home.discover")} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="col-span-full grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [ShieldCheck, t("home.trustSecure")],
          [Truck, t("home.trustDelivery")],
          [BadgePercent, t("home.benefitDiscounts")],
          [ArrowRight, t("home.trustReturns")],
        ].map(([Icon, label]) => {
          const ItemIcon = Icon as typeof ShieldCheck;
          return (
            <div
              key={label as string}
              className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3 py-2 text-xs font-bold text-foreground sm:text-sm"
            >
              <ItemIcon className="h-4 w-4 shrink-0 text-primary" /> {label as string}
            </div>
          );
        })}
      </div>
    </section>
  );
}
