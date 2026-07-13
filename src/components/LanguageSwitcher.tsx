import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS: { code: "az" | "ru" | "en"; label: string; flag: string }[] = [
  { code: "az", label: "Azərbaycan", flag: "🇦🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const activeLang = i18n.resolvedLanguage || i18n.language;
  const current = LANGS.find((l) => activeLang.startsWith(l.code)) ?? LANGS[0];

  const changeLanguage = async (code: "az" | "ru" | "en") => {
    await i18n.changeLanguage(code);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("eg-language-sync"));
      window.setTimeout(() => window.dispatchEvent(new Event("eg-language-sync")), 150);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-2 py-1.5 rounded-md hover:bg-white/15 sm:hover:bg-secondary transition outline-none text-xs sm:text-sm text-white sm:text-inherit">
        <Globe className="h-4 w-4" />
        {compact ? (
          <span className="font-semibold uppercase text-xs">{current.code}</span>
        ) : (
          <>
            <span className="hidden sm:inline">{current.flag}</span>
            <span className="hidden sm:inline font-medium">{current.code.toUpperCase()}</span>
            <span className="sm:hidden font-semibold">{t("header.language")}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => void changeLanguage(l.code)}
            className={l.code === current.code ? "bg-secondary font-semibold" : ""}
          >
            <span className="mr-2 text-base">{l.flag}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
