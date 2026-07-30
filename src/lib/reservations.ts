export const RESERVATION_MODULE_CODES = [
  "restaurant",
  "beauty_salon",
  "services",
  "rent_a_car",
  "clinic",
  "hotel",
  "course_center",
  "tourism",
  "events_tickets",
] as const;

export type ReservationModuleCode = (typeof RESERVATION_MODULE_CODES)[number];
export type ReservationStatus = "requested" | "confirmed" | "cancelled" | "completed" | "no_show";
export type ReservationPaymentStatus = "pending" | "paid" | "failed" | "refunded" | "not_required";

export const RESERVATION_MODULE_LABELS: Record<ReservationModuleCode, string> = {
  restaurant: "Restoran",
  beauty_salon: "Gözəllik salonu",
  services: "Xidmətlər",
  rent_a_car: "Rent a Car",
  clinic: "Klinika",
  hotel: "Otel",
  course_center: "Kurs mərkəzi",
  tourism: "Turizm",
  events_tickets: "Tədbirlər və biletlər",
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  table: "Masa",
  staff: "Usta / əməkdaş",
  service: "Xidmət",
  vehicle: "Avtomobil",
  doctor: "Həkim",
  room: "Otaq",
  course: "Kurs",
  tour: "Tur",
  event: "Tədbir / yer",
};

export const MODULE_RESOURCE_TYPE: Record<ReservationModuleCode, string> = {
  restaurant: "table",
  beauty_salon: "staff",
  services: "service",
  rent_a_car: "vehicle",
  clinic: "doctor",
  hotel: "room",
  course_center: "course",
  tourism: "tour",
  events_tickets: "event",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  requested: "Gözləyir",
  confirmed: "Təsdiqlənib",
  cancelled: "Ləğv edilib",
  completed: "Tamamlanıb",
  no_show: "Gəlmədi",
};

export const RESERVATION_STATUS_CLASSES: Record<ReservationStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  no_show: "bg-slate-200 text-slate-700",
};

export function isReservationModule(code: string): code is ReservationModuleCode {
  return (RESERVATION_MODULE_CODES as readonly string[]).includes(code);
}

export function reservationDateTime(value: string): string {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function reservationTime(value: string): string {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateKeyInBaku(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

