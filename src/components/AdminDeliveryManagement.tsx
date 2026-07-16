import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

interface Company {
  id: string;
  name: string;
  code: string;
  contact_phone: string | null;
  is_active: boolean;
  sort_order: number;
}
interface SellerProfile {
  id: string;
  full_name: string | null;
  shop_name: string | null;
}
interface Delivery {
  id: string;
  order_id: string;
  seller_id: string;
  status: string;
  confirmation_status: string;
  created_at: string;
  courier_name: string | null;
  courier_phone: string | null;
  tracking_number: string | null;
  note: string | null;
  confirmation_deadline: string | null;
  external_courier_companies?: { name: string } | null;
  seller?: { full_name: string | null; shop_name: string | null } | null;
}

const statuses = [
  "handed_to_courier",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "returned",
  "disputed",
];
const labels: Record<string, string> = {
  handed_to_courier: "Kuryerə təhvil",
  in_transit: "Çatdırılır",
  delivered: "Müştəriyə təhvil",
  completed: "Tamamlandı",
  cancelled: "Ləğv",
  returned: "Geri qaytarıldı",
  disputed: "Mübahisə",
};

export function AdminDeliveryManagement() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [{ data: c }, { data: d }] = await Promise.all([
      db.from("external_courier_companies").select("*").order("sort_order"),
      db
        .from("deliveries")
        .select(
          "id,order_id,seller_id,status,confirmation_status,created_at,courier_name,courier_phone,tracking_number,note,confirmation_deadline,external_courier_companies(name)",
        )
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    const deliveryRows = (d ?? []) as Delivery[];
    const sellerIds = [...new Set(deliveryRows.map((row) => row.seller_id))];
    const { data: profiles } = sellerIds.length
      ? await db.from("profiles").select("id,full_name,shop_name").in("id", sellerIds)
      : { data: [] };
    const sellerMap = new Map<string, SellerProfile>(
      ((profiles ?? []) as SellerProfile[]).map((profile) => [profile.id, profile]),
    );
    setCompanies((c ?? []) as Company[]);
    setDeliveries(
      deliveryRows.map((row) => ({ ...row, seller: sellerMap.get(row.seller_id) ?? null })),
    );
  }, [db]);
  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-deliveries-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const add = async () => {
    const name = prompt("Kuryer şirkətinin adı:");
    if (!name) return;
    const code =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || `courier_${Date.now()}`;
    const phone = prompt("Əlaqə telefonu (opsional):") || null;
    const { error } = await db
      .from("external_courier_companies")
      .insert({ name, code, contact_phone: phone, sort_order: companies.length * 10 + 10 });
    if (error) toast.error(error.message);
    else {
      toast.success("Əlavə edildi");
      await load();
    }
  };
  const edit = async (c: Company) => {
    const name = prompt("Ad:", c.name);
    if (!name) return;
    const phone = prompt("Telefon:", c.contact_phone ?? "") || null;
    const { error } = await db
      .from("external_courier_companies")
      .update({ name, contact_phone: phone })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else await load();
  };
  const remove = async (c: Company) => {
    if (!confirm(`${c.name} silinsin? Tarixi çatdırılmalarda şirkət sahəsi boş qalacaq.`)) return;
    const { error } = await db.from("external_courier_companies").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else await load();
  };
  const toggle = async (c: Company) => {
    await db.from("external_courier_companies").update({ is_active: !c.is_active }).eq("id", c.id);
    await load();
  };
  const changeStatus = async (d: Delivery, status: string) => {
    const note = prompt("Admin qeydi (opsional):") ?? "";
    setBusy(true);
    const { error } = await db.rpc("admin_manage_delivery", {
      _delivery_id: d.id,
      _status: status,
      _note: note || null,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Status dəyişdirildi");
      await load();
    }
  };
  const rows = filter ? deliveries.filter((d) => d.status === filter) : deliveries;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex justify-between gap-3 mb-3">
          <div>
            <h2 className="font-black">Kənar kuryer şirkətləri</h2>
            <p className="text-xs text-muted-foreground">Wolt, Bolt, Uber və digər partnyorlar</p>
          </div>
          <button
            onClick={() => void add()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold inline-flex gap-1"
          >
            <Plus className="h-4 w-4" /> Əlavə et
          </button>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {companies.map((c) => (
            <div key={c.id} className="rounded-xl border p-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <b>{c.name}</b>
                <div className="text-xs text-muted-foreground">{c.contact_phone ?? c.code}</div>
              </div>
              <button
                onClick={() => void toggle(c)}
                className={`text-xs px-2 py-1 rounded ${c.is_active ? "bg-success/10 text-success" : "bg-muted"}`}
              >
                {c.is_active ? "Aktiv" : "Passiv"}
              </button>
              <button onClick={() => void edit(c)}>
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={() => void remove(c)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-4 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-black">Bütün çatdırılmalar</h2>
            <p className="text-xs text-muted-foreground">{rows.length} nəticə</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3"
            >
              <option value="">Bütün statuslar</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
            <button onClick={() => void load()} className="p-2 border rounded-lg">
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                {[
                  "Sifariş",
                  "Satıcı",
                  "Kuryer",
                  "Tracking / əlaqə",
                  "Tarix / müddət",
                  "Status",
                  "İdarəetmə",
                ].map((h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    Çatdırılma yoxdur
                  </td>
                </tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id} className="border-t align-top">
                    <td className="p-3 font-mono">#{d.order_id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-3">{d.seller?.shop_name ?? d.seller?.full_name ?? "—"}</td>
                    <td className="p-3">
                      <b>{d.external_courier_companies?.name ?? "Digər"}</b>
                      <div className="text-xs">{d.courier_name ?? "—"}</div>
                    </td>
                    <td className="p-3">
                      <div>{d.tracking_number ?? "—"}</div>
                      <div className="text-xs">{d.courier_phone ?? ""}</div>
                    </td>
                    <td className="p-3 text-xs">
                      {formatDateTime(d.created_at)}
                      {d.confirmation_deadline && (
                        <div className="mt-1">
                          Təsdiq: {formatDateTime(d.confirmation_deadline)}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <b>{labels[d.status] ?? d.status}</b>
                      <div className="text-xs text-muted-foreground">{d.confirmation_status}</div>
                    </td>
                    <td className="p-3">
                      <select
                        disabled={busy}
                        value={d.status}
                        onChange={(e) => void changeStatus(d, e.target.value)}
                        className="h-9 rounded-lg border bg-background px-2"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {labels[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
