import { useEffect, useMemo, useState } from "react";
import {
  PHONE_COUNTRIES,
  detectDialCode,
  normalizeE164Phone,
  sanitizeInternationalPhone,
} from "@/lib/phone";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function PhoneNumberField({
  value,
  onChange,
  disabled,
  required,
  id,
}: PhoneNumberFieldProps) {
  const detectedDial = useMemo(() => detectDialCode(value), [value]);
  const [dialCode, setDialCode] = useState(detectedDial || "+994");
  const isCustom = dialCode === "custom";

  useEffect(() => {
    if (detectedDial && detectedDial !== dialCode) setDialCode(detectedDial);
  }, [detectedDial, dialCode]);

  const shownValue = isCustom
    ? value
    : value.startsWith(dialCode)
      ? value.slice(dialCode.length)
      : value.startsWith("+")
        ? value
        : value;

  const changeDialCode = (nextDial: string) => {
    if (nextDial === "custom") {
      setDialCode("custom");
      onChange(value.startsWith("+") ? value : "");
      return;
    }

    const previousDial = dialCode !== "custom" ? dialCode : detectDialCode(value);
    const national = value.startsWith(previousDial)
      ? value.slice(previousDial.length)
      : value.replace(/\D/g, "");
    setDialCode(nextDial);
    onChange(normalizeE164Phone(national, nextDial));
  };

  const changeNumber = (raw: string) => {
    if (isCustom || raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
      onChange(sanitizeInternationalPhone(raw));
      return;
    }
    onChange(normalizeE164Phone(raw, dialCode));
  };

  return (
    <div className="flex min-w-0 gap-2">
      <select
        aria-label="Ölkə kodu"
        value={isCustom ? "custom" : dialCode}
        onChange={(event) => changeDialCode(event.target.value)}
        disabled={disabled}
        className="h-11 w-[132px] shrink-0 rounded-lg border border-input bg-background px-2 text-sm"
      >
        {PHONE_COUNTRIES.map((country) => (
          <option key={country.code} value={country.dial}>
            {country.flag} {country.dial}
          </option>
        ))}
        <option value="custom">🌍 Digər</option>
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={shownValue}
        onChange={(event) => changeNumber(event.target.value)}
        disabled={disabled}
        required={required}
        maxLength={20}
        placeholder={isCustom ? "+ ölkə kodu və nömrə" : "50 000 00 00"}
        className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}


