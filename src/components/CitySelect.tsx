import { AZ_CITIES } from "@/lib/azCities";

interface Props {
  value: string | null | undefined;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
  includeEmpty?: boolean;
}

// Group cities by region for nicer UX
const groups = AZ_CITIES.reduce<Record<string, typeof AZ_CITIES>>((acc, c) => {
  const k = c.region || "Digər";
  (acc[k] ||= [] as any).push(c);
  return acc;
}, {});

export function CitySelect({ value, onChange, className = "", placeholder = "Şəhər seçin", includeEmpty }: Props) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
            className={`h-10 px-3 rounded-lg border border-input bg-background text-sm ${className}`}>
      {includeEmpty && <option value="">{placeholder}</option>}
      {!includeEmpty && !value && <option value="" disabled>{placeholder}</option>}
      {Object.entries(groups).map(([region, list]) => (
        <optgroup key={region} label={region}>
          {list.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
