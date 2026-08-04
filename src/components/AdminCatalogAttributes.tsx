import { useEffect, useMemo, useState } from "react";
import { Check, Link2, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string; parent_id: string | null };
type Definition = {
  id: string;
  code: string;
  name_az: string;
  name_ru: string | null;
  name_en: string | null;
  data_type: string;
  unit: string | null;
  placeholder: string | null;
  is_active: boolean;
};
type Binding = {
  category_id: string;
  attribute_id: string;
  is_required: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  sort_order: number;
};
type Option = { id: string; attribute_id: string; value: string; label_az: string; sort_order: number; is_active: boolean };

const emptyDefinition = {
  code: "",
  name_az: "",
  name_ru: "",
  name_en: "",
  data_type: "text",
  unit: "",
  placeholder: "",
  options: "",
};

const db = supabase as any;

function slugCode(value: string) {
  return value
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function AdminCatalogAttributes() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [form, setForm] = useState(emptyDefinition);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [categoryResult, definitionResult, bindingResult, optionResult] = await Promise.all([
      db.from("categories").select("id,name,parent_id,sort_order").order("sort_order"),
      db.from("catalog_attribute_definitions").select("id,code,name_az,name_ru,name_en,data_type,unit,placeholder,is_active").order("name_az"),
      db.from("category_attributes").select("category_id,attribute_id,is_required,is_filterable,is_variant,sort_order").order("sort_order"),
      db.from("catalog_attribute_options").select("id,attribute_id,value,label_az,sort_order,is_active").order("sort_order"),
    ]);
    const error = categoryResult.error || definitionResult.error || bindingResult.error || optionResult.error;
    if (error) {
      toast.error(`Atribut sistemi yüklənmədi: ${error.message}`);
      return;
    }
    const nextCategories = (categoryResult.data ?? []) as Category[];
    setCategories(nextCategories);
    setDefinitions((definitionResult.data ?? []) as Definition[]);
    setBindings((bindingResult.data ?? []) as Binding[]);
    setOptions((optionResult.data ?? []) as Option[]);
    setCategoryId((current) => current || nextCategories[0]?.id || "");
  };

  useEffect(() => { void load(); }, []);

  const selectedBindings = useMemo(
    () => bindings.filter((binding) => binding.category_id === categoryId).sort((a, b) => a.sort_order - b.sort_order),
    [bindings, categoryId],
  );
  const availableDefinitions = definitions.filter((definition) => !selectedBindings.some((binding) => binding.attribute_id === definition.id));

  const createDefinition = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = slugCode(form.code || form.name_az);
    if (code.length < 2 || !form.name_az.trim()) return toast.error("Atributun adı və kodu tələb olunur");
    setBusy(true);
    const { data, error } = await db.from("catalog_attribute_definitions").insert({
      code,
      name_az: form.name_az.trim(),
      name_ru: form.name_ru.trim() || null,
      name_en: form.name_en.trim() || null,
      data_type: form.data_type,
      unit: form.unit.trim() || null,
      placeholder: form.placeholder.trim() || null,
    }).select("id").single();
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const values = form.options.split(",").map((value) => value.trim()).filter(Boolean);
    if (values.length) {
      const { error: optionError } = await db.from("catalog_attribute_options").insert(values.map((label, index) => ({
        attribute_id: data.id,
        value: slugCode(label) || String(index + 1),
        label_az: label,
        sort_order: index,
      })));
      if (optionError) toast.error(`Atribut yaradıldı, seçimlər saxlanmadı: ${optionError.message}`);
    }
    setBusy(false);
    setCreating(false);
    setForm(emptyDefinition);
    toast.success("Yeni atribut yaradıldı");
    await load();
  };

  const bind = async () => {
    if (!categoryId || !definitionId) return;
    const sortOrder = selectedBindings.length ? Math.max(...selectedBindings.map((row) => row.sort_order)) + 10 : 10;
    const { error } = await db.from("category_attributes").insert({ category_id: categoryId, attribute_id: definitionId, sort_order: sortOrder });
    if (error) return toast.error(error.message);
    setDefinitionId("");
    toast.success("Atribut kateqoriyaya bağlandı");
    await load();
  };

  const updateBinding = async (binding: Binding, patch: Partial<Binding>) => {
    const { error } = await db.from("category_attributes").update(patch)
      .eq("category_id", binding.category_id).eq("attribute_id", binding.attribute_id);
    if (error) return toast.error(error.message);
    setBindings((rows) => rows.map((row) => row.category_id === binding.category_id && row.attribute_id === binding.attribute_id ? { ...row, ...patch } : row));
  };

  const unbind = async (binding: Binding) => {
    if (!confirm("Atribut bu kateqoriyadan çıxarılsın? Məhsul məlumatları silinməyəcək.")) return;
    const { error } = await db.from("category_attributes").delete()
      .eq("category_id", binding.category_id).eq("attribute_id", binding.attribute_id);
    if (error) return toast.error(error.message);
    setBindings((rows) => rows.filter((row) => row !== binding));
  };

  const addOption = async (definition: Definition) => {
    const label = prompt(`"${definition.name_az}" üçün yeni seçim:`)?.trim();
    if (!label) return;
    const current = options.filter((option) => option.attribute_id === definition.id);
    const { error } = await db.from("catalog_attribute_options").insert({
      attribute_id: definition.id,
      value: slugCode(label) || String(current.length + 1),
      label_az: label,
      sort_order: current.length * 10,
    });
    if (error) return toast.error(error.message);
    await load();
  };

  const removeOption = async (option: Option) => {
    const { error } = await db.from("catalog_attribute_options").delete().eq("id", option.id);
    if (error) return toast.error(error.message);
    setOptions((rows) => rows.filter((row) => row.id !== option.id));
  };

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black"><Settings2 className="h-5 w-5 text-primary" /> Dinamik atribut konstruktoru</h2>
          <p className="mt-1 text-sm text-muted-foreground">Məhsul forması və kataloq filtrləri buradakı qaydalardan avtomatik yaranır.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Yeni atribut
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)]">
        <label className="space-y-1.5 text-sm font-bold">
          <span>Kateqoriya</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 font-normal">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.parent_id ? "↳ " : ""}{category.name}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1.5 text-sm font-bold">
            <span>Mövcud atributu bağla</span>
            <select value={definitionId} onChange={(event) => setDefinitionId(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3 font-normal">
              <option value="">Atribut seçin</option>
              {availableDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name_az} ({definition.code})</option>)}
            </select>
          </label>
          <button onClick={bind} disabled={!definitionId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-50">
            <Link2 className="h-4 w-4" /> Bağla
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-secondary/70 text-xs text-muted-foreground"><tr><th className="p-3">Atribut</th><th>Tip</th><th>Məcburi</th><th>Filtr</th><th>Variant</th><th>Sıra</th><th>Seçimlər</th><th /></tr></thead>
          <tbody className="divide-y">
            {selectedBindings.map((binding) => {
              const definition = definitions.find((row) => row.id === binding.attribute_id);
              if (!definition) return null;
              const definitionOptions = options.filter((option) => option.attribute_id === definition.id);
              return <tr key={binding.attribute_id}>
                <td className="p-3"><b>{definition.name_az}</b><div className="font-mono text-[10px] text-muted-foreground">{definition.code}</div></td>
                <td className="text-xs">{definition.data_type}{definition.unit ? ` · ${definition.unit}` : ""}</td>
                {(["is_required", "is_filterable", "is_variant"] as const).map((key) => <td key={key}><button onClick={() => void updateBinding(binding, { [key]: !binding[key] })} className={`grid h-8 w-8 place-items-center rounded-lg border ${binding[key] ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "text-muted-foreground"}`}>{binding[key] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</button></td>)}
                <td><input type="number" value={binding.sort_order} onChange={(event) => void updateBinding(binding, { sort_order: Number(event.target.value) })} className="h-9 w-20 rounded-lg border bg-background px-2" /></td>
                <td><div className="flex max-w-xs flex-wrap gap-1">{definitionOptions.slice(0, 5).map((option) => <button key={option.id} onClick={() => void removeOption(option)} title="Silmək üçün klikləyin" className="rounded-full bg-secondary px-2 py-1 text-[10px]">{option.label_az} ×</button>)}<button onClick={() => void addOption(definition)} className="rounded-full border px-2 py-1 text-[10px] font-bold">+ seçim</button></div></td>
                <td><button onClick={() => void unbind(binding)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button></td>
              </tr>;
            })}
            {!selectedBindings.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Bu kateqoriyaya hələ atribut bağlanmayıb.</td></tr>}
          </tbody>
        </table>
      </div>

      {creating && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-3">
        <form onSubmit={createDefinition} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black">Yeni məhsul atributu</h3><button type="button" onClick={() => setCreating(false)}><X /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Azərbaycan dilində ad *"><input required value={form.name_az} onChange={(event) => setForm({ ...form, name_az: event.target.value, code: form.code || slugCode(event.target.value) })} /></Field>
            <Field label="Texniki kod *"><input required value={form.code} onChange={(event) => setForm({ ...form, code: slugCode(event.target.value) })} /></Field>
            <Field label="Rus dilində ad"><input value={form.name_ru} onChange={(event) => setForm({ ...form, name_ru: event.target.value })} /></Field>
            <Field label="İngilis dilində ad"><input value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} /></Field>
            <Field label="Məlumat tipi"><select value={form.data_type} onChange={(event) => setForm({ ...form, data_type: event.target.value })}><option value="text">Mətn</option><option value="number">Rəqəm</option><option value="select">Siyahı</option><option value="multiselect">Çoxseçimli</option><option value="boolean">Bəli/Xeyr</option><option value="date">Tarix</option><option value="color">Rəng</option></select></Field>
            <Field label="Ölçü vahidi"><input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="GB, sm, ml..." /></Field>
            <Field label="Nümunə / placeholder"><input value={form.placeholder} onChange={(event) => setForm({ ...form, placeholder: event.target.value })} /></Field>
            <Field label="Seçimlər (vergüllə)"><input value={form.options} onChange={(event) => setForm({ ...form, options: event.target.value })} placeholder="Qara, Ağ, Mavi" /></Field>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="rounded-xl border px-4 py-2.5 font-bold">Ləğv et</button><button disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saxlanılır..." : "Yarat"}</button></div>
        </form>
      </div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return <label className="space-y-1.5 text-sm font-bold"><span>{label}</span><span className="block [&>input]:h-11 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-background [&>input]:px-3 [&>input]:font-normal [&>select]:h-11 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-background [&>select]:px-3 [&>select]:font-normal">{children}</span></label>;
}
