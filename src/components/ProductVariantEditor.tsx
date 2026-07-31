import { useEffect, useMemo, useState } from "react";
import { Boxes, ImagePlus, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { makeVariantId, normalizeProductVariants, type ProductAttributeValue, type ProductVariantValue } from "@/lib/productAttributes";

type AttributeOption = { id: string; value: string; label_az: string; label_ru?: string | null; label_en?: string | null; color_hex?: string | null };
type AttributeSchema = {
  attribute_id: string;
  code: string;
  name_az: string;
  name_ru: string | null;
  name_en: string | null;
  data_type: "text" | "number" | "boolean" | "select" | "multiselect" | "date" | "color";
  unit: string | null;
  placeholder: string | null;
  is_required: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  sort_order: number;
  options: AttributeOption[];
};

interface ProductVariantEditorProps {
  categoryId: string | null | undefined;
  basePrice: number;
  attributes: Record<string, ProductAttributeValue>;
  variants: unknown;
  onAttributesChange: (attributes: Record<string, ProductAttributeValue>) => void;
  onVariantsChange: (variants: ProductVariantValue[]) => void;
}

function cartesian(values: string[][]): string[][] {
  return values.reduce<string[][]>((rows, group) => rows.flatMap((row) => group.map((value) => [...row, value])), [[]]);
}

function optionLabel(option: AttributeOption) {
  return option.label_az || option.value;
}

export function ProductVariantEditor({ categoryId, basePrice, attributes, variants, onAttributesChange, onVariantsChange }: ProductVariantEditorProps) {
  const [schema, setSchema] = useState<AttributeSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [axisValues, setAxisValues] = useState<Record<string, string[]>>({});
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const normalized = useMemo(() => normalizeProductVariants(variants, basePrice), [variants, basePrice]);

  useEffect(() => {
    if (!categoryId) { setSchema([]); return; }
    let cancelled = false;
    setLoading(true);
    (supabase as any).rpc("catalog_schema_for_category", { _category_id: categoryId }).then(({ data, error }: any) => {
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setSchema([]);
        toast.error(`Kateqoriya atributları yüklənmədi: ${error.message}`);
        return;
      }
      setSchema((data ?? []).map((row: any) => ({ ...row, options: Array.isArray(row.options) ? row.options : [] })) as AttributeSchema[]);
    });
    return () => { cancelled = true; };
  }, [categoryId]);

  const axes = schema.filter((field) => field.is_variant);
  const specifications = schema.filter((field) => !field.is_variant);
  const knownCodes = new Set(schema.map((field) => field.code));
  const attributeColumns = Array.from(new Set([...axes.map((axis) => axis.code), ...normalized.flatMap((variant) => Object.keys(variant.attributes))]));

  const updateVariant = (index: number, patch: Partial<ProductVariantValue>) => {
    const next = [...normalized];
    next[index] = { ...next[index], ...patch };
    onVariantsChange(next);
  };

  const toggleAxisValue = (axis: AttributeSchema, value: string) => {
    const current = axisValues[axis.code] ?? [];
    setAxisValues({ ...axisValues, [axis.code]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const generateVariants = () => {
    const selectedAxes = axes.map((axis) => ({ axis, values: axisValues[axis.code] ?? [] })).filter((entry) => entry.values.length);
    if (!selectedAxes.length) return toast.error("Ən azı bir variant dəyəri seçin");
    const existing = new Set(normalized.map((variant) => JSON.stringify(variant.attributes)));
    const generated = cartesian(selectedAxes.map((entry) => entry.values)).flatMap((values) => {
      const variantAttributes = Object.fromEntries(selectedAxes.map((entry, index) => [entry.axis.code, values[index]]));
      if (existing.has(JSON.stringify(variantAttributes))) return [];
      return [{ id: makeVariantId(), attributes: variantAttributes, sku: "", barcode: "", stock: 0, price: Number(basePrice || 0), image_url: "", is_active: true } satisfies ProductVariantValue];
    });
    onVariantsChange([...normalized, ...generated]);
  };

  const renderField = (field: AttributeSchema) => {
    const value = attributes[field.code];
    const setValue = (next: ProductAttributeValue) => onAttributesChange({ ...attributes, [field.code]: next });
    if (field.data_type === "boolean") {
      return <select value={String(value ?? "")} onChange={(event) => setValue(event.target.value)} className="field-control"><option value="">Seçin</option><option value="true">Bəli</option><option value="false">Xeyr</option></select>;
    }
    if (field.data_type === "select" || field.data_type === "color") {
      return <select value={String(value ?? "")} onChange={(event) => setValue(event.target.value)} className="field-control"><option value="">Seçin</option>{field.options.map((option) => <option key={option.id} value={optionLabel(option)}>{optionLabel(option)}</option>)}</select>;
    }
    if (field.data_type === "multiselect") {
      const selected = String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      return <div className="flex flex-wrap gap-1.5">{field.options.map((option) => { const label = optionLabel(option); return <button type="button" key={option.id} onClick={() => setValue(selected.includes(label) ? selected.filter((item) => item !== label).join(", ") : [...selected, label].join(", "))} className={`rounded-full border px-2.5 py-1 text-xs ${selected.includes(label) ? "border-primary bg-primary/10 text-primary" : "bg-background"}`}>{label}</button>; })}</div>;
    }
    return <div className="relative"><input type={field.data_type === "number" ? "number" : field.data_type === "date" ? "date" : "text"} value={String(value ?? "")} onChange={(event) => setValue(field.data_type === "number" ? Number(event.target.value) : event.target.value)} placeholder={field.placeholder ?? ""} className="field-control pr-12" />{field.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.unit}</span>}</div>;
  };

  return <section className="space-y-5 rounded-2xl border border-violet-200 bg-violet-50/30 p-4 sm:p-5 [&_.field-control]:h-10 [&_.field-control]:w-full [&_.field-control]:rounded-lg [&_.field-control]:border [&_.field-control]:bg-background [&_.field-control]:px-3 [&_.field-control]:text-sm">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Boxes className="h-5 w-5" /></span><div><h4 className="font-black">Xüsusiyyətlər və məhsul variantları</h4><p className="mt-1 text-xs text-muted-foreground">Sahələr admin panelində seçilmiş kateqoriyaya görə avtomatik formalaşır.</p></div></div>
    {!categoryId ? <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">Atributları görmək üçün əvvəlcə kateqoriya seçin.</div> : loading ? <div className="flex items-center justify-center gap-2 rounded-xl border bg-background p-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Atributlar yüklənir...</div> : <>
      <div className="space-y-3 rounded-xl border bg-background p-4"><div><h5 className="text-sm font-bold">Məhsulun texniki xüsusiyyətləri</h5><p className="text-xs text-muted-foreground">Bu məlumatlar alıcıya məhsul səhifəsində göstəriləcək və uyğun sahələr kataloq filtrinə çevriləcək.</p></div>
        {specifications.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{specifications.map((field) => <label key={field.attribute_id} className="space-y-1 text-xs font-semibold"><span>{field.name_az}{field.is_required ? " *" : ""}{field.is_filterable ? <em className="ml-1 not-italic text-[10px] text-violet-600">filtr</em> : null}</span>{renderField(field)}</label>)}</div> : <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">Bu kateqoriya üçün texniki atribut təyin edilməyib. Admin panelindən əlavə etmək olar.</div>}
        {Object.entries(attributes).filter(([key]) => !knownCodes.has(key)).map(([key, value]) => <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input value={key} disabled className="h-9 rounded-lg border bg-secondary px-2 text-xs" /><input value={String(value)} onChange={(event) => onAttributesChange({ ...attributes, [key]: event.target.value })} className="h-9 rounded-lg border bg-background px-2 text-xs" /><button type="button" onClick={() => { const next = { ...attributes }; delete next[key]; onAttributesChange(next); }} className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="mx-auto h-4 w-4" /></button></div>)}
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={customKey} onChange={(event) => setCustomKey(event.target.value)} placeholder="Əlavə xüsusiyyətin adı" className="h-10 rounded-lg border bg-background px-3 text-sm" /><input value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder="Dəyər" className="h-10 rounded-lg border bg-background px-3 text-sm" /><button type="button" onClick={() => { const key = customKey.trim().toLocaleLowerCase("az").replace(/\s+/g, "_"); if (!key || !customValue.trim()) return; onAttributesChange({ ...attributes, [key]: customValue.trim() }); setCustomKey(""); setCustomValue(""); }} className="h-10 rounded-lg bg-secondary px-4 text-xs font-bold"><Plus className="mr-1 inline h-4 w-4" /> Əlavə et</button></div>
      </div>

      {axes.length ? <div className="space-y-4 rounded-xl border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h5 className="text-sm font-bold">Variant kombinasiyalarını yarat</h5><p className="text-xs text-muted-foreground">Rəng, ölçü, yaddaş və digər satış variantlarını seçin.</p></div><button type="button" onClick={generateVariants} className="h-10 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white"><Sparkles className="mr-1.5 inline h-4 w-4" /> Kombinasiyaları yarat</button></div>
        <div className="grid gap-4 md:grid-cols-2">{axes.map((axis) => <div key={axis.attribute_id}><div className="mb-2 text-xs font-bold">{axis.name_az}{axis.is_required ? " *" : ""}</div>{axis.options.length ? <div className="flex flex-wrap gap-2">{axis.options.map((option) => { const label = optionLabel(option); const active = (axisValues[axis.code] ?? []).includes(label); return <button type="button" key={option.id} onClick={() => toggleAxisValue(axis, label)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active ? "border-violet-500 bg-violet-50 text-violet-700" : ""}`}>{option.color_hex && <span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: option.color_hex }} />}{label}</button>; })}</div> : <input value={(axisValues[axis.code] ?? []).join(", ")} onChange={(event) => setAxisValues({ ...axisValues, [axis.code]: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Dəyərləri vergüllə ayırın" className="field-control" />}</div>)}</div>
      </div> : null}

      <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h5 className="text-sm font-bold">Satış variantları ({normalized.length})</h5><p className="text-xs text-muted-foreground">Qiymət, stok, SKU, barkod və şəkil hər kombinasiya üçün ayrıdır.</p></div><button type="button" onClick={() => onVariantsChange([...normalized, { id: makeVariantId(), attributes: {}, sku: "", barcode: "", stock: 0, price: Number(basePrice || 0), image_url: "", is_active: true }])} className="h-9 rounded-lg bg-secondary px-3 text-xs font-bold"><Plus className="mr-1 inline h-4 w-4" /> Boş variant</button></div>
        {normalized.length ? <div className="overflow-x-auto rounded-xl border bg-background"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="bg-secondary/70 text-muted-foreground"><tr>{attributeColumns.map((code) => <th key={code} className="p-3">{schema.find((field) => field.code === code)?.name_az || code}</th>)}<th className="p-3">SKU</th><th className="p-3">Barkod</th><th className="p-3">Stok</th><th className="p-3">Qiymət (₼)</th><th className="p-3">Şəkil URL</th><th className="p-3">Aktiv</th><th /></tr></thead><tbody className="divide-y">{normalized.map((variant, index) => <tr key={variant.id || index}>{attributeColumns.map((code) => <td key={code} className="p-2"><input value={variant.attributes[code] ?? ""} onChange={(event) => updateVariant(index, { attributes: { ...variant.attributes, [code]: event.target.value } })} className="h-9 w-28 rounded-lg border px-2" /></td>)}<td className="p-2"><input value={variant.sku ?? ""} onChange={(event) => updateVariant(index, { sku: event.target.value })} className="h-9 w-32 rounded-lg border px-2 font-mono" /></td><td className="p-2"><input value={variant.barcode ?? ""} onChange={(event) => updateVariant(index, { barcode: event.target.value.replace(/\s/g, "") })} className="h-9 w-36 rounded-lg border px-2 font-mono" /></td><td className="p-2"><input type="number" min={0} value={variant.stock} onChange={(event) => updateVariant(index, { stock: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-20 rounded-lg border px-2" /></td><td className="p-2"><input type="number" min={0} step="0.01" value={variant.price ?? basePrice} onChange={(event) => updateVariant(index, { price: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-24 rounded-lg border px-2" /></td><td className="p-2"><label className="relative block"><ImagePlus className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><input value={variant.image_url ?? ""} onChange={(event) => updateVariant(index, { image_url: event.target.value })} placeholder="https://..." className="h-9 w-44 rounded-lg border pl-8 pr-2" /></label></td><td className="p-2 text-center"><input type="checkbox" checked={variant.is_active !== false} onChange={(event) => updateVariant(index, { is_active: event.target.checked })} className="h-4 w-4 accent-violet-600" /></td><td className="p-2"><button type="button" onClick={() => onVariantsChange(normalized.filter((_, row) => row !== index))} className="h-9 w-9 rounded-lg text-destructive"><Trash2 className="mx-auto h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">Variantı olmayan məhsul üçün bu bölməni boş saxlamaq olar.</div>}
      </div>
    </>}
  </section>;
}
