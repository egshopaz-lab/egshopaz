import {
  ACQUISITION_DETAIL_SOURCES,
  ACQUISITION_SOURCES,
  type AcquisitionSource,
} from "@/lib/acquisitionSources";

interface Props {
  source: string;
  detail: string;
  enabled?: boolean;
  required?: boolean;
  onSourceChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  className?: string;
}

export function AcquisitionSourceFields({
  source,
  detail,
  enabled = true,
  required = true,
  onSourceChange,
  onDetailChange,
  className = "",
}: Props) {
  if (!enabled) return null;
  const needsDetail = ACQUISITION_DETAIL_SOURCES.has(source as AcquisitionSource);

  return (
    <div className={`space-y-2 ${className}`}>
      <div>
        <label className="text-sm font-semibold">
          Bizi necə tanıdınız? {required && <span className="text-destructive">*</span>}
        </label>
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          required={required}
          className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
        >
          <option value="">Mənbəni seçin</option>
          {ACQUISITION_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>
      {needsDetail && (
        <div>
          <label className="text-sm font-semibold">
            Kim tərəfindən cəlb olunmusunuz? <span className="text-destructive">*</span>
          </label>
          <input
            value={detail}
            onChange={(event) => onDetailChange(event.target.value)}
            required
            maxLength={250}
            placeholder="Ad, telefon, kod və ya digər məlumat"
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3"
          />
        </div>
      )}
    </div>
  );
}

