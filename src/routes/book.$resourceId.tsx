import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, MapPin, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN } from "@/lib/format";
import { parseTrustedPaymentRedirect } from "@/lib/paymentRedirect";
import {
  RESERVATION_MODULE_LABELS,
  RESOURCE_TYPE_LABELS,
  reservationTime,
  type ReservationModuleCode,
} from "@/lib/reservations";

export const Route = createFileRoute("/book/$resourceId")({
  head: () => ({
    meta: [
      { title: "Onlayn rezervasiya — EG Shop" },
      { name: "description", content: "EG Shop-da tarix və boş vaxt seçərək təhlükəsiz rezervasiya yaradın." },
    ],
  }),
  component: BookingPage,
});

type Resource = {
  id: string;
  seller_id: string;
  module_code: ReservationModuleCode;
  name: string;
  resource_type: string;
  description: string | null;
  capacity: number;
  duration_minutes: number;
  price: number;
  currency: string;
  online_payment_enabled: boolean;
  onsite_payment_enabled: boolean;
  is_active: boolean;
};

type Slot = { starts_at: string; ends_at: string };
type SellerProfile = { shop_name: string | null; full_name: string | null; shop_city: string | null; shop_logo_url: string | null };

function dateInBaku(offset = 0): string {
  const date = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baku", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function BookingPage() {
  const { resourceId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => dateInBaku());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "onsite">("onsite");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      (supabase as any).from("reservation_resources").select("*").eq("id", resourceId).eq("is_active", true).maybeSingle(),
      user ? (supabase as any).from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(async ([resourceResult, profileResult]) => {
      if (resourceResult.error || !resourceResult.data) {
        setLoading(false);
        return;
      }
      const row = resourceResult.data as Resource;
      setResource(row);
      if (!row.onsite_payment_enabled && row.online_payment_enabled) setPaymentMethod("online");
      if (profileResult.data) {
        setName(profileResult.data.full_name ?? "");
        setPhone(profileResult.data.phone ?? "");
      }
      if (user?.email) setEmail(user.email);
      const { data: shop } = await (supabase as any)
        .from("active_seller_storefronts")
        .select("shop_name,full_name,shop_city,shop_logo_url")
        .eq("id", row.seller_id)
        .maybeSingle();
      setSeller(shop as SellerProfile | null);
      setLoading(false);
    });
  }, [resourceId, user?.id]);

  useEffect(() => {
    if (!resource) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    (supabase as any).rpc("get_reservation_availability", {
      _resource_id: resource.id,
      _date: date,
    }).then(({ data, error }: { data: Slot[] | null; error: { message: string } | null }) => {
      if (error) toast.error(`Boş vaxtlar yüklənmədi: ${error.message}`);
      setSlots(data ?? []);
      setSlotsLoading(false);
    });
  }, [resource?.id, date]);

  const nextDays = useMemo(() => Array.from({ length: 14 }, (_, index) => dateInBaku(index)), []);

  const submit = async () => {
    if (!user) {
      toast.error("Rezervasiya üçün hesabınıza daxil olun");
      navigate({ to: "/auth" });
      return;
    }
    if (!selectedSlot) { toast.error("Boş saat seçin"); return; }
    if (name.trim().length < 2 || !email.includes("@") || phone.trim().length < 7) {
      toast.error("Ad, e-poçt və telefon məlumatlarını düzgün daxil edin");
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc("create_reservation", {
      _resource_id: resourceId,
      _starts_at: selectedSlot.starts_at,
      _party_size: partySize,
      _payment_method: paymentMethod,
      _customer_name: name,
      _customer_email: email,
      _customer_phone: phone,
      _notes: notes,
    });
    const reservation = data as { id?: string } | null;
    if (error || !reservation?.id) {
      setSubmitting(false);
      toast.error(error?.message === "slot_unavailable" ? "Bu vaxt indicə tutuldu. Başqa saat seçin." : (error?.message ?? "Rezervasiya yaradılmadı"));
      return;
    }

    void (supabase as any).functions.invoke("reservation-notifier", {
      body: { reservation_id: reservation.id },
    });

    if (paymentMethod === "online" && resource && Number(resource.price) > 0) {
      const result = await supabase.functions.invoke("payment-init", {
        body: {
          service_type: "reservation",
          resource_id: reservation.id,
          language: "az",
        },
      });
      setSubmitting(false);
      if (result.error || !result.data?.redirect_url) {
        toast.error("Rezervasiya yaradıldı, amma ödəniş səhifəsi açılmadı. “Rezervasiyalarım” bölməsindən yenidən cəhd edin.");
        navigate({ to: "/reservations" });
        return;
      }
      try {
        window.location.assign(parseTrustedPaymentRedirect(result.data.redirect_url).toString());
      } catch (paymentError) {
        toast.error(paymentError instanceof Error ? paymentError.message : "Ödəniş ünvanı etibarsızdır");
        navigate({ to: "/reservations" });
      }
      return;
    }

    setSubmitting(false);
    toast.success("Rezervasiya uğurla yaradıldı");
    navigate({ to: "/reservations" });
  };

  if (loading || authLoading) return <main className="container mx-auto max-w-5xl px-4 py-12"><div className="h-96 animate-pulse rounded-3xl bg-secondary" /></main>;
  if (!resource) {
    return <main className="container mx-auto max-w-xl px-4 py-20 text-center"><CalendarDays className="mx-auto h-14 w-14 text-muted-foreground" /><h1 className="mt-4 text-2xl font-extrabold">Rezervasiya resursu tapılmadı</h1><Link to="/shops" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Mağazalara bax</Link></main>;
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-3xl border bg-card p-6">
          <div className="flex items-center gap-3">
            {seller?.shop_logo_url ? <img src={seller.shop_logo_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10"><Store className="h-6 w-6 text-primary" /></div>}
            <div><div className="text-sm text-muted-foreground">{seller?.shop_name ?? seller?.full_name ?? "EG Shop tərəfdaşı"}</div><h1 className="text-xl font-extrabold">{resource.name}</h1></div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {RESERVATION_MODULE_LABELS[resource.module_code]}</div>
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" /> {resource.duration_minutes} dəqiqə</div>
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Tutum: {resource.capacity}</div>
            {seller?.shop_city && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {seller.shop_city}</div>}
          </div>
          {resource.description && <p className="mt-5 border-t pt-5 text-sm leading-6 text-muted-foreground">{resource.description}</p>}
          <div className="mt-5 rounded-2xl bg-primary/5 p-4">
            <div className="text-xs text-muted-foreground">Rezervasiya qiyməti</div>
            <div className="mt-1 text-2xl font-extrabold text-primary">{formatAZN(resource.price)}</div>
          </div>
        </aside>

        <section className="space-y-6 rounded-3xl border bg-card p-5 md:p-7">
          <div><h2 className="text-2xl font-extrabold">Tarix və saat seçin</h2><p className="text-sm text-muted-foreground">Yalnız real boş vaxtlar göstərilir. Saatlar Bakı vaxtıdır.</p></div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {nextDays.map((day) => (
              <button key={day} onClick={() => setDate(day)} className={`min-w-24 rounded-xl border px-3 py-3 text-sm font-bold ${date === day ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>
                {new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "short", timeZone: "Asia/Baku" }).format(new Date(`${day}T12:00:00+04:00`))}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slotsLoading ? <div className="col-span-full py-8 text-center text-muted-foreground">Boş vaxtlar hesablanır...</div> : slots.length === 0 ? <div className="col-span-full rounded-xl border border-dashed py-8 text-center text-muted-foreground">Bu tarixdə boş vaxt yoxdur.</div> : slots.map((slot) => (
              <button key={slot.starts_at} onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-3 py-3 font-bold ${selectedSlot?.starts_at === slot.starts_at ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}>
                {reservationTime(slot.starts_at)}
              </button>
            ))}
          </div>

          <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
            <label className="text-sm font-semibold">Ad və soyad<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" /></label>
            <label className="text-sm font-semibold">Telefon<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" placeholder="+994..." /></label>
            <label className="text-sm font-semibold">E-poçt<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" /></label>
            <label className="text-sm font-semibold">Nəfər / yer sayı<input type="number" min={1} max={resource.capacity} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Əlavə qeyd<textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border bg-background p-3" placeholder="Xüsusi istəyiniz varsa qeyd edin" /></label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {resource.onsite_payment_enabled && <button onClick={() => setPaymentMethod("onsite")} className={`rounded-xl border p-4 text-left ${paymentMethod === "onsite" ? "border-primary bg-primary/5" : ""}`}><div className="font-bold">Yerində ödəniş</div><div className="text-xs text-muted-foreground">Məkan və ya xidmət zamanı ödəyin</div></button>}
            {resource.online_payment_enabled && <button onClick={() => setPaymentMethod("online")} className={`rounded-xl border p-4 text-left ${paymentMethod === "online" ? "border-primary bg-primary/5" : ""}`}><div className="flex items-center gap-2 font-bold"><CreditCard className="h-4 w-4" /> Onlayn ödəniş</div><div className="text-xs text-muted-foreground">Epoint ilə təhlükəsiz ödəniş</div></button>}
          </div>

          <button disabled={submitting || !selectedSlot} onClick={submit} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground disabled:opacity-50">
            <CheckCircle2 className="h-5 w-5" /> {submitting ? "Hazırlanır..." : paymentMethod === "online" && resource.price > 0 ? `${formatAZN(resource.price)} ödə və rezervasiya et` : "Rezervasiya et"}
          </button>
        </section>
      </div>
    </main>
  );
}

