import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { MapPin, Plus, Trash2, Star, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { CitySelect } from "@/components/CitySelect";
import { findCity } from "@/lib/azCities";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Ünvanlarım — EG Shop" }] }),
  component: AddressesPage,
});

interface Address {
  id: string; title: string; recipient_name: string; phone: string;
  city: string; street: string; apartment: string | null; notes: string | null; is_default: boolean;
}

function AddressesPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [list, setList] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = () => {
    if (!user) return;
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false })
      .then(({ data }) => setList((data ?? []) as Address[]));
  };
  useEffect(load, [user]);

  const save = async () => {
    if (!user || !editing) return;
    const cityCoord = findCity(editing.city);
    const payload = {
      user_id: user.id,
      title: (editing.title || "Ev").slice(0, 50),
      recipient_name: (editing.recipient_name || "").trim().slice(0, 100),
      phone: (editing.phone || "").trim().slice(0, 30),
      city: (editing.city || "").trim().slice(0, 100),
      street: (editing.street || "").trim().slice(0, 200),
      apartment: editing.apartment?.slice(0, 50) || null,
      notes: editing.notes?.slice(0, 300) || null,
      is_default: editing.is_default ?? false,
      lat: cityCoord?.lat ?? null,
      lng: cityCoord?.lng ?? null,
    };
    if (!payload.recipient_name || !payload.phone || !payload.city || !payload.street) {
      toast.error("Bütün məcburi sahələri doldurun"); return;
    }
    if (payload.is_default) {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }
    const { error } = editing.id
      ? await supabase.from("addresses").update(payload).eq("id", editing.id)
      : await supabase.from("addresses").insert(payload);
    if (error) toast.error("Yadda saxlanılmadı"); else { toast.success("Yadda saxlanıldı"); setEditing(null); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Silmək istəyirsiniz?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) toast.error("Silinmədi"); else { toast.success("Silindi"); load(); }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  };

  if (!user) return null;

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user.email ?? undefined} items={items}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> {t("addresses.title")}</h1>
          <button onClick={() => setEditing({ title: "Ev", is_default: list.length === 0 })}
                  className="bg-primary text-primary-foreground px-4 h-10 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> {t("addresses.addNew")}
          </button>
        </div>

        {list.length === 0 && !editing ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">{t("addresses.noAddresses")}</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold flex items-center gap-2">{a.title}{a.is_default && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">DEFAULT</span>}</div>
                  <div className="flex gap-1">
                    {!a.is_default && <button onClick={() => setDefault(a.id)} title="Default et" className="p-1.5 hover:bg-secondary rounded"><Star className="h-4 w-4" /></button>}
                    <button onClick={() => setEditing(a)} className="p-1.5 hover:bg-secondary rounded"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => remove(a.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="text-sm mt-2 space-y-0.5">
                  <div className="font-semibold">{a.recipient_name} · {a.phone}</div>
                  <div className="text-muted-foreground">{a.city}, {a.street}{a.apartment ? `, m. ${a.apartment}` : ""}</div>
                  {a.notes && <div className="text-xs text-muted-foreground italic">"{a.notes}"</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">{editing.id ? "Redaktə et" : "Yeni ünvan"}</h2>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Başlıq (Ev, İş)" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="col-span-2 h-10 px-3 rounded-lg border border-input bg-background" />
                <input placeholder="Alıcı ad soyad *" value={editing.recipient_name ?? ""} onChange={(e) => setEditing({ ...editing, recipient_name: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background" />
                <input placeholder="Telefon *" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background" />
                <CitySelect value={editing.city ?? ""} onChange={(v) => setEditing({ ...editing, city: v })} includeEmpty placeholder="Şəhər *" className="w-full" />
                <input placeholder="Mənzil/ofis" value={editing.apartment ?? ""} onChange={(e) => setEditing({ ...editing, apartment: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background" />
                <input placeholder="Küçə, ev *" value={editing.street ?? ""} onChange={(e) => setEditing({ ...editing, street: e.target.value })} className="col-span-2 h-10 px-3 rounded-lg border border-input bg-background" />
                <textarea placeholder="Qeyd (giriş kodu, mərtəbə və s.)" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="col-span-2 h-20 px-3 py-2 rounded-lg border border-input bg-background resize-none" />
                <label className="col-span-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.is_default ?? false} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> Default ünvan
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={save} className="flex-1 bg-primary text-primary-foreground h-10 rounded-lg font-bold hover:bg-primary/90">Yadda saxla</button>
                <button onClick={() => setEditing(null)} className="px-4 h-10 rounded-lg border border-border hover:bg-secondary">Ləğv et</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
