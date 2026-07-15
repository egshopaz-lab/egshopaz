import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type PaymentSearch = { payment?: "success" | "error" };
interface PvzApplication { status: string; payment_status: string; }

export const Route = createFileRoute("/become-pvz")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch => ({
    payment: search.payment === "success" || search.payment === "error" ? search.payment : undefined,
  }),
  head: () => ({ meta: [{ title: "PVZ qeydiyyatı — EG Shop" }] }),
  component: BecomePvz,
});

function BecomePvz() {
  const { user, isPvz, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const metadata = user?.user_metadata ?? {};
  const [fullName, setFullName] = useState(String(metadata.full_name ?? ""));
  const [phone, setPhone] = useState(String(metadata.phone ?? ""));
  const [position, setPosition] = useState(String(metadata.position ?? "operator"));
  const [pickupPointId, setPickupPointId] = useState(String(metadata.pickup_point_id ?? ""));
  const [newPvzName, setNewPvzName] = useState(String(metadata.new_pvz_name ?? ""));
  const [newPvzCity, setNewPvzCity] = useState(String(metadata.new_pvz_city ?? ""));
  const [newPvzAddress, setNewPvzAddress] = useState(String(metadata.new_pvz_address ?? ""));
  const [points, setPoints] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [application, setApplication] = useState<PvzApplication | null>(null);
  const [busy, setBusy] = useState(false);

  const loadApplication = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pvz_applications" as never)
      .select("status,payment_status")
      .eq("user_id", user.id)
      .maybeSingle();
    const current = data as PvzApplication | null;
    setApplication(current);
    if (current?.status === "active") {
      await refreshRoles();
      navigate({ to: "/pvz", replace: true });
    }
  }, [navigate, refreshRoles, user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (isPvz) navigate({ to: "/pvz", replace: true });
  }, [isPvz, loading, navigate, user]);
  useEffect(() => {
    void supabase.from("pickup_points").select("id,name,city").eq("is_active", true).order("city")
      .then(({ data }) => setPoints(data ?? []));
  }, []);
  useEffect(() => { void loadApplication(); }, [loadApplication]);
  useEffect(() => {
    if (search.payment !== "success" || application?.status === "active") return;
    const interval = window.setInterval(() => void loadApplication(), 2500);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 60_000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [application?.status, loadApplication, search.payment]);

  const startPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || busy) return;
    if (fullName.trim().length < 2 || phone.trim().length < 5) {
      toast.error("Ad və telefon məlumatlarını doldurun");
      return;
    }
    if (!pickupPointId && (newPvzName.trim().length < 2 || newPvzCity.trim().length < 2 || newPvzAddress.trim().length < 5)) {
      toast.error("Yeni PVZ ünvan məlumatlarını tam doldurun");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("payment-init", {
      body: {
        service_type: "pvz_registration",
        payload: {
          full_name: fullName.trim(), phone: phone.trim(), position,
          pickup_point_id: pickupPointId || null,
          new_pvz_name: pickupPointId ? null : newPvzName.trim(),
          new_pvz_city: pickupPointId ? null : newPvzCity.trim(),
          new_pvz_address: pickupPointId ? null : newPvzAddress.trim(),
        },
        language: "az",
      },
    });
    if (error || !data?.redirect_url) {
      toast.error(data?.error === "payment_not_configured" ? "Epoint açarları aktiv deyil" : "Ödəniş səhifəsi açıla bilmədi");
      setBusy(false);
      await loadApplication();
      return;
    }
    window.location.assign(data.redirect_url as string);
  };

  if (!user || loading) return null;
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="bg-gradient-brand text-primary-foreground rounded-3xl p-8 mb-6 shadow-elegant">
        <MapPin className="h-12 w-12 mb-3" />
        <h1 className="text-3xl font-extrabold">PVZ PUNKT qeydiyyatı</h1>
        <p className="mt-2 opacity-90">Müraciəti tamamlayın və Epoint vasitəsilə qeydiyyat haqqını ödəyin.</p>
      </div>
      {search.payment === "success" && application?.status !== "active" && (
        <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          <b>Ödəniş təsdiqi gözlənilir.</b> Callback gələn kimi PVZ hesabı avtomatik aktivləşəcək.
        </div>
      )}
      {search.payment === "error" && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">Ödəniş tamamlanmadı. Müraciət gözləmədə qaldı.</div>
      )}
      <form onSubmit={startPayment} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tam ad" className="h-11 px-3 rounded-lg border border-input bg-background" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="h-11 px-3 rounded-lg border border-input bg-background" />
        </div>
        <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-input bg-background">
          <option value="operator">Operator</option><option value="manager">Menecer</option><option value="owner">Sahib</option>
        </select>
        <select value={pickupPointId} onChange={(e) => setPickupPointId(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-input bg-background">
          <option value="">+ Yeni PVZ PUNKT yarat</option>
          {points.map((point) => <option key={point.id} value={point.id}>{point.city} — {point.name}</option>)}
        </select>
        {!pickupPointId && <div className="grid gap-3">
          <input value={newPvzName} onChange={(e) => setNewPvzName(e.target.value)} placeholder="PVZ adı" className="h-11 px-3 rounded-lg border border-input bg-background" />
          <input value={newPvzCity} onChange={(e) => setNewPvzCity(e.target.value)} placeholder="Şəhər" className="h-11 px-3 rounded-lg border border-input bg-background" />
          <input value={newPvzAddress} onChange={(e) => setNewPvzAddress(e.target.value)} placeholder="Tam ünvan" className="h-11 px-3 rounded-lg border border-input bg-background" />
        </div>}
        <div className="rounded-xl bg-secondary/60 p-4 flex items-center justify-between">
          <div><div className="text-xs text-muted-foreground">PVZ qeydiyyat haqqı</div><div className="text-2xl font-black">20.00 AZN</div></div>
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <button disabled={busy} className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          {busy ? "Epoint hazırlanır..." : "20 AZN ödə və PVZ ol"}
        </button>
      </form>
    </div>
  );
}
