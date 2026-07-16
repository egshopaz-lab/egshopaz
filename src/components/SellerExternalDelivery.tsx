import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}
interface Delivery {
  id: string;
  status: string;
  courier_name: string | null;
  courier_phone: string | null;
  tracking_number: string | null;
  note: string | null;
  confirmation_status: string;
  confirmation_deadline: string | null;
  external_courier_company_id: string | null;
  external_courier_companies?: { name: string } | null;
}

const statusLabel: Record<string, string> = {
  handed_to_courier: "Kuryerə təhvil verildi",
  in_transit: "Çatdırılır",
  delivered: "Müştəriyə təhvil verildi",
  completed: "Tamamlandı",
  disputed: "Mübahisədə",
  cancelled: "Ləğv edildi",
  returned: "Geri qaytarıldı",
};

export function SellerExternalDelivery({
  orderItemId,
  itemStatus,
  onChanged,
}: {
  orderItemId: string;
  itemStatus: string;
  onChanged: () => void;
}) {
  // Generated database types are refreshed after the migration is deployed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [{ data: companyRows }, { data: deliveryRow }] = await Promise.all([
      db
        .from("external_courier_companies")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order"),
      db
        .from("deliveries")
        .select(
          "id,status,courier_name,courier_phone,tracking_number,note,confirmation_status,confirmation_deadline,external_courier_company_id,external_courier_companies(name)",
        )
        .eq("order_item_id", orderItemId)
        .maybeSingle(),
    ]);
    setCompanies((companyRows ?? []) as Company[]);
    const row = (deliveryRow ?? null) as Delivery | null;
    setDelivery(row);
    if (row) {
      setCompanyId(row.external_courier_company_id ?? "");
      setCourierName(row.courier_name ?? "");
      setCourierPhone(row.courier_phone ?? "");
      setTracking(row.tracking_number ?? "");
      setNote(row.note ?? "");
    }
  }, [db, orderItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handoff = async () => {
    setBusy(true);
    const { error } = await db.rpc("seller_handoff_external_delivery", {
      _order_item_id: orderItemId,
      _company_id: companyId || null,
      _courier_name: courierName || null,
      _courier_phone: courierPhone || null,
      _tracking_number: tracking || null,
      _note: note || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sifariş kənar kuryerə təhvil verildi");
    setOpen(false);
    await load();
    onChanged();
  };

  const advance = async (status: "in_transit" | "delivered") => {
    if (
      status === "delivered" &&
      !confirm("Kuryer məhsulu müştəriyə təhvil verib? Bundan sonra müştəridən təsdiq istənəcək.")
    )
      return;
    setBusy(true);
    const { error } = await db.rpc("seller_update_external_delivery_status", {
      _delivery_id: delivery?.id,
      _status: status,
      _note: null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      status === "delivered" ? "Müştəriyə təsdiq bildirişi göndərildi" : "Status Çatdırılır oldu",
    );
    await load();
    onChanged();
  };

  if (!delivery && !["pending", "paid", "preparing", "packed", "shipped"].includes(itemStatus))
    return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      {delivery ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Kənar çatdırılma</div>
              <div className="font-bold text-sm">
                {statusLabel[delivery.status] ?? delivery.status}
              </div>
            </div>
            <div className="text-xs text-right">
              <b>{delivery.external_courier_companies?.name ?? "Kuryer"}</b>
              {delivery.tracking_number && <div>Tracking: {delivery.tracking_number}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {delivery.status === "handed_to_courier" && (
              <button
                disabled={busy}
                onClick={() => void advance("in_transit")}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex gap-1"
              >
                <Bike className="h-4 w-4" /> Çatdırılır
              </button>
            )}
            {["handed_to_courier", "in_transit"].includes(delivery.status) && (
              <button
                disabled={busy}
                onClick={() => void advance("delivered")}
                className="px-3 py-2 rounded-lg bg-success text-white text-xs font-bold inline-flex gap-1"
              >
                <PackageCheck className="h-4 w-4" /> Təhvil verildi
              </button>
            )}
            {delivery.status === "handed_to_courier" && (
              <button
                onClick={() => setOpen(true)}
                className="px-3 py-2 rounded-lg border text-xs font-bold"
              >
                Məlumatı redaktə et
              </button>
            )}
            {delivery.status === "completed" && (
              <span className="text-xs font-bold text-success inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Müştəri təsdiqlədi, ödəniş açıldı
              </span>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex gap-2"
        >
          <Truck className="h-4 w-4" /> Kuryerə təhvil verildi
        </button>
      )}

      {open && (
        <div className="grid sm:grid-cols-2 gap-2 border-t pt-3">
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="h-10 rounded-lg border bg-background px-3"
          >
            <option value="">Kuryer şirkəti (opsional)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="Kuryerin adı"
            className="h-10 rounded-lg border bg-background px-3"
          />
          <input
            value={courierPhone}
            onChange={(e) => setCourierPhone(e.target.value)}
            placeholder="Telefon"
            className="h-10 rounded-lg border bg-background px-3"
          />
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Tracking nömrəsi"
            className="h-10 rounded-lg border bg-background px-3"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Qeyd"
            maxLength={500}
            className="sm:col-span-2 min-h-20 rounded-lg border bg-background p-3"
          />
          <div className="sm:col-span-2 flex gap-2">
            <button
              disabled={busy}
              onClick={() => void handoff()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm"
            >
              {busy ? "Saxlanılır..." : "Təsdiqlə"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border font-bold text-sm"
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
