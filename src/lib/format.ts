export const formatAZN = (value: number | string | null | undefined): string => {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!isFinite(n)) return "0 ₼";
  return new Intl.NumberFormat("az-AZ", {
    useGrouping: false,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n) + " ₼";
};

export const calcDiscount = (price: number, oldPrice?: number | null): number => {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const pad = (n: number) => n.toString().padStart(2, "0");

/** Vahid tarix+saat formatı: dd.MM.yyyy HH:mm */
export const formatDateTime = (value: string | number | Date | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Yalnız tarix: dd.MM.yyyy */
export const formatDate = (value: string | number | Date | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
