import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, CreditCard, LockKeyhole, Package, Store, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AcquisitionSourceFields } from "@/components/AcquisitionSourceFields";
import { ACQUISITION_DETAIL_SOURCES, type AcquisitionSource } from "@/lib/acquisitionSources";

type PaymentSearch = { payment?: "success" | "error" };

interface SellerApplication {
  id: string;
  shop_name: string;
  shop_city: string | null;
  phone: string | null;
  voen: string | null;
  status: "pending_payment" | "active" | "payment_returned" | "suspended";
  payment_status: "pending" | "success" | "error" | "returned" | "migrated";
}

export const Route = createFileRoute("/become-seller")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch => ({
    payment:
      search.payment === "success" || search.payment === "error" ? search.payment : undefined,
  }),
  head: () => ({ meta: [{ title: "Satıcı ol — EG Shop" }] }),
  component: BecomeSeller,
});

function BecomeSeller() {
  const { t, i18n } = useTranslation();
  const { user, isSeller, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [phone, setPhone] = useState("");
  const [voen, setVoen] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [acquisitionDetail, setAcquisitionDetail] = useState("");
  const [acquisitionEnabled, setAcquisitionEnabled] = useState(true);
  const [acquisitionRequired, setAcquisitionRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  const loadApplication = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("seller_applications")
      .select("id,shop_name,shop_city,phone,voen,status,payment_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      toast.error("Satıcı müraciəti yoxlanıla bilmədi");
      setChecking(false);
      return null;
    }

    const current = data as SellerApplication | null;
    setApplication(current);
    if (current) {
      setShopName((value) => value || current.shop_name || "");
      setShopCity((value) => value || current.shop_city || "");
      setPhone((value) => value || current.phone || "");
      setVoen((value) => value || current.voen || "");
    }
    setChecking(false);

    if (current?.status === "active") {
      await refreshRoles();
      navigate({ to: "/seller", replace: true });
    }
    return current;
  }, [navigate, refreshRoles, user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (isSeller) navigate({ to: "/seller", replace: true });
  }, [user, isSeller, loading, navigate]);

  useEffect(() => {
    if (user) void loadApplication();
  }, [user, loadApplication]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      supabase.from("profiles").select("acquisition_source,acquisition_detail").eq("id", user.id).maybeSingle(),
      supabase.from("system_settings").select("acquisition_source_enabled,acquisition_source_required").limit(1).maybeSingle(),
    ]).then(([profileResult, settingsResult]) => {
      const profile = profileResult.data as { acquisition_source?: string | null; acquisition_detail?: string | null } | null;
      const settings = settingsResult.data as { acquisition_source_enabled?: boolean; acquisition_source_required?: boolean } | null;
      setAcquisitionSource(profile?.acquisition_source ?? "");
      setAcquisitionDetail(profile?.acquisition_detail ?? "");
      setAcquisitionEnabled(settings?.acquisition_source_enabled ?? true);
      setAcquisitionRequired(settings?.acquisition_source_required ?? true);
    });
  }, [user]);

  useEffect(() => {
    if (!user || search.payment !== "success" || application?.status === "active") return;
    const interval = window.setInterval(() => void loadApplication(), 2500);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 60_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [application?.status, loadApplication, search.payment, user]);

  const startPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || busy) return;
    if (shopName.trim().length < 2) {
      toast.error("Mağaza adı minimum 2 simvol olmalıdır");
      return;
    }

    if (acquisitionEnabled) {
      if (acquisitionRequired && !acquisitionSource) {
        toast.error("Sizi haradan tanıdığımızı seçin");
        return;
      }
      if (ACQUISITION_DETAIL_SOURCES.has(acquisitionSource as AcquisitionSource) && !acquisitionDetail.trim()) {
        toast.error("Kim tərəfindən cəlb olunduğunuzu qeyd edin");
        return;
      }
      const { error: sourceError } = await supabase.rpc("record_registration_source" as never, {
        _source: acquisitionSource,
        _detail: acquisitionDetail.trim() || null,
      } as never);
      if (sourceError) {
        toast.error(sourceError.message);
        return;
      }
    }

    setBusy(true);
    const language = ["az", "en", "ru"].includes(i18n.language) ? i18n.language : "az";
    const { data, error } = await supabase.functions.invoke("seller-payment-init", {
      body: {
        shop_name: shopName.trim(),
        shop_city: shopCity.trim() || null,
        phone: phone.trim() || null,
        voen: voen.trim() || null,
        language,
      },
    });

    if (error || !data?.redirect_url) {
      const message =
        data?.error === "payment_not_configured"
          ? "Ödəniş xidməti hələ aktivləşdirilməyib"
          : "Ödəniş səhifəsi açıla bilmədi. Yenidən cəhd edin.";
      toast.error(message);
      await loadApplication();
      setBusy(false);
      return;
    }

    window.location.assign(data.redirect_url as string);
  };

  if (!user || loading || checking) return null;

  const isPending = application?.status === "pending_payment";
  const isBlocked =
    application?.status === "payment_returned" || application?.status === "suspended";

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="bg-gradient-brand text-primary-foreground rounded-3xl p-8 mb-6 shadow-elegant">
        <Store className="h-12 w-12 mb-3 opacity-90" />
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{t("becomeSeller.title")}</h1>
        <p className="opacity-90">
          Formanı doldurun, 20 AZN qeydiyyat haqqını ödəyin və mağazanızı aktivləşdirin.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { icon: TrendingUp, title: "Geniş auditoriya", subtitle: "Bütün Azərbaycan" },
          { icon: Package, title: "Sadə idarəetmə", subtitle: "Bir paneldən hamısı" },
          { icon: CreditCard, title: "Birdəfəlik 20 AZN", subtitle: "Təhlükəsiz Epoint ödənişi" },
        ].map((benefit) => (
          <div key={benefit.title} className="bg-card border border-border rounded-2xl p-4">
            <benefit.icon className="h-6 w-6 text-primary mb-2" />
            <div className="font-bold text-sm">{benefit.title}</div>
            <div className="text-xs text-muted-foreground">{benefit.subtitle}</div>
          </div>
        ))}
      </div>

      {search.payment === "success" && application?.status !== "active" && (
        <div className="mb-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
          <div className="font-bold flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" /> Ödəniş nəticəsi yoxlanılır
          </div>
          <p className="text-sm mt-1">
            Epoint təsdiqi gələn kimi hesabınız avtomatik aktiv olacaq. Səhifəni bağlamayın.
          </p>
        </div>
      )}

      {search.payment === "error" && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
          <div className="font-bold">Ödəniş tamamlanmadı</div>
          <p className="text-sm mt-1">
            Hesabınız gözləmədə qaldı. Aşağıdakı düymə ilə yenidən cəhd edə bilərsiniz.
          </p>
        </div>
      )}

      {isPending && !search.payment && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="font-bold">Status: Gözləmədə</div>
          <p className="text-sm mt-1">
            20 AZN ödəniş tamamlanana qədər məhsul əlavə etmək mümkün deyil.
          </p>
        </div>
      )}

      {isBlocked && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900">
          <div className="font-bold">Satıcı hesabı aktiv deyil</div>
          <p className="text-sm mt-1">Ödənişi yenilədikdən sonra hesab yenidən aktivləşəcək.</p>
        </div>
      )}

      <form
        onSubmit={startPayment}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <div>
          <label className="text-sm font-semibold">Mağaza adı *</label>
          <input
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            maxLength={100}
            required
            placeholder="Mağazanızın adı"
            className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Şəhər</label>
            <input
              value={shopCity}
              onChange={(event) => setShopCity(event.target.value)}
              maxLength={100}
              placeholder="Bakı"
              className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Telefon</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
              placeholder="+994 50 000 00 00"
              className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">
            VÖEN <span className="font-normal text-muted-foreground">(varsa)</span>
          </label>
          <input
            value={voen}
            onChange={(event) => setVoen(event.target.value)}
            maxLength={32}
            className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background"
          />
        </div>

        <AcquisitionSourceFields
          source={acquisitionSource}
          detail={acquisitionDetail}
          enabled={acquisitionEnabled}
          required={acquisitionRequired}
          onSourceChange={setAcquisitionSource}
          onDetailChange={setAcquisitionDetail}
        />

        <div className="rounded-xl bg-secondary/60 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Satıcı qeydiyyat haqqı</div>
            <div className="text-2xl font-black">20.00 AZN</div>
          </div>
          <LockKeyhole className="h-6 w-6 text-primary" />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <CreditCard className="h-5 w-5" />
          {busy ? "Ödəniş hazırlanır..." : "20 AZN ödə və satıcı ol"}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Hesab yalnız Epoint-dən uğurlu ödəniş təsdiqi gəldikdən sonra aktivləşir.
        </p>
      </form>
    </div>
  );
}
