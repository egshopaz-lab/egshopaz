import { Calendar, X } from "lucide-react";

export interface DateRange {
  from: string; // yyyy-mm-dd
  to: string;   // yyyy-mm-dd
}

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
  className?: string;
}

const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (k: number) => k.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const emptyRange: DateRange = { from: "", to: "" };

/** Tətbiq olunan tarix aralığı varsa true qaytarır */
export const isRangeActive = (r: DateRange) => !!(r.from || r.to);

/** ISO tarix (yaradılma) verilmiş aralığa düşürsə true */
export const inRange = (iso: string | null | undefined, r: DateRange): boolean => {
  if (!iso) return !isRangeActive(r);
  if (!isRangeActive(r)) return true;
  const t = new Date(iso).getTime();
  if (r.from) {
    const start = new Date(r.from + "T00:00:00").getTime();
    if (t < start) return false;
  }
  if (r.to) {
    const end = new Date(r.to + "T23:59:59.999").getTime();
    if (t > end) return false;
  }
  return true;
};

export function DateRangeFilter({ value, onChange, className }: Props) {
  const set = (patch: Partial<DateRange>) => onChange({ ...value, ...patch });
  const setBoth = (from: string, to: string) => onChange({ from, to });

  return (
    <div
      className={`flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl p-2.5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pl-1">
        <Calendar className="h-3.5 w-3.5 text-primary" /> Tarix:
      </div>
      <input
        type="date"
        value={value.from}
        max={value.to || undefined}
        onChange={(e) => set({ from: e.target.value })}
        className="text-xs px-2 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Başlanğıc tarix"
      />
      <span className="text-xs text-muted-foreground">—</span>
      <input
        type="date"
        value={value.to}
        min={value.from || undefined}
        onChange={(e) => set({ to: e.target.value })}
        className="text-xs px-2 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Son tarix"
      />
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setBoth(todayStr(), todayStr())}
          className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 font-semibold"
        >
          Bu gün
        </button>
        <button
          type="button"
          onClick={() => setBoth(daysAgoStr(6), todayStr())}
          className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 font-semibold"
        >
          7 gün
        </button>
        <button
          type="button"
          onClick={() => setBoth(daysAgoStr(29), todayStr())}
          className="text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 font-semibold"
        >
          30 gün
        </button>
        {isRangeActive(value) && (
          <button
            type="button"
            onClick={() => onChange(emptyRange)}
            className="text-[11px] px-2 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Sıfırla
          </button>
        )}
      </div>
    </div>
  );
}
