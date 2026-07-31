import { useEffect, useMemo, useState } from "react";
import { Boxes, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  getProductAttributeTemplate,
  makeVariantId,
  normalizeProductVariants,
  type ProductAttributeValue,
  type ProductVariantValue,
} from "@/lib/productAttributes";

interface ProductVariantEditorProps {
  categoryContext: string;
  basePrice: number;
  attributes: Record<string, ProductAttributeValue>;
  variants: unknown;
  onAttributesChange: (attributes: Record<string, ProductAttributeValue>) => void;
  onVariantsChange: (variants: ProductVariantValue[]) => void;
}

function cartesian(values: string[][]): string[][] {
  return values.reduce<string[][]>((rows, group) => {
    if (!group.length) return rows;
    return rows.flatMap((row) => group.map((value) => [...row, value]));
  }, [[]]);
}

export function ProductVariantEditor({
  categoryContext,
  basePrice,
  attributes,
  variants,
  onAttributesChange,
  onVariantsChange,
}: ProductVariantEditorProps) {
  const template = useMemo(() => getProductAttributeTemplate(categoryContext), [categoryContext]);
  const normalized = useMemo(() => normalizeProductVariants(variants, basePrice), [variants, basePrice]);
  const [axisInput, setAxisInput] = useState<Record<string, string>>({});
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    setAxisInput((current) => {
      const next = { ...current };
      for (const axis of template.variantAxes) {
        if (next[axis.key] == null) next[axis.key] = "";
      }
      return next;
    });
  }, [template]);

  const updateVariant = (index: number, patch: Partial<ProductVariantValue>) => {
    const next = [...normalized];
    next[index] = { ...next[index], ...patch };
    onVariantsChange(next);
  };

  const generateVariants = () => {
    const axes = template.variantAxes
      .map((axis) => ({
        ...axis,
        values: (axisInput[axis.key] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((axis) => axis.values.length);
    if (!axes.length) return;
    const existingKeys = new Set(normalized.map((variant) => JSON.stringify(variant.attributes)));
    const generated = cartesian(axes.map((axis) => axis.values)).flatMap((values) => {
      const variantAttributes = Object.fromEntries(axes.map((axis, index) => [axis.key, values[index]]));
      const key = JSON.stringify(variantAttributes);
      if (existingKeys.has(key)) return [];
      return [{
        id: makeVariantId(),
        attributes: variantAttributes,
        sku: "",
        barcode: "",
        stock: 0,
        price: Number(basePrice || 0),
        is_active: true,
      } satisfies ProductVariantValue];
    });
    onVariantsChange([...normalized, ...generated]);
  };

  const attributeColumns = Array.from(new Set([
    ...template.variantAxes.map((axis) => axis.key),
    ...normalized.flatMap((variant) => Object.keys(variant.attributes)),
  ]));

  return (
    <section className="space-y-5 rounded-2xl border border-violet-200 bg-violet-50/30 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
          <Boxes className="h-5 w-5" />
        </span>
        <div>
          <h4 className="font-black">XĂĽsusiyyÉ™tlÉ™r vÉ™ mÉ™hsul variantlarÄ±</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Kateqoriya profili: <strong className="text-foreground">{template.label}</strong>. MÉ™cburi texniki mÉ™lumatlarÄ± vÉ™ satÄ±lan hÉ™r kombinasiyanÄ± ayrÄ±ca qeyd edin.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div>
          <h5 className="text-sm font-bold">MÉ™hsulun texniki xĂĽsusiyyÉ™tlÉ™ri</h5>
          <p className="text-xs text-muted-foreground">Bu mÉ™lumatlar mÉ™hsul sÉ™hifÉ™sindÉ™ alÄ±cÄ±ya cÉ™dvÉ™l ĹźÉ™klindÉ™ gĂ¶stÉ™rilÉ™cÉ™k.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {template.specifications.map((field) => (
            <label key={field.key} className="space-y-1 text-xs font-semibold">
              <span>{field.label}{field.required ? " *" : ""}</span>
              <input
                list={`spec-${field.key}`}
                value={String(attributes[field.key] ?? "")}
                onChange={(event) => onAttributesChange({ ...attributes, [field.key]: event.target.value })}
                placeholder={field.placeholder}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal"
              />
              {field.options?.length ? (
                <datalist id={`spec-${field.key}`}>
                  {field.options.map((option) => <option key={option} value={option} />)}
                </datalist>
              ) : null}
            </label>
          ))}
        </div>
        {Object.entries(attributes)
          .filter(([key]) => !template.specifications.some((field) => field.key === key))
          .map(([key, value]) => (
            <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input value={key} disabled className="h-9 rounded-lg border bg-secondary px-2 text-xs" />
              <input
                value={String(value)}
                onChange={(event) => onAttributesChange({ ...attributes, [key]: event.target.value })}
                className="h-9 rounded-lg border bg-background px-2 text-xs"
              />
              <button type="button" onClick={() => {
                const next = { ...attributes };
                delete next[key];
                onAttributesChange(next);
              }} className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10" aria-label={`${key} xĂĽsusiyyÉ™tini sil`}><Trash2 className="mx-auto h-4 w-4" /></button>
            </div>
          ))}
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={customKey} onChange={(event) => setCustomKey(event.target.value)} placeholder="ĆŹlavÉ™ xĂĽsusiyyÉ™tin adÄ±" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <input value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder="DÉ™yÉ™r" className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <button type="button" onClick={() => {
            const key = customKey.trim().toLocaleLowerCase("az").replace(/\s+/g, "_");
            if (!key || !customValue.trim()) return;
            onAttributesChange({ ...attributes, [key]: customValue.trim() });
            setCustomKey("");
            setCustomValue("");
          }} className="h-10 rounded-lg bg-secondary px-4 text-xs font-bold"><Plus className="mr-1 inline h-4 w-4" /> ĆŹlavÉ™ et</button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold">Variant kombinasiyalarÄ±nÄ± yarat</h5>
            <p className="text-xs text-muted-foreground">DÉ™yÉ™rlÉ™ri vergĂĽllÉ™ ayÄ±rÄ±n. MÉ™sÉ™lÉ™n: Qara, AÄź vÉ™ S, M, L.</p>
          </div>
          <button type="button" onClick={generateVariants} className="h-10 rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700">
            <Sparkles className="mr-1.5 inline h-4 w-4" /> KombinasiyalarÄ± yarat
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {template.variantAxes.map((axis) => (
            <label key={axis.key} className="space-y-1 text-xs font-semibold">
              <span>{axis.label}</span>
              <input
                list={`axis-${axis.key}`}
                value={axisInput[axis.key] ?? ""}
                onChange={(event) => setAxisInput({ ...axisInput, [axis.key]: event.target.value })}
                placeholder={axis.options?.slice(0, 3).join(", ") || axis.placeholder || "DÉ™yÉ™rlÉ™ri vergĂĽllÉ™ ayÄ±rÄ±n"}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal"
              />
              {axis.options?.length ? <datalist id={`axis-${axis.key}`}>{axis.options.map((option) => <option key={option} value={option} />)}</datalist> : null}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold">SatÄ±Ĺź variantlarÄ± ({normalized.length})</h5>
            <p className="text-xs text-muted-foreground">Stok vÉ™ qiymÉ™t hÉ™r kombinasiya ĂĽĂ§ĂĽn ayrÄ±dÄ±r.</p>
          </div>
          <button type="button" onClick={() => onVariantsChange([...normalized, {
            id: makeVariantId(), attributes: {}, sku: "", barcode: "", stock: 0, price: Number(basePrice || 0), is_active: true,
          }])} className="h-9 rounded-lg bg-secondary px-3 text-xs font-bold"><Plus className="mr-1 inline h-4 w-4" /> BoĹź variant</button>
        </div>
        {normalized.length ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="min-w-[900px] w-full text-left text-xs">
              <thead className="bg-secondary/70 text-muted-foreground">
                <tr>
                  {attributeColumns.map((key) => <th key={key} className="p-3">{template.variantAxes.find((axis) => axis.key === key)?.label || key}</th>)}
                  <th className="p-3">SKU</th><th className="p-3">Barkod</th><th className="p-3">Stok</th><th className="p-3">QiymÉ™t (â‚Ľ)</th><th className="p-3">Aktiv</th><th className="w-12 p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {normalized.map((variant, index) => (
                  <tr key={variant.id || index}>
                    {attributeColumns.map((key) => (
                      <td key={key} className="p-2"><input value={variant.attributes[key] ?? ""} onChange={(event) => updateVariant(index, { attributes: { ...variant.attributes, [key]: event.target.value } })} className="h-9 w-28 rounded-lg border bg-background px-2" /></td>
                    ))}
                    <td className="p-2"><input value={variant.sku ?? ""} onChange={(event) => updateVariant(index, { sku: event.target.value })} className="h-9 w-32 rounded-lg border bg-background px-2 font-mono" /></td>
                    <td className="p-2"><input value={variant.barcode ?? ""} onChange={(event) => updateVariant(index, { barcode: event.target.value.replace(/\s/g, "") })} className="h-9 w-36 rounded-lg border bg-background px-2 font-mono" /></td>
                    <td className="p-2"><input type="number" min={0} value={variant.stock} onChange={(event) => updateVariant(index, { stock: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-20 rounded-lg border bg-background px-2" /></td>
                    <td className="p-2"><input type="number" min={0} step="0.01" value={variant.price ?? basePrice} onChange={(event) => updateVariant(index, { price: Math.max(0, Number(event.target.value) || 0) })} className="h-9 w-24 rounded-lg border bg-background px-2" /></td>
                    <td className="p-2 text-center"><input type="checkbox" checked={variant.is_active !== false} onChange={(event) => updateVariant(index, { is_active: event.target.checked })} className="h-4 w-4 accent-violet-600" /></td>
                    <td className="p-2"><button type="button" onClick={() => onVariantsChange(normalized.filter((_, rowIndex) => rowIndex !== index))} className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="mx-auto h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">Bu mÉ™hsulun ayrÄ±ca variantÄ± yoxdursa bĂ¶lmÉ™ni boĹź saxlaya bilÉ™rsiniz.</div>
        )}
      </div>
    </section>
  );
}

