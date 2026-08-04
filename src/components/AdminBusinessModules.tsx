import { useEffect, useMemo, useState } from "react";
import { Blocks, Edit3, Loader2, Plus, Power, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessModuleIcon, type BusinessModule } from "@/lib/businessModules";

type ModuleForm = Omit<BusinessModule, "config">;

const emptyForm: ModuleForm = {
  code: "",
  name_az: "",
  name_en: "",
  name_ru: "",
  description_az: "",
  description_en: "",
  description_ru: "",
  icon_key: "blocks",
  sort_order: 0,
  is_active: true,
};

function normalizeCode(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function AdminBusinessModules() {
  const [modules, setModules] = useState<BusinessModule[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleForm>(emptyForm);

  const activeCount = useMemo(
    () => modules.filter((module) => module.is_active).length,
    [modules],
  );

  const load = async () => {
    setLoading(true);
    const [moduleResult, selectionResult] = await Promise.all([
      (supabase as any)
        .from("business_modules")
        .select("*")
        .order("sort_order", { ascending: true }),
      (supabase as any).from("seller_business_modules").select("module_code"),
    ]);
    setLoading(false);

    if (moduleResult.error) {
      toast.error(`Modullar yüklənmədi: ${moduleResult.error.message}`);
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of selectionResult.data ?? []) {
      const code = (row as { module_code: string }).module_code;
      counts[code] = (counts[code] ?? 0) + 1;
    }
    setUsage(counts);
    setModules((moduleResult.data ?? []) as BusinessModule[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const startNew = () => {
    setEditingCode(null);
    setForm({
      ...emptyForm,
      sort_order: modules.length ? Math.max(...modules.map((item) => item.sort_order)) + 10 : 10,
    });
    setFormOpen(true);
  };

  const startEdit = (module: BusinessModule) => {
    setEditingCode(module.code);
    setForm({
      code: module.code,
      name_az: module.name_az,
      name_en: module.name_en,
      name_ru: module.name_ru,
      description_az: module.description_az ?? "",
      description_en: module.description_en ?? "",
      description_ru: module.description_ru ?? "",
      icon_key: module.icon_key,
      sort_order: module.sort_order,
      is_active: module.is_active,
    });
    setFormOpen(true);
  };

  const save = async () => {
    const code = editingCode ?? normalizeCode(form.code || form.name_en || form.name_az);
    if (!code || !form.name_az.trim() || !form.name_en.trim() || !form.name_ru.trim()) {
      toast.error("Kod və hər üç dildə modul adı məcburidir");
      return;
    }

    setSaving(true);
    const payload = {
      code,
      name_az: form.name_az.trim(),
      name_en: form.name_en.trim(),
      name_ru: form.name_ru.trim(),
      description_az: form.description_az?.trim() || null,
      description_en: form.description_en?.trim() || null,
      description_ru: form.description_ru?.trim() || null,
      icon_key: form.icon_key.trim() || "blocks",
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const query = editingCode
      ? (supabase as any).from("business_modules").update(payload).eq("code", editingCode)
      : (supabase as any).from("business_modules").insert(payload);
    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingCode ? "Modul yeniləndi" : "Yeni modul yaradıldı");
    setFormOpen(false);
    await load();
  };

  const toggle = async (module: BusinessModule) => {
    const { error } = await (supabase as any)
      .from("business_modules")
      .update({ is_active: !module.is_active })
      .eq("code", module.code);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(module.is_active ? "Modul deaktiv edildi" : "Modul aktiv edildi");
    await load();
  };

  const remove = async (module: BusinessModule) => {
    if ((usage[module.code] ?? 0) > 0) {
      toast.error("Bu modul satıcılar tərəfindən seçilib. Silmək əvəzinə deaktiv edin.");
      return;
    }
    if (!window.confirm(`"${module.name_az}" modulunu silmək istəyirsiniz?`)) return;
    const { error } = await (supabase as any)
      .from("business_modules")
      .delete()
      .eq("code", module.code);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Modul silindi");
    await load();
  };

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Ümumi modul" value={modules.length} icon={Blocks} />
        <Summary label="Aktiv modul" value={activeCount} icon={Power} />
        <Summary
          label="Satıcı seçimləri"
          value={Object.values(usage).reduce((sum, count) => sum + count, 0)}
          icon={Users}
        />
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black">Biznes modul kataloqu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Yeni biznes istiqamətləri kod dəyişikliyi olmadan bu kataloqdan əlavə edilir.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Yeni modul
        </button>
      </div>

      {formOpen && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-black">
              {editingCode ? "Modulu redaktə et" : "Yeni modul yarat"}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            >
              Bağla
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Sistem kodu"
              value={form.code}
              disabled={Boolean(editingCode)}
              placeholder="məsələn: pharmacy"
              onChange={(value) => setForm({ ...form, code: normalizeCode(value) })}
            />
            <Field label="Ad (AZ)" value={form.name_az} onChange={(value) => setForm({ ...form, name_az: value })} />
            <Field label="Ad (EN)" value={form.name_en} onChange={(value) => setForm({ ...form, name_en: value })} />
            <Field label="Ad (RU)" value={form.name_ru} onChange={(value) => setForm({ ...form, name_ru: value })} />
            <Field label="İkon açarı" value={form.icon_key} placeholder="blocks" onChange={(value) => setForm({ ...form, icon_key: value })} />
            <Field label="Sıralama" type="number" value={String(form.sort_order)} onChange={(value) => setForm({ ...form, sort_order: Number(value) })} />
            <TextField label="Təsvir (AZ)" value={form.description_az ?? ""} onChange={(value) => setForm({ ...form, description_az: value })} />
            <TextField label="Təsvir (EN)" value={form.description_en ?? ""} onChange={(value) => setForm({ ...form, description_en: value })} />
            <TextField label="Təsvir (RU)" value={form.description_ru ?? ""} onChange={(value) => setForm({ ...form, description_ru: value })} />
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Qeydiyyatda aktiv göstərilsin
          </label>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Yadda saxla
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = getBusinessModuleIcon(module.icon_key);
          return (
            <article key={module.code} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={
                    module.is_active
                      ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
                  }
                >
                  {module.is_active ? "Aktiv" : "Deaktiv"}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black">{module.name_az}</h3>
              <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">
                {module.description_az}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
                <code>{module.code}</code>
                <span className="font-bold">{usage[module.code] ?? 0} satıcı</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Action icon={Edit3} label="Redaktə" onClick={() => startEdit(module)} />
                <Action
                  icon={Power}
                  label={module.is_active ? "Söndür" : "Aktiv et"}
                  onClick={() => void toggle(module)}
                />
                <Action
                  icon={Trash2}
                  label="Sil"
                  danger
                  onClick={() => void remove(module)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Blocks;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border bg-background px-3 outline-none transition focus:border-primary disabled:bg-muted"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 text-sm font-semibold">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl border bg-background px-3 py-2 outline-none transition focus:border-primary"
      />
    </label>
  );
}

function Action({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Edit3;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? "flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-2 py-2 text-xs font-bold text-destructive"
          : "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-bold hover:bg-muted"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
