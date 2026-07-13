import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { catName } from "@/lib/catName";

interface Category { id: string; name: string; name_ru?: string | null; name_en?: string | null; slug?: string | null }

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function CategoryCombobox({ categories, value, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => categories.find((c) => c.id === value) ?? null, [categories, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.slice(0, 50);
    return categories
      .filter((c) => catName(c).toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [categories, query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-left flex items-center justify-between gap-2"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected ? catName(selected) : t("categoryBar.selectRoot")}
        </span>
        <span className="flex items-center gap-1">
          {selected && (
            <X
              className="h-4 w-4 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder ?? t("categoryBar.searchPlaceholder")}
              className="flex-1 h-8 bg-transparent outline-none text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">{t("common.notFound")}</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-secondary flex items-center justify-between"
                >
                  <span>{catName(c)}</span>
                  {c.id === value && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
