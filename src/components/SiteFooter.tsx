import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="bg-secondary/40 border-t border-border mt-16">
      <div className="container mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <h4 className="font-bold mb-3">{t("footer.about")}</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/contact" className="hover:text-primary transition">{t("footer.contact")}</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition">{t("footer.terms")}</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition">{t("footer.privacy")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">EG Shop</h4>
          <p className="text-muted-foreground">{t("footer.shopBrand")}</p>
        </div>
        <div>
          <h4 className="font-bold mb-3">{t("header.language")}</h4>
          <p className="text-muted-foreground text-xs">AZ · RU · EN</p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} EG Shop — {t("footer.rights")}
      </div>
    </footer>
  );
}
