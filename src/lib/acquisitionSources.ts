export const ACQUISITION_SOURCES = [
  { value: "internet_ads", label: "İnternet reklamı" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "youtube", label: "YouTube" },
  { value: "friend_referral", label: "Dost tövsiyəsi" },
  { value: "seller_referral", label: "Satıcı tərəfindən" },
  { value: "pvz_referral", label: "PVZ tərəfindən" },
  { value: "employee_referral", label: "Şirkət əməkdaşı tərəfindən" },
  { value: "other", label: "Digər" },
] as const;

export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number]["value"];

export const ACQUISITION_DETAIL_SOURCES = new Set<AcquisitionSource>([
  "seller_referral", "pvz_referral", "employee_referral", "other",
]);

export function acquisitionSourceLabel(value: string | null | undefined) {
  return ACQUISITION_SOURCES.find((item) => item.value === value)?.label ?? "Məlum deyil";
}
