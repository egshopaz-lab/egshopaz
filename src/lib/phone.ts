export const PHONE_COUNTRIES = [
  { code: "AZ", label: "Azərbaycan", dial: "+994", flag: "🇦🇿" },
  { code: "TR", label: "Türkiyə", dial: "+90", flag: "🇹🇷" },
  { code: "GE", label: "Gürcüstan", dial: "+995", flag: "🇬🇪" },
  { code: "RU", label: "Rusiya", dial: "+7", flag: "🇷🇺" },
  { code: "UA", label: "Ukrayna", dial: "+380", flag: "🇺🇦" },
  { code: "KZ", label: "Qazaxıstan", dial: "+7", flag: "🇰🇿" },
  { code: "UZ", label: "Özbəkistan", dial: "+998", flag: "🇺🇿" },
  { code: "PL", label: "Polşa", dial: "+48", flag: "🇵🇱" },
  { code: "DE", label: "Almaniya", dial: "+49", flag: "🇩🇪" },
  { code: "GB", label: "Böyük Britaniya", dial: "+44", flag: "🇬🇧" },
  { code: "US", label: "ABŞ / Kanada", dial: "+1", flag: "🇺🇸" },
  { code: "FR", label: "Fransa", dial: "+33", flag: "🇫🇷" },
  { code: "IT", label: "İtaliya", dial: "+39", flag: "🇮🇹" },
  { code: "AE", label: "BƏƏ", dial: "+971", flag: "🇦🇪" },
  { code: "SA", label: "Səudiyyə Ərəbistanı", dial: "+966", flag: "🇸🇦" },
] as const;

export function sanitizeInternationalPhone(value: string) {
  const trimmed = value.trim();
  const international = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  const digits = international.replace(/\D/g, "");
  return international.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeE164Phone(value: string, fallbackDial = "+994") {
  const sanitized = sanitizeInternationalPhone(value);
  if (sanitized.startsWith("+")) return sanitized;
  const national = sanitized.replace(/^0+/, "");
  return national ? `${fallbackDial}${national}` : "";
}

export function isValidE164Phone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function detectDialCode(value: string) {
  const normalized = sanitizeInternationalPhone(value);
  if (!normalized.startsWith("+")) return "+994";
  const matches = PHONE_COUNTRIES
    .map((country) => country.dial)
    .filter((dial) => normalized.startsWith(dial))
    .sort((a, b) => b.length - a.length);
  return matches[0] ?? "";
}


