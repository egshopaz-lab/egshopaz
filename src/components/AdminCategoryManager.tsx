import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/CategoryIcon";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  background_color: string | null;
  is_featured: boolean;
  popularity_score: number;
};

const initial = {
  name: "",
  slug: "",
  icon: "",
  parent_id: "",
  sort_order: 0,
  image_url: "",
  background_color: "#f3e8ff",
  is_featured: false,
  popularity_score: 0,
};

export function AdminCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select(
        "id,name,slug,icon,parent_id,sort_order,image_url,background_color,is_featured,popularity_score",
      )
      .order("sort_order");
    if (error) toast.error(`Kateqoriyalar yüklənmədi: ${error.message}`);
    setCategories((data ?? []) as Category[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.slug.toLowerCase().includes(query.toLowerCase()),
      ),
    [categories, query],
  );
  const roots = categories.filter((c) => !c.parent_id);

  const edit = (c: Category) => {
    setEditing(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      icon: c.icon ?? "",
      parent_id: c.parent_id ?? "",
      sort_order: c.sort_order,
      image_url: c.image_url ?? "",
      background_color: c.background_color ?? "#f3e8ff",
      is_featured: c.is_featured,
      popularity_score: c.popularity_score,
    });
    setOpen(true);
  };
  const create = () => {
    setEditing(null);
    setForm({ ...initial });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      icon: form.icon.trim() || null,
      parent_id: form.parent_id || null,
      image_url: form.image_url.trim() || null,
      background_color: form.background_color || null,
    };
    const result = editing
      ? await supabase.from("categories").update(payload).eq("id", editing)
      : await supabase.from("categories").insert(payload);
    if (result.error) return toast.error(result.error.message);
    toast.success(editing ? "Kateqoriya yeniləndi" : "Kateqoriya yaradıldı");
    setOpen(false);
    void load();
  };
  const remove = async (c: Category) => {
    if (
      !window.confirm(
        `“${c.name}” kateqoriyası silinsin? Alt kateqoriyalar varsa əməliyyat bloklana bilər.`,
      )
    )
      return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setCategories((all) => all.filter((x) => x.id !== c.id));
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Vizual kateqoriyalar</h2>
          <p className="text-sm text-muted-foreground">
            Şəkil, rəng, populyarlıq və iyerarxiyanı idarə edin.
          </p>
        </div>
        <button
          onClick={create}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Yeni kateqoriya
        </button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kateqoriya axtar..."
          className="h-11 w-full rounded-xl border bg-card pl-10 pr-3"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => (
          <article key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl"
              style={{ backgroundColor: c.background_color || "#f3e8ff" }}
            >
              {c.image_url ? (
                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <CategoryIcon category={c} className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <b className="truncate">{c.name}</b>
                {c.is_featured && <Star className="h-4 w-4 fill-amber-400 text-amber-500" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                /{c.slug} · bal {c.popularity_score}
              </p>
            </div>
            <button
              onClick={() => edit(c)}
              className="rounded-lg p-2 hover:bg-secondary"
              aria-label="Redaktə"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => remove(c)}
              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
              aria-label="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </article>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-0 sm:p-4">
          <form
            onSubmit={save}
            className="h-[100dvh] w-full overflow-y-auto bg-card p-5 sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 mb-5 flex items-center justify-between border-b bg-card py-3">
              <h3 className="text-xl font-black">
                {editing ? "Kateqoriyanı redaktə et" : "Yeni kateqoriya"}
              </h3>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Ad *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Input>
              <Input label="Slug *">
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Input>
              <Input label="Şəkil URL-i">
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </Input>
              <Input label="Fon rəngi">
                <input
                  type="color"
                  value={form.background_color}
                  onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                />
              </Input>
              <Input label="İkon açarı">
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
              </Input>
              <Input label="Üst kateqoriya">
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                >
                  <option value="">Əsas kateqoriya</option>
                  {roots
                    .filter((r) => r.id !== editing)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Input>
              <Input label="Sıralama">
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </Input>
              <Input label="Populyarlıq balı">
                <input
                  type="number"
                  min="0"
                  value={form.popularity_score}
                  onChange={(e) => setForm({ ...form, popularity_score: Number(e.target.value) })}
                />
              </Input>
            </div>
            <label className="mt-4 flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              />{" "}
              Populyar kateqoriyalarda göstər
            </label>
            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2.5 font-bold"
              >
                Ləğv et
              </button>
              <button className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground">
                Yadda saxla
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Input({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="space-y-1.5 text-sm font-bold">
      <span>{label}</span>
      <span className="block [&>input]:h-11 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-background [&>input]:px-3 [&>input]:font-normal [&>select]:h-11 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-background [&>select]:px-3 [&>select]:font-normal">
        {children}
      </span>
    </label>
  );
}
