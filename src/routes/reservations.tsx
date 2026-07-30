import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, History, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { formatAZN } from "@/lib/format";
import { parseTrustedPaymentRedirect } from "@/lib/paymentRedirect";
import {
  RESERVATION_MODULE_LABELS,
  RESERVATION_STATUS_CLASSES,
  RESERVATION_STATUS_LABELS,
  reservationDateTime,
  type ReservationModuleCode,
  type ReservationStatus,
} from "@/lib/reservations";

export const Route = createFileRoute("/reservations")({
  head: () => ({ meta: [{ title: "Rezervasiyalarım — EG Shop" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReservationsPage,
});

type Reservation = {
  id: string;
  reservation_code: string;
  module_code: ReservationModuleCode;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  party_size: number;
  status: ReservationStatus;
  payment_method: "online" | "onsite";
  payment_status: string;
  amount: number;
  cancellation_reason: string | null;
  reservation_resources?: { name?: string; seller_id?: string } | null;
};

function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("reservations")
      .select("*,reservation_resources(name,seller_id)")
      .eq("customer_id", user.id)
      .order("starts_at", { ascending: false });
    if (error) toast.error(`Rezervasiyalar yüklənmədi: ${error.message}`);
    else setRows((data ?? []) as Reservation[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`customer-reservations-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `customer_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const cancel = async (reservation: Reservation) => {
    const reason = prompt("Ləğv səbəbini qeyd edin (istəyə bağlı):");
    const { error } = await (supabase as any).rpc("update_reservation_status", {
      _reservation_id: reservation.id,
      _new_status: "cancelled",
      _note: reason,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Rezervasiya ləğv edildi");
      void (supabase as any).functions.invoke("reservation-notifier", { body: { reservation_id: reservation.id } });
      await load();
    }
  };

  const pay = async (reservation: Reservation) => {
    setPaying(reservation.id);
    const { data, error } = await supabase.functions.invoke("payment-init", {
      body: { service_type: "reservation", resource_id: reservation.id, language: "az" },
    });
    setPaying(null);
    if (error || !data?.redirect_url) {
      toast.error("Ödəniş başladılmadı. Bir qədər sonra yenidən yoxlayın.");
      return;
    }
    try {
      window.location.assign(parseTrustedPaymentRedirect(data.redirect_url).toString());
    } catch (paymentError) {
      toast.error(paymentError instanceof Error ? paymentError.message : "Ödəniş ünvanı etibarsızdır");
    }
  };

  return (
    <PanelLayout title="Müştəri paneli" subtitle="Rezervasiyalarım" items={items}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold">Rezervasiyalarım</h1><p className="text-sm text-muted-foreground">Tarixçəni, təsdiqi və ödəniş vəziyyətini izləyin.</p></div>
          <CalendarDays className="h-8 w-8 text-primary" />
        </div>
        {loading ? <div className="rounded-2xl border p-10 text-center text-muted-foreground">Yüklənir...</div> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <History className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 font-bold">Rezervasiya tarixçəniz boşdur</h2>
            <Link to="/shops" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Mağazalara bax</Link>
          </div>
        ) : rows.map((row) => (
          <div key={row.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{row.reservation_code}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${RESERVATION_STATUS_CLASSES[row.status]}`}>{RESERVATION_STATUS_LABELS[row.status]}</span>
                </div>
                <h2 className="mt-2 text-lg font-extrabold">{row.reservation_resources?.name ?? "Rezervasiya"}</h2>
                <p className="text-sm text-muted-foreground">{RESERVATION_MODULE_LABELS[row.module_code]}</p>
                <p className="mt-2 font-semibold">{reservationDateTime(row.starts_at)} · {row.party_size} nəfər/yer</p>
                <p className="mt-1 text-sm">Ödəniş: {row.payment_method === "online" ? "Onlayn" : "Yerində"} · {row.payment_status} · {formatAZN(row.amount)}</p>
                {row.cancellation_reason && <p className="mt-2 text-sm text-red-600">Səbəb: {row.cancellation_reason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {row.payment_method === "online" && row.payment_status !== "paid" && !["cancelled", "completed"].includes(row.status) && (
                  <button disabled={paying === row.id} onClick={() => pay(row)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"><CreditCard className="h-4 w-4" /> {paying === row.id ? "Açılır..." : "Ödə"}</button>
                )}
                {["requested", "confirmed"].includes(row.status) && (
                  <button onClick={() => cancel(row)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600"><XCircle className="h-4 w-4" /> Ləğv et</button>
                )}
                <Link to="/book/$resourceId" params={{ resourceId: row.resource_id }} className="rounded-lg border px-3 py-2 text-sm font-bold">Yenidən rezervasiya et</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PanelLayout>
  );
}

