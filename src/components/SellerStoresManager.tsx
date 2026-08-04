import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Edit3, MapPin, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CitySelect } from "@/components/CitySelect";

export type SellerShop = {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  is_primary: boolean;
  created_at: string;
};

type ShopDraft = {
  name: string;
  city: string;
  address: string;
  description: string;
  email: string;
};

const emptyDraft: ShopDraft = { name: "", city: "", address: "", description: "", email: "" };

export function SellerStoresManager({ sellerId, onChanged }: { sellerId: string; onChanged?: (shops: SellerShop[]) => void }) {
  const [shops, setShops] = useState<SellerShop[]>([]);
  const [draft, setDraft] = useState<ShopDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shops")
      .select("id,seller_id,name,description,city,address,email,logo_url,banner_url,is_active,is_primary,created_at")
      .eq("seller_id", sellerId)
      .order("is_primary", { ascending: false })
      .order("created_at");
    setLoading(false);
    if (error) {
      toast.error("Mağazalar yüklənmədi: " + error.message);
      return;
    }
    const rows = (data ?? []) as SellerShop[];
    setShops(rows);
    onChanged?.(rows);
  }, [onChanged, sellerId]);

  useEffect(() => { void load(); }, [load]);

  const reset = () => { setDraft(emptyDraft); setEditingId(null); };

  const save = async () => {
    if (draft.name.trim().length < 2) return toast.error("Mağaza adını daxil edin");
    if (!draft.city) return toast.error("Mağazanın şəhərini seçin");
    setSaving(true);
    const payload = {
      name: draft.name.trim(), city: draft.city, address: draft.address.trim() || null,
      description: draft.description.trim() || null, email: draft.email.trim() || null,
    };
    const result = editingId
      ? await (supabase as any).from("shops").update(payload).eq("id", editingId).eq("seller_id", sellerId)
      : await (supabase as any).rpc("create_my_shop", {
          _name: payload.name, _city: payload.city, _address: payload.address,
          _description: payload.description, _email: payload.email,
        });
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(editingId ? "Mağaza yeniləndi" : "Yeni mağaza yaradıldı");
    reset();
    await load();
  };

  const edit = (shop: SellerShop) => {
    setEditingId(shop.id);
    setDraft({
      name: shop.name, city: shop.city ?? "", address: shop.address ?? "",
      description: shop.description ?? "", email: shop.email ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const makePrimary = async (shopId: string) => {
    const { error } = await (supabase as any).rpc("set_my_primary_shop", { _shop_id: shopId });
    if (error) return toast.error(error.message);
    toast.success("Əsas mağaza dəyişdirildi");
    await load();
  };

  const remove = async (shop: SellerShop) => {
    if (!window.confirm(`"${shop.name}" mağazası silinsin?`)) return;
    const { error } = await (supabase as any).rpc("delete_my_shop", { _shop_id: shop.id });
    if (error) return toast.error(error.message);
    toast.success("Mağaza silindi");
    await load();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black"><Store className="h-6 w-6 text-primary" /> Mağazalarım</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bir hesabla bir neçə mağaza yaradın. Hər mağazanın şəhəri, ünvanı və məhsulları ayrıca göstərilir.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-extrabold">{editingId ? "Mağazanı redaktə et" : "Yeni mağaza yarat"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Mağaza adı *<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={160} className="mt-1 h-11 w-full rounded-lg border bg-background px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Şəhər *<CitySelect value={draft.city} onChange={(city) => setDraft({ ...draft, city })} className="mt-1 h-11 w-full font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Tam ünvan<input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} maxLength={300} placeholder="Küçə, bina, mərtəbə və ya filial" className="mt-1 h-11 w-full rounded-lg border bg-background px-3 font-normal" /></label>
          <label className="text-sm font-semibold">E-poçt<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Təsvir<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={1000} className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3 font-normal" /></label>
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> {saving ? "Yadda saxlanılır..." : editingId ? "Dəyişiklikləri saxla" : "Mağaza yarat"}</button>
          {editingId && <button onClick={reset} className="rounded-xl border px-5 py-3 text-sm font-bold">Ləğv et</button>}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full py-10 text-center text-muted-foreground">Mağazalar yüklənir...</div> : shops.map((shop) => (
          <article key={shop.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5">{shop.banner_url && <img src={shop.banner_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-black">{shop.name}</h3><div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {shop.city || "Şəhər qeyd edilməyib"}</div></div>
                {shop.is_primary && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Əsas</span>}
              </div>
              {shop.address && <p className="mt-2 text-xs text-muted-foreground">{shop.address}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => edit(shop)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Edit3 className="h-3.5 w-3.5" /> Redaktə</button>
                {!shop.is_primary && <button onClick={() => void makePrimary(shop.id)} className="rounded-lg border px-3 py-2 text-xs font-bold">Əsas et</button>}
                {!shop.is_primary && <button onClick={() => void remove(shop)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive"><Trash2 className="h-3.5 w-3.5" /> Sil</button>}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
