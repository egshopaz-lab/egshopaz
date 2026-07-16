import { useEffect, useMemo, useState } from "react";
import { BarChart3, Edit3, Eye, MousePointerClick, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Banner = {
  id: string;
  title: string;
  image_url: string | null;
  mobile_image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  position: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  alt_text: string | null;
  ad_label: string | null;
  impressions: number;
  clicks: number;
};

type BannerForm = Omit<Banner, "id" | "impressions" | "clicks">;

const emptyForm: BannerForm = {
  title: "",
  image_url: "",
  mobile_image_url: "",
  video_url: "",
  link_url: "",
  position: "home_top",
  is_active: true,
  starts_at: "",
  ends_at: "",
  priority: 0,
  alt_text: "",
  ad_label: "Reklam",
};

const toLocalInput = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export function AdminBannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(`Bannerlər yüklənmədi: ${error.message}`);
    setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(
    () => ({
      impressions: banners.reduce((sum, item) => sum + Number(item.impressions || 0), 0),
      clicks: banners.reduce((sum, item) => sum + Number(item.clicks || 0), 0),
    }),
    [banners],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      image_url: banner.image_url ?? "",
      mobile_image_url: banner.mobile_image_url ?? "",
      video_url: banner.video_url ?? "",
      link_url: banner.link_url ?? "",
      position: banner.position,
      is_active: banner.is_active,
      starts_at: toLocalInput(banner.starts_at),
      ends_at: toLocalInput(banner.ends_at),
      priority: Number(banner.priority || 0),
      alt_text: banner.alt_text ?? "",
      ad_label: banner.ad_label ?? "Reklam",
    });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || (!form.image_url?.trim() && !form.video_url?.trim())) {
      toast.error("Başlıq və desktop şəkli (və ya video) tələb olunur.");
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.starts_at) >= new Date(form.ends_at)) {
      toast.error("Bitmə tarixi başlama tarixindən sonra olmalıdır.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      image_url: form.image_url?.trim() || null,
      mobile_image_url: form.mobile_image_url?.trim() || null,
      video_url: form.video_url?.trim() || null,
      link_url: form.link_url?.trim() || null,
      alt_text: form.alt_text?.trim() || form.title.trim(),
      ad_label: form.ad_label?.trim() || "Reklam",
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      priority: Number(form.priority) || 0,
    };
    const query = editingId
      ? supabase.from("banners").update(payload).eq("id", editingId)
      : supabase.from("banners").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Banner yeniləndi" : "Banner yaradıldı");
    setFormOpen(false);
    void load();
  };

  const toggle = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);
    if (error) return toast.error(error.message);
    setBanners((current) =>
      current.map((item) =>
        item.id === banner.id ? { ...item, is_active: !item.is_active } : item,
      ),
    );
  };

  const remove = async (banner: Banner) => {
    if (!window.confirm(`“${banner.title}” banneri silinsin?`)) return;
    const { error } = await supabase.from("banners").delete().eq("id", banner.id);
    if (error) return toast.error(error.message);
    setBanners((current) => current.filter((item) => item.id !== banner.id));
    toast.success("Banner silindi");
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Ana səhifə bannerləri</h2>
          <p className="text-sm text-muted-foreground">
            Desktop, mobil, tarix və statistikanı bir yerdən idarə edin.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Yeni banner
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Eye} label="Ümumi baxış" value={totals.impressions} />
        <Stat icon={MousePointerClick} label="Ümumi klik" value={totals.clicks} />
        <Stat
          icon={BarChart3}
          label="Orta CTR"
          value={`${totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00"}%`}
        />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Hələ banner yoxdur.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {banners.map((banner) => {
            const ctr = banner.impressions ? (banner.clicks / banner.impressions) * 100 : 0;
            return (
              <article
                key={banner.id}
                className="overflow-hidden rounded-2xl border bg-card shadow-sm"
              >
                <div className="relative aspect-[3/1] bg-secondary">
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.alt_text || banner.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">
                      Video banner
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${banner.is_active ? "bg-emerald-600 text-white" : "bg-slate-900/75 text-white"}`}
                  >
                    {banner.is_active ? "Aktiv" : "Passiv"}
                  </span>
                  {banner.ad_label && (
                    <span className="absolute right-3 top-3 rounded bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                      {banner.ad_label}
                    </span>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold">{banner.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Prioritet: {banner.priority} · {banner.position}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(banner)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${banner.is_active ? "bg-emerald-50 text-emerald-700" : "bg-secondary"}`}
                    >
                      {banner.is_active ? "Söndür" : "Aktiv et"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/50 p-3 text-center text-xs">
                    <div>
                      <b className="block text-base">{banner.impressions}</b>Baxış
                    </div>
                    <div>
                      <b className="block text-base">{banner.clicks}</b>Klik
                    </div>
                    <div>
                      <b className="block text-base">{ctr.toFixed(2)}%</b>CTR
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(banner)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold"
                    >
                      <Edit3 className="h-4 w-4" /> Redaktə
                    </button>
                    <button
                      onClick={() => remove(banner)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
                    >
                      <Trash2 className="h-4 w-4" /> Sil
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={save}
            className="h-[100dvh] w-full overflow-y-auto bg-card p-5 sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 mb-5 flex items-center justify-between border-b bg-card py-3">
              <h3 className="text-xl font-black">
                {editingId ? "Banneri redaktə et" : "Yeni banner"}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Bağla">
                <X />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Başlıq *">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Reklam etiketi">
                <input
                  value={form.ad_label ?? ""}
                  onChange={(e) => setForm({ ...form, ad_label: e.target.value })}
                />
              </Field>
              <Field label="Desktop şəkil URL-i *">
                <input
                  type="url"
                  value={form.image_url ?? ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </Field>
              <Field label="Mobil şəkil URL-i">
                <input
                  type="url"
                  value={form.mobile_image_url ?? ""}
                  onChange={(e) => setForm({ ...form, mobile_image_url: e.target.value })}
                />
              </Field>
              <Field label="Video URL-i">
                <input
                  type="url"
                  value={form.video_url ?? ""}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                />
              </Field>
              <Field label="Keçid linki">
                <input
                  value={form.link_url ?? ""}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="/catalog?cat=... və ya https://..."
                />
              </Field>
              <Field label="Başlama tarixi">
                <input
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </Field>
              <Field label="Bitmə tarixi">
                <input
                  type="datetime-local"
                  value={form.ends_at ?? ""}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </Field>
              <Field label="Prioritet">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                />
              </Field>
              <Field label="Şəkil təsviri (SEO)">
                <input
                  value={form.alt_text ?? ""}
                  onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
                />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />{" "}
              Aktiv banner
            </label>
            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border px-4 py-2.5 font-bold"
              >
                Ləğv et
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saxlanılır..." : "Yadda saxla"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
      <span className="rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <b className="block text-xl">{value}</b>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="space-y-1.5 text-sm font-bold">
      <span>{label}</span>
      <span className="block [&>input]:h-11 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-background [&>input]:px-3 [&>input]:font-normal">
        {children}
      </span>
    </label>
  );
}
