import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN } from "@/lib/format";
import {
  RESERVATION_MODULE_LABELS,
  RESERVATION_STATUS_CLASSES,
  RESERVATION_STATUS_LABELS,
  reservationDateTime,
  type ReservationModuleCode,
  type ReservationStatus,
} from "@/lib/reservations";

type AdminReservation = {
  id: string;
  reservation_code: string;
  seller_id: string;
  customer_id: string;
  module_code: ReservationModuleCode;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  party_size: number;
  status: ReservationStatus;
  payment_method: string;
  payment_status: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  reservation_resources?: { name?: string } | null;
};

export function AdminReservations() {
  const [rows, setRows] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReservationStatus>("all");
  const [moduleCode, setModuleCode] = useState("all");
  const [selected, setSelected] = useState<AdminReservation | null>(null);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("reservations")
      .select("*,reservation_resources(name)")
      .order("starts_at", { ascending: false })
      .limit(1000);
    if (error) toast.error(`Rezervasiyalar yüklənmədi: ${error.message}`);
    else setRows((data ?? []) as AdminReservation[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-reservations")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("az");
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (moduleCode !== "all" && row.module_code !== moduleCode) return false;
      if (!needle) return true;
      return [
        row.reservation_code, row.customer_name, row.customer_email, row.customer_phone,
        row.reservation_resources?.name,
      ].some((value) => String(value ?? "").toLocaleLowerCase("az").includes(needle));
    });
  }, [rows, query, status, moduleCode]);

  const stats = {
    total: rows.length,
    waiting: rows.filter((row) => row.status === "requested").length,
    confirmed: rows.filter((row) => row.status === "confirmed").length,
    paid: rows.filter((row) => row.payment_status === "paid").reduce((sum, row) => sum + Number(row.amount), 0),
  };

  const changeStatus = async (row: AdminReservation, nextStatus: ReservationStatus) => {
    const note = nextStatus === "cancelled" ? prompt("Ləğv səbəbi və admin qeydi:") : prompt("Admin qeydi (istəyə bağlı):");
    const { error } = await (supabase as any).rpc("update_reservation_status", {
      _reservation_id: row.id,
      _new_status: nextStatus,
      _note: note,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status dəyişdirildi və tarixçəyə yazıldı");
    void (supabase as any).functions.invoke("reservation-notifier", {
      body: { reservation_id: row.id },
    });
    setSelected(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">Rezervasiya nəzarəti</h2>
        <p className="text-sm text-muted-foreground">Bütün modulların rezervasiyalarını, ödənişini və status tarixçəsini izləyin.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ümumi rezervasiya", value: stats.total, icon: CalendarDays },
          { label: "Gözləyən", value: stats.waiting, icon: Clock3 },
          { label: "Təsdiqlənən", value: stats.confirmed, icon: CheckCircle2 },
          { label: "Ödənilmiş məbləğ", value: formatAZN(stats.paid), icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-2xl font-extrabold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[1fr_220px_220px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kod, ad, e-poçt, telefon və ya resurs..." className="h-10 w-full rounded-lg border bg-background pl-9 pr-3" />
        </label>
        <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="h-10 rounded-lg border bg-background px-3">
          <option value="all">Bütün modullar</option>
          {Object.entries(RESERVATION_MODULE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-10 rounded-lg border bg-background px-3">
          <option value="all">Bütün statuslar</option>
          {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              {["Kod", "Tarix və saat", "Modul / resurs", "Müştəri", "Ödəniş", "Status", ""].map((header) => <th key={header} className="p-3 font-bold">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Yüklənir...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Rezervasiya tapılmadı.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3 font-mono text-xs font-bold text-primary">{row.reservation_code}</td>
                <td className="p-3">{reservationDateTime(row.starts_at)}</td>
                <td className="p-3"><div className="font-semibold">{row.reservation_resources?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{RESERVATION_MODULE_LABELS[row.module_code]}</div></td>
                <td className="p-3"><div className="font-semibold">{row.customer_name}</div><div className="text-xs text-muted-foreground">{row.customer_phone}</div></td>
                <td className="p-3"><div>{formatAZN(row.amount)}</div><div className="text-xs text-muted-foreground">{row.payment_method} · {row.payment_status}</div></td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${RESERVATION_STATUS_CLASSES[row.status]}`}>{RESERVATION_STATUS_LABELS[row.status]}</span></td>
                <td className="p-3"><button onClick={() => setSelected(row)} className="rounded-lg border px-3 py-2 font-bold hover:bg-secondary">İdarə et</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><div className="font-mono text-xs font-bold text-primary">{selected.reservation_code}</div><h3 className="mt-1 text-xl font-extrabold">{selected.reservation_resources?.name}</h3></div>
              <button onClick={() => setSelected(null)}><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid gap-3 rounded-xl bg-secondary/40 p-4 sm:grid-cols-2">
              <div><div className="text-xs text-muted-foreground">Tarix</div><div className="font-semibold">{reservationDateTime(selected.starts_at)}</div></div>
              <div><div className="text-xs text-muted-foreground">Müştəri</div><div className="font-semibold">{selected.customer_name}</div></div>
              <div><div className="text-xs text-muted-foreground">Əlaqə</div><div className="font-semibold">{selected.customer_phone}<br />{selected.customer_email}</div></div>
              <div><div className="text-xs text-muted-foreground">Ödəniş</div><div className="font-semibold">{formatAZN(selected.amount)} · {selected.payment_status}</div></div>
              {selected.notes && <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Qeyd</div><div>{selected.notes}</div></div>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((nextStatus) => (
                <button
                  key={nextStatus}
                  disabled={nextStatus === selected.status}
                  onClick={() => changeStatus(selected, nextStatus)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40 ${nextStatus === "cancelled" ? "border border-red-200 text-red-600" : "border hover:bg-secondary"}`}
                >
                  {RESERVATION_STATUS_LABELS[nextStatus]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

