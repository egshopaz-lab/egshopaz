import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Check, Clock3, Copy, Edit3, Link2, Plus, Save,
  Settings2, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN } from "@/lib/format";
import {
  MODULE_RESOURCE_TYPE,
  RESERVATION_MODULE_LABELS,
  RESERVATION_STATUS_CLASSES,
  RESERVATION_STATUS_LABELS,
  RESOURCE_TYPE_LABELS,
  isReservationModule,
  reservationDateTime,
  type ReservationModuleCode,
  type ReservationStatus,
} from "@/lib/reservations";

type Resource = {
  id: string;
  seller_id: string;
  module_code: ReservationModuleCode;
  name: string;
  resource_type: string;
  description: string | null;
  capacity: number;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  currency: string;
  online_payment_enabled: boolean;
  onsite_payment_enabled: boolean;
  is_active: boolean;
};

type Reservation = {
  id: string;
  reservation_code: string;
  resource_id: string;
  module_code: ReservationModuleCode;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  starts_at: string;
  ends_at: string;
  party_size: number;
  status: ReservationStatus;
  payment_method: "online" | "onsite";
  payment_status: string;
  amount: number;
  notes: string | null;
  created_at: string;
};

type ScheduleDraft = {
  day_of_week: number;
  active: boolean;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
};

const DAYS = ["Bazar", "Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə"];
const DEFAULT_SCHEDULES: ScheduleDraft[] = DAYS.map((_, day) => ({
  day_of_week: day,
  active: day !== 0,
  start_time: "09:00",
  end_time: "18:00",
  slot_interval_minutes: 30,
}));

const EMPTY_RESOURCE = {
  module_code: "restaurant" as ReservationModuleCode,
  name: "",
  resource_type: "table",
  description: "",
  capacity: 1,
  duration_minutes: 60,
  buffer_minutes: 0,
  price: 0,
  online_payment_enabled: false,
  onsite_payment_enabled: true,
  is_active: true,
};

export function SellerReservations({
  sellerId,
  selectedModuleCodes,
}: {
  sellerId: string;
  selectedModuleCodes: string[];
}) {
  const enabledModules = selectedModuleCodes.filter(isReservationModule);
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "reservations" | "resources">("calendar");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));
  const [resourceEditor, setResourceEditor] = useState<(typeof EMPTY_RESOURCE & { id?: string }) | null>(null);
  const [scheduleResource, setScheduleResource] = useState<Resource | null>(null);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(DEFAULT_SCHEDULES);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: resourceRows, error: resourceError }, { data: reservationRows, error: reservationError }] =
      await Promise.all([
        (supabase as any).from("reservation_resources").select("*").eq("seller_id", sellerId).order("created_at"),
        (supabase as any).from("reservations").select("*").eq("seller_id", sellerId).order("starts_at", { ascending: false }),
      ]);
    if (resourceError || reservationError) {
      toast.error(`Rezervasiyalar yüklənmədi: ${(resourceError ?? reservationError)?.message}`);
    } else {
      setResources((resourceRows ?? []) as Resource[]);
      setReservations((reservationRows ?? []) as Reservation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`seller-reservations-${sellerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `seller_id=eq.${sellerId}` },
        () => void load(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sellerId]);

  const resourceMap = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );
  const filtered = reservations.filter((reservation) => {
    if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
    if (view === "calendar") {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date(reservation.starts_at)) === dateFilter;
    }
    return true;
  });
  const stats = {
    today: reservations.filter((r) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date(r.starts_at)) === new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date()),
    ).length,
    waiting: reservations.filter((r) => r.status === "requested").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    revenue: reservations.filter((r) => r.payment_status === "paid").reduce((sum, r) => sum + Number(r.amount), 0),
  };

  const openNewResource = () => {
    const moduleCode = enabledModules[0] ?? "restaurant";
    setResourceEditor({
      ...EMPTY_RESOURCE,
      module_code: moduleCode,
      resource_type: MODULE_RESOURCE_TYPE[moduleCode],
    });
  };

  const saveResource = async () => {
    if (!resourceEditor || resourceEditor.name.trim().length < 2) {
      toast.error("Resursun adını daxil edin");
      return;
    }
    if (!resourceEditor.online_payment_enabled && !resourceEditor.onsite_payment_enabled) {
      toast.error("Ən azı bir ödəniş üsulu aktiv olmalıdır");
      return;
    }
    setSaving(true);
    const { id, ...values } = resourceEditor;
    const payload = {
      ...values,
      seller_id: sellerId,
      name: values.name.trim(),
      description: values.description.trim() || null,
      price: Number(values.price),
      capacity: Number(values.capacity),
      duration_minutes: Number(values.duration_minutes),
      buffer_minutes: Number(values.buffer_minutes),
    };
    const result = id
      ? await (supabase as any).from("reservation_resources").update(payload).eq("id", id)
      : await (supabase as any).from("reservation_resources").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(id ? "Resurs yeniləndi" : "Rezervasiya resursu yaradıldı");
    setResourceEditor(null);
    await load();
  };

  const deleteResource = async (resource: Resource) => {
    if (!confirm(`“${resource.name}” resursu silinsin?`)) return;
    const { error } = await (supabase as any).from("reservation_resources").delete().eq("id", resource.id);
    if (error) toast.error(error.message);
    else { toast.success("Resurs silindi"); await load(); }
  };

  const openSchedules = async (resource: Resource) => {
    const { data, error } = await (supabase as any)
      .from("reservation_schedules")
      .select("day_of_week,start_time,end_time,slot_interval_minutes,is_active")
      .eq("resource_id", resource.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = data ?? [];
    setSchedules(DEFAULT_SCHEDULES.map((fallback) => {
      const existing = rows.find((row: any) => row.day_of_week === fallback.day_of_week);
      return existing ? {
        day_of_week: existing.day_of_week,
        active: existing.is_active,
        start_time: String(existing.start_time).slice(0, 5),
        end_time: String(existing.end_time).slice(0, 5),
        slot_interval_minutes: existing.slot_interval_minutes,
      } : fallback;
    }));
    setScheduleResource(resource);
  };

  const saveSchedules = async () => {
    if (!scheduleResource) return;
    setSaving(true);
    const { error: deleteError } = await (supabase as any)
      .from("reservation_schedules").delete().eq("resource_id", scheduleResource.id);
    if (deleteError) {
      setSaving(false);
      toast.error(deleteError.message);
      return;
    }
    const activeRows = schedules.filter((row) => row.active).map((row) => ({
      resource_id: scheduleResource.id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      slot_interval_minutes: Number(row.slot_interval_minutes),
      is_active: true,
    }));
    const { error } = activeRows.length
      ? await (supabase as any).from("reservation_schedules").insert(activeRows)
      : { error: null };
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("İş qrafiki yadda saxlanıldı");
      setScheduleResource(null);
    }
  };

  const changeStatus = async (reservation: Reservation, status: ReservationStatus) => {
    const note = status === "cancelled" ? prompt("Ləğv səbəbi (istəyə bağlı):") : null;
    const { error } = await (supabase as any).rpc("update_reservation_status", {
      _reservation_id: reservation.id,
      _new_status: status,
      _note: note,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rezervasiya statusu yeniləndi");
    void (supabase as any).functions.invoke("reservation-notifier", {
      body: { reservation_id: reservation.id },
    });
    await load();
  };

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(`https://egshop.az/book/${id}`);
    toast.success("Rezervasiya linki kopyalandı");
  };

  if (!enabledModules.length) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-3 text-xl font-bold">Rezervasiya modulu seçilməyib</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          “Biznes modulları” bölməsindən rezervasiya dəstəkləyən modul seçin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold">Rezervasiya mərkəzi</h2>
          <p className="text-sm text-muted-foreground">
            Resursları, iş qrafikini, boş vaxtları və müştəri rezervasiyalarını bir yerdən idarə edin.
          </p>
        </div>
        <button onClick={openNewResource} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Yeni resurs
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Bu gün", value: stats.today, icon: CalendarDays },
          { label: "Gözləyir", value: stats.waiting, icon: Clock3 },
          { label: "Təsdiqlənib", value: stats.confirmed, icon: Check },
          { label: "Ödənilmiş gəlir", value: formatAZN(stats.revenue), icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-2xl font-extrabold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-2">
        {[
          ["calendar", "Təqvim", CalendarDays],
          ["reservations", "Rezervasiyalar", Users],
          ["resources", "Resurs və qrafik", Settings2],
        ].map(([key, label, Icon]) => (
          <button
            key={key as string}
            onClick={() => setView(key as typeof view)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${view === key ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            <Icon className="h-4 w-4" /> {label as string}
          </button>
        ))}
      </div>

      {view === "calendar" && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Günlük təqvim</h3>
              <p className="text-xs text-muted-foreground">Bakı vaxtı (UTC+4)</p>
            </div>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-lg border bg-background px-3" />
          </div>
        </div>
      )}

      {(view === "calendar" || view === "reservations") && (
        <div className="space-y-3">
          {view === "reservations" && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-lg border bg-background px-3">
              <option value="all">Bütün statuslar</option>
              {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          )}
          {loading ? (
            <div className="rounded-2xl border p-10 text-center text-muted-foreground">Yüklənir...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Bu seçim üzrə rezervasiya yoxdur.</div>
          ) : filtered.map((reservation) => {
            const resource = resourceMap.get(reservation.resource_id);
            return (
              <div key={reservation.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{reservation.reservation_code}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${RESERVATION_STATUS_CLASSES[reservation.status]}`}>
                        {RESERVATION_STATUS_LABELS[reservation.status]}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                        {reservation.payment_method === "online" ? "Onlayn" : "Yerində"} · {reservation.payment_status}
                      </span>
                    </div>
                    <h3 className="mt-2 font-bold">{resource?.name ?? "Rezervasiya resursu"}</h3>
                    <p className="text-sm">{reservationDateTime(reservation.starts_at)} · {reservation.party_size} nəfər/yer</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reservation.customer_name} · {reservation.customer_phone} · {reservation.customer_email}
                    </p>
                    {reservation.notes && <p className="mt-2 rounded-lg bg-secondary/50 p-2 text-sm">{reservation.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reservation.status === "requested" && (
                      <button onClick={() => changeStatus(reservation, "confirmed")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Təsdiqlə</button>
                    )}
                    {reservation.status === "confirmed" && (
                      <>
                        <button onClick={() => changeStatus(reservation, "completed")} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Tamamla</button>
                        <button onClick={() => changeStatus(reservation, "no_show")} className="rounded-lg border px-3 py-2 text-sm font-bold">Gəlmədi</button>
                      </>
                    )}
                    {["requested", "confirmed"].includes(reservation.status) && (
                      <button onClick={() => changeStatus(reservation, "cancelled")} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Ləğv et</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "resources" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((resource) => (
            <div key={resource.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-primary">{RESERVATION_MODULE_LABELS[resource.module_code]}</div>
                  <h3 className="mt-1 text-lg font-extrabold">{resource.name}</h3>
                  <p className="text-sm text-muted-foreground">{RESOURCE_TYPE_LABELS[resource.resource_type]} · {resource.duration_minutes} dəq. · tutum {resource.capacity}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${resource.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                  {resource.is_active ? "Aktiv" : "Passiv"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openSchedules(resource)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><Clock3 className="h-4 w-4" /> Qrafik</button>
                <button onClick={() => copyLink(resource.id)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><Link2 className="h-4 w-4" /> Link</button>
                <button onClick={() => setResourceEditor({ ...resource, description: resource.description ?? "" })} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><Edit3 className="h-4 w-4" /> Redaktə</button>
                <button onClick={() => deleteResource(resource)} className="ml-auto rounded-lg border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!resources.length && <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground lg:col-span-2">İlk rezervasiya resursunuzu yaradın.</div>}
        </div>
      )}

      {resourceEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setResourceEditor(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold">{resourceEditor.id ? "Resursu redaktə et" : "Yeni rezervasiya resursu"}</h3>
              <button onClick={() => setResourceEditor(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Biznes modulu
                <select
                  value={resourceEditor.module_code}
                  onChange={(e) => {
                    const code = e.target.value as ReservationModuleCode;
                    setResourceEditor({ ...resourceEditor, module_code: code, resource_type: MODULE_RESOURCE_TYPE[code] });
                  }}
                  className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
                >
                  {enabledModules.map((code) => <option key={code} value={code}>{RESERVATION_MODULE_LABELS[code]}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Ad
                <input value={resourceEditor.name} onChange={(e) => setResourceEditor({ ...resourceEditor, name: e.target.value })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" placeholder="Məsələn: Masa 4, Dr. Əliyeva, BMW X5" />
              </label>
              <label className="text-sm font-semibold">Tutum
                <input type="number" min={1} value={resourceEditor.capacity} onChange={(e) => setResourceEditor({ ...resourceEditor, capacity: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
              </label>
              <label className="text-sm font-semibold">Müddət (dəqiqə)
                <input type="number" min={5} value={resourceEditor.duration_minutes} onChange={(e) => setResourceEditor({ ...resourceEditor, duration_minutes: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
              </label>
              <label className="text-sm font-semibold">Fasilə (dəqiqə)
                <input type="number" min={0} value={resourceEditor.buffer_minutes} onChange={(e) => setResourceEditor({ ...resourceEditor, buffer_minutes: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
              </label>
              <label className="text-sm font-semibold">Qiymət (AZN)
                <input type="number" min={0} step="0.01" value={resourceEditor.price} onChange={(e) => setResourceEditor({ ...resourceEditor, price: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
              </label>
              <label className="sm:col-span-2 text-sm font-semibold">Təsvir
                <textarea value={resourceEditor.description} onChange={(e) => setResourceEditor({ ...resourceEditor, description: e.target.value })} className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3" />
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold">
                <input type="checkbox" checked={resourceEditor.online_payment_enabled} onChange={(e) => setResourceEditor({ ...resourceEditor, online_payment_enabled: e.target.checked })} /> Onlayn ödəniş
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold">
                <input type="checkbox" checked={resourceEditor.onsite_payment_enabled} onChange={(e) => setResourceEditor({ ...resourceEditor, onsite_payment_enabled: e.target.checked })} /> Yerində ödəniş
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold">
                <input type="checkbox" checked={resourceEditor.is_active} onChange={(e) => setResourceEditor({ ...resourceEditor, is_active: e.target.checked })} /> Aktivdir
              </label>
            </div>
            <button disabled={saving} onClick={saveResource} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
              <Save className="h-4 w-4" /> Yadda saxla
            </button>
          </div>
        </div>
      )}

      {scheduleResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setScheduleResource(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div><h3 className="text-xl font-extrabold">İş qrafiki</h3><p className="text-sm text-muted-foreground">{scheduleResource.name}</p></div>
              <button onClick={() => setScheduleResource(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 space-y-2">
              {schedules.map((row, index) => (
                <div key={row.day_of_week} className="grid items-center gap-2 rounded-xl border p-3 sm:grid-cols-[150px_1fr_1fr_100px]">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={row.active} onChange={(e) => setSchedules(schedules.map((item, i) => i === index ? { ...item, active: e.target.checked } : item))} />
                    {DAYS[row.day_of_week]}
                  </label>
                  <input type="time" disabled={!row.active} value={row.start_time} onChange={(e) => setSchedules(schedules.map((item, i) => i === index ? { ...item, start_time: e.target.value } : item))} className="h-10 rounded-lg border bg-background px-2 disabled:opacity-40" />
                  <input type="time" disabled={!row.active} value={row.end_time} onChange={(e) => setSchedules(schedules.map((item, i) => i === index ? { ...item, end_time: e.target.value } : item))} className="h-10 rounded-lg border bg-background px-2 disabled:opacity-40" />
                  <select disabled={!row.active} value={row.slot_interval_minutes} onChange={(e) => setSchedules(schedules.map((item, i) => i === index ? { ...item, slot_interval_minutes: Number(e.target.value) } : item))} className="h-10 rounded-lg border bg-background px-2 disabled:opacity-40">
                    {[15, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} dəq.</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button disabled={saving} onClick={saveSchedules} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">
              <Save className="h-4 w-4" /> Qrafiki yadda saxla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
