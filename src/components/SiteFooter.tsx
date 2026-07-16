import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Mail, ShieldCheck, CreditCard, Store, MapPin } from "lucide-react";
import egLogo from "@/assets/eg-logo.svg";
import { portalUrl } from "@/lib/portals";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-border bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 text-white" aria-label="EG Shop">
            <img src={egLogo} alt="" className="h-11 w-11" />
            <span className="text-xl tracking-tight"><strong className="font-black">EG</strong> <span className="font-semibold">Shop</span></span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">{t("footer.description")}</p>
        </div>

        <div>
          <h4 className="font-extrabold text-white">{t("footer.customers")}</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><Link to="/about" className="transition hover:text-white">{t("footer.about")}</Link></li>
            <li><Link to="/contact" className="transition hover:text-white">{t("footer.contact")}</Link></li>
            <li><Link to="/support" className="transition hover:text-white">{t("sidebar.support")}</Link></li>
            <li><Link to="/terms" className="transition hover:text-white">{t("footer.terms")}</Link></li>
            <li><Link to="/privacy" className="transition hover:text-white">{t("footer.privacy")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-extrabold text-white">{t("footer.partners")}</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><a href={portalUrl("seller", "/register")} className="inline-flex items-center gap-2 transition hover:text-white"><Store className="h-4 w-4" /> {t("home.sellerCta")}</a></li>
            <li><a href={portalUrl("pvz", "/register")} className="inline-flex items-center gap-2 transition hover:text-white"><MapPin className="h-4 w-4" /> {t("home.pvzCta")}</a></li>
            <li><Link to="/shops" className="transition hover:text-white">{t("sidebar.shops")}</Link></li>
            <li><Link to="/promotions" className="transition hover:text-white">{t("sidebar.promotions")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-extrabold text-white">{t("footer.contactTitle")}</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li><a href="mailto:info@egshop.az" className="inline-flex items-center gap-2 transition hover:text-white"><Mail className="h-4 w-4" /> info@egshop.az</a></li>
            <li className="inline-flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {t("footer.location")}</li>
          </ul>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> {t("footer.securePayment")}</div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} EG Shop — {t("footer.rights")}</p>
          <div className="flex items-center gap-2" aria-label={t("footer.paymentMethods")}>
            <CreditCard className="h-4 w-4" />
            <span className="rounded border border-white/10 px-2 py-1 text-slate-300">VISA</span>
            <span className="rounded border border-white/10 px-2 py-1 text-slate-300">Mastercard</span>
            <span className="rounded border border-white/10 px-2 py-1 text-slate-300">Epoint</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
