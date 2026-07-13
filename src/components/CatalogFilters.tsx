import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X, ChevronDown, Tag, BadgePercent, Star, Package, Truck, Zap, Sparkles, MapPin, Clock } from "lucide-react";

export type SortKey = "newest" | "price_asc" | "price_desc" | "rating" | "popular" | "delivery_fast" | "discount_high";

export interface Filters {
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  minRating?: number;
  onlyDiscount?: boolean;
  inStockOnly?: boolean;
  freeShipping?: boolean;
  fastDelivery?: boolean;
  newArrivals?: boolean;
  minDiscount?: number; // % e.g. 20, 30, 50
  maxDeliveryDays?: number; // 1, 3, 7, 14
  city?: string; // delivery city
  condition?: "new" | "used"; // product condition
  sort: SortKey;
}

import { AZ_CITY_NAMES } from "@/lib/azCities";
const CITIES = AZ_CITY_NAMES;
const DELIVERY_DAYS = [1, 3, 7, 14];

export function CatalogFilters({
  brands,
  value,
  onChange,
}: {
  brands: string[];
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [minP, setMinP] = useState(value.minPrice?.toString() ?? "");
  const [maxP, setMaxP] = useState(value.maxPrice?.toString() ?? "");

  useEffect(() => { setMinP(value.minPrice?.toString() ?? ""); setMaxP(value.maxPrice?.toString() ?? ""); }, [value.minPrice, value.maxPrice]);

  const SORTS: { id: SortKey; label: string }[] = [
    { id: "newest", label: t("catalog.newest") },
    { id: "popular", label: t("catalog.popular") },
    { id: "price_asc", label: t("catalog.priceAsc") },
    { id: "price_desc", label: t("catalog.priceDesc") },
    { id: "rating", label: t("catalog.rating") },
    { id: "delivery_fast", label: t("catalog.deliveryFast") },
    { id: "discount_high", label: t("catalog.discountHigh") },
  ];

  const apply = () => {
    onChange({
      ...value,
      minPrice: minP ? Number(minP) : undefined,
      maxPrice: maxP ? Number(maxP) : undefined,
    });
    setOpen(false);
  };

  const reset = () => {
    onChange({ sort: value.sort });
    setMinP(""); setMaxP("");
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (value.minPrice != null) n++;
    if (value.maxPrice != null) n++;
    if (value.brand) n++;
    if (value.minRating) n++;
    if (value.onlyDiscount) n++;
    if (value.inStockOnly) n++;
    if (value.freeShipping) n++;
    if (value.fastDelivery) n++;
    if (value.newArrivals) n++;
    if (value.minDiscount) n++;
    if (value.maxDeliveryDays) n++;
    if (value.city) n++;
    if (value.condition) n++;
    return n;
  }, [value]);

  const Body = (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.priceRange")} (₼)</label>
        <div className="flex gap-2 mt-2">
          <input type="number" inputMode="numeric" value={minP} onChange={(e) => setMinP(e.target.value)}
                 placeholder={t("catalog.minPrice")} className="w-1/2 h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <input type="number" inputMode="numeric" value={maxP} onChange={(e) => setMaxP(e.target.value)}
                 placeholder={t("catalog.maxPrice")} className="w-1/2 h-10 px-3 rounded-lg border border-input bg-background text-sm" />
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.brand")}</label>
          <select value={value.brand ?? ""} onChange={(e) => onChange({ ...value, brand: e.target.value || undefined })}
                  className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
            <option value="">{t("catalog.all")}</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.minRating")}</label>
        <div className="flex gap-1 mt-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button key={r} onClick={() => onChange({ ...value, minRating: r || undefined })}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${value.minRating === r || (!value.minRating && r === 0) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
              {r === 0 ? t("catalog.all") : `${r}+ ★`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.minDiscount")}</label>
        <div className="flex gap-1 mt-2">
          {[0, 10, 25, 50].map((d) => (
            <button key={d} onClick={() => onChange({ ...value, minDiscount: d || undefined })}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${value.minDiscount === d || (!value.minDiscount && d === 0) ? "bg-discount text-white border-discount" : "border-border hover:border-discount"}`}>
              {d === 0 ? t("catalog.all") : `${d}%+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.maxDeliveryDays")}</label>
        <div className="flex gap-1 mt-2">
          {[0, ...DELIVERY_DAYS].map((d) => (
            <button key={d} onClick={() => onChange({ ...value, maxDeliveryDays: d || undefined })}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${value.maxDeliveryDays === d || (!value.maxDeliveryDays && d === 0) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
              {d === 0 ? t("catalog.all") : `≤${d}${t("catalog.daysShort")}`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.deliveryCity")}</label>
        <select value={value.city ?? ""} onChange={(e) => onChange({ ...value, city: e.target.value || undefined })}
                className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="">{t("catalog.all")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("catalog.condition")}</label>
        <div className="flex gap-1 mt-2">
          <button onClick={() => onChange({ ...value, condition: undefined })}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${!value.condition ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
            {t("catalog.all")}
          </button>
          <button onClick={() => onChange({ ...value, condition: "new" })}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${value.condition === "new" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
            {t("catalog.conditionNew")}
          </button>
          <button onClick={() => onChange({ ...value, condition: "used" })}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border ${value.condition === "used" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
            {t("catalog.conditionUsed")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!value.onlyDiscount} onChange={(e) => onChange({ ...value, onlyDiscount: e.target.checked || undefined })} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">{t("catalog.onlyDiscount")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!value.inStockOnly} onChange={(e) => onChange({ ...value, inStockOnly: e.target.checked || undefined })} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">{t("catalog.inStockOnly")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!value.freeShipping} onChange={(e) => onChange({ ...value, freeShipping: e.target.checked || undefined })} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">{t("catalog.freeShipping")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!value.fastDelivery} onChange={(e) => onChange({ ...value, fastDelivery: e.target.checked || undefined })} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">{t("catalog.fastDelivery")}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!value.newArrivals} onChange={(e) => onChange({ ...value, newArrivals: e.target.checked || undefined })} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-medium">{t("catalog.newArrivals")}</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2 sticky bottom-0 bg-card">
        <button onClick={reset} className="flex-1 h-10 rounded-lg border border-border text-sm font-semibold hover:bg-secondary">{t("catalog.reset")}</button>
        <button onClick={apply} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">{t("common.apply")}</button>
      </div>
    </div>
  );

  const chipBase = "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border whitespace-nowrap text-xs font-bold transition shrink-0";
  const chipIdle = "border-border bg-card hover:border-primary text-foreground";
  const chipActive = "border-primary bg-primary/10 text-primary";

  const sortLabel = SORTS.find((s) => s.id === value.sort)?.label ?? t("catalog.sortBy");
  const priceActive = value.minPrice != null || value.maxPrice != null;
  const priceLabel = priceActive
    ? `${value.minPrice ?? "0"}-${value.maxPrice ?? "∞"} ₼`
    : t("common.price");

  return (
    <>
      <div className="-mx-3 md:-mx-4 px-3 md:px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 pb-1 min-w-max">
          {/* Sort */}
          <div className="relative">
            <select
              value={value.sort}
              onChange={(e) => onChange({ ...value, sort: e.target.value as SortKey })}
              className={`${chipBase} ${chipIdle} appearance-none pr-7 cursor-pointer`}
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{t("catalog.sortBy")}: {s.label}</option>)}
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filters main */}
          <button onClick={() => setOpen(true)}
                  className={`${chipBase} ${activeCount > 0 ? chipActive : chipIdle}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("catalog.filters")}
            {activeCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{activeCount}</span>}
          </button>

          {/* Brand */}
          {brands.length > 0 && (
            <div className="relative">
              <select
                value={value.brand ?? ""}
                onChange={(e) => onChange({ ...value, brand: e.target.value || undefined })}
                className={`${chipBase} ${value.brand ? chipActive : chipIdle} appearance-none pr-7 pl-7 cursor-pointer`}
              >
                <option value="">{t("catalog.brand")}</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <Tag className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Price */}
          <button onClick={() => setOpen(true)}
                  className={`${chipBase} ${priceActive ? chipActive : chipIdle}`}>
            {priceLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {/* Rating */}
          <div className="relative">
            <select
              value={value.minRating ?? ""}
              onChange={(e) => onChange({ ...value, minRating: e.target.value ? Number(e.target.value) : undefined })}
              className={`${chipBase} ${value.minRating ? chipActive : chipIdle} appearance-none pr-7 pl-7 cursor-pointer`}
            >
              <option value="">{t("catalog.minRating")}</option>
              <option value="3">3+ ★</option>
              <option value="4">4+ ★</option>
              <option value="4.5">4.5+ ★</option>
            </select>
            <Star className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Discount % */}
          <div className="relative">
            <select
              value={value.minDiscount ?? ""}
              onChange={(e) => onChange({ ...value, minDiscount: e.target.value ? Number(e.target.value) : undefined })}
              className={`${chipBase} ${value.minDiscount ? "border-discount bg-discount/10 text-discount" : chipIdle} appearance-none pr-7 pl-7 cursor-pointer`}
            >
              <option value="">{t("catalog.minDiscount")}</option>
              <option value="10">10%+</option>
              <option value="25">25%+</option>
              <option value="50">50%+</option>
            </select>
            <BadgePercent className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Discount toggle */}
          <button
            onClick={() => onChange({ ...value, onlyDiscount: value.onlyDiscount ? undefined : true })}
            className={`${chipBase} ${value.onlyDiscount ? "border-discount bg-discount/10 text-discount" : chipIdle}`}
          >
            <BadgePercent className="h-3.5 w-3.5" />
            {t("catalog.onlyDiscount")}
          </button>

          {/* In stock */}
          <button
            onClick={() => onChange({ ...value, inStockOnly: value.inStockOnly ? undefined : true })}
            className={`${chipBase} ${value.inStockOnly ? chipActive : chipIdle}`}
          >
            <Package className="h-3.5 w-3.5" />
            {t("catalog.inStockOnly")}
          </button>

          {/* Free shipping */}
          <button
            onClick={() => onChange({ ...value, freeShipping: value.freeShipping ? undefined : true })}
            className={`${chipBase} ${value.freeShipping ? chipActive : chipIdle}`}
          >
            <Truck className="h-3.5 w-3.5" />
            {t("catalog.freeShipping")}
          </button>

          {/* Fast delivery */}
          <button
            onClick={() => onChange({ ...value, fastDelivery: value.fastDelivery ? undefined : true })}
            className={`${chipBase} ${value.fastDelivery ? chipActive : chipIdle}`}
          >
            <Zap className="h-3.5 w-3.5" />
            {t("catalog.fastDelivery")}
          </button>

          {/* New arrivals */}
          <button
            onClick={() => onChange({ ...value, newArrivals: value.newArrivals ? undefined : true })}
            className={`${chipBase} ${value.newArrivals ? chipActive : chipIdle}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("catalog.newArrivals")}
          </button>

          {/* Max delivery days */}
          <div className="relative">
            <select
              value={value.maxDeliveryDays ?? ""}
              onChange={(e) => onChange({ ...value, maxDeliveryDays: e.target.value ? Number(e.target.value) : undefined })}
              className={`${chipBase} ${value.maxDeliveryDays ? chipActive : chipIdle} appearance-none pr-7 pl-7 cursor-pointer`}
            >
              <option value="">{t("catalog.maxDeliveryDays")}</option>
              {DELIVERY_DAYS.map((d) => <option key={d} value={d}>≤{d}{t("catalog.daysShort")}</option>)}
            </select>
            <Clock className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* City */}
          <div className="relative">
            <select
              value={value.city ?? ""}
              onChange={(e) => onChange({ ...value, city: e.target.value || undefined })}
              className={`${chipBase} ${value.city ? chipActive : chipIdle} appearance-none pr-7 pl-7 cursor-pointer`}
            >
              <option value="">{t("catalog.deliveryCity")}</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <MapPin className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Condition */}
          <div className="relative">
            <select
              value={value.condition ?? ""}
              onChange={(e) => onChange({ ...value, condition: (e.target.value as "new" | "used") || undefined })}
              className={`${chipBase} ${value.condition ? chipActive : chipIdle} appearance-none pr-7 cursor-pointer`}
            >
              <option value="">{t("catalog.condition")}</option>
              <option value="new">{t("catalog.conditionNew")}</option>
              <option value="used">{t("catalog.conditionUsed")}</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active pills */}
      {(value.brand || value.minRating || priceActive || value.onlyDiscount || value.inStockOnly || value.freeShipping || value.fastDelivery || value.newArrivals || value.minDiscount || value.maxDeliveryDays || value.city || value.condition) && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <span className="text-[11px] text-muted-foreground font-semibold">{sortLabel} ·</span>
          {value.brand && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {value.brand} <button onClick={() => onChange({ ...value, brand: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {priceActive && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {priceLabel} <button onClick={() => onChange({ ...value, minPrice: undefined, maxPrice: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.minRating && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {value.minRating}+ ★ <button onClick={() => onChange({ ...value, minRating: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.minDiscount && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-discount/10 text-discount text-[11px] font-bold">
              {value.minDiscount}%+ <button onClick={() => onChange({ ...value, minDiscount: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.onlyDiscount && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-discount/10 text-discount text-[11px] font-bold">
              {t("catalog.onlyDiscount")} <button onClick={() => onChange({ ...value, onlyDiscount: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {t("catalog.inStockOnly")} <button onClick={() => onChange({ ...value, inStockOnly: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.freeShipping && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {t("catalog.freeShipping")} <button onClick={() => onChange({ ...value, freeShipping: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.fastDelivery && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {t("catalog.fastDelivery")} <button onClick={() => onChange({ ...value, fastDelivery: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.newArrivals && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {t("catalog.newArrivals")} <button onClick={() => onChange({ ...value, newArrivals: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.maxDeliveryDays && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              ≤{value.maxDeliveryDays}{t("catalog.daysShort")} <button onClick={() => onChange({ ...value, maxDeliveryDays: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.city && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {value.city} <button onClick={() => onChange({ ...value, city: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          {value.condition && (
            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {t(value.condition === "new" ? "catalog.conditionNew" : "catalog.conditionUsed")} <button onClick={() => onChange({ ...value, condition: undefined })}><X className="h-3 w-3" /></button>
            </span>
          )}
          <button onClick={reset} className="text-[11px] font-bold text-muted-foreground hover:text-primary underline ml-1">
            {t("catalog.reset")}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl shadow-elegant w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{t("catalog.filters")}</h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {Body}
          </div>
        </div>
      )}
    </>
  );
}
