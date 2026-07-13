import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { catName } from "@/lib/catName";

interface Category {
  id: string;
  name: string;
  name_ru?: string | null;
  name_en?: string | null;
  slug?: string | null;
  parent_id: string | null;
  icon?: string | null;
}

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}

// Cascading category picker: Root → Sub → Sub-sub (only dropdowns, no manual input)
export function CategoryCascade({ categories, value, onChange }: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const childrenOf = (pid: string | null) =>
    categories.filter((c) => (c.parent_id ?? null) === pid);

  // Derive the selection chain from `value`
  const chain = useMemo(() => {
    const ids: (string | null)[] = [];
    let cur = value ? byId.get(value) ?? null : null;
    while (cur) {
      ids.unshift(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null;
    }
    return ids;
  }, [value, byId]);

  const rootSel = chain[0] ?? "";
  const subSel = chain[1] ?? "";
  const sub2Sel = chain[2] ?? "";

  const roots = childrenOf(null);
  const subs = rootSel ? childrenOf(rootSel) : [];
  const sub2s = subSel ? childrenOf(subSel) : [];

  const baseCls =
    "w-full h-11 px-3 rounded-lg border border-input bg-background text-sm";

  return (
    <div className="mt-1 space-y-2">
      <select
        className={baseCls}
        value={rootSel}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{t("categoryBar.selectRoot")}</option>
        {roots.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon ? `${c.icon} ` : ""}{catName(c)}
          </option>
        ))}
      </select>

      {rootSel && subs.length > 0 && (
        <select
          className={baseCls}
          value={subSel}
          onChange={(e) => onChange(e.target.value || rootSel)}
        >
          <option value="">{t("categoryBar.selectSub")}</option>
          {subs.map((c) => (
            <option key={c.id} value={c.id}>
              {catName(c)}
            </option>
          ))}
        </select>
      )}

      {subSel && sub2s.length > 0 && (
        <select
          className={baseCls}
          value={sub2Sel}
          onChange={(e) => onChange(e.target.value || subSel)}
        >
          <option value="">{t("categoryBar.selectSub2")}</option>
          {sub2s.map((c) => (
            <option key={c.id} value={c.id}>
              {catName(c)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
