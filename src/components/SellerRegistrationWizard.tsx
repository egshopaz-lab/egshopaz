import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck2,
  IdCard,
  Loader2,
  MailCheck,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AcquisitionSourceFields } from "@/components/AcquisitionSourceFields";
import { PhoneNumberField } from "@/components/PhoneNumberField";
import {
  ACQUISITION_DETAIL_SOURCES,
  type AcquisitionSource,
} from "@/lib/acquisitionSources";
import { isValidE164Phone, normalizeE164Phone } from "@/lib/phone";

type SellerType = "individual" | "sole_proprietor" | "legal_entity";

interface SellerRegistrationWizardProps {
  referralCode?: string;
}

interface SellerRegistrationForm {
  firstName: string;
  lastName: string;
  fatherName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  password: string;
  passwordConfirm: string;
  finCode: string;
  identityDocumentNumber: string;
  residentialAddress: string;
  shopName: string;
  sellerType: SellerType;
  voen: string;
  acquisitionSource: string;
  acquisitionDetail: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  sellerAgreementAccepted: boolean;
}

const STEPS = [
  { title: "Şəxsi məlumatlar", short: "Şəxsi", icon: UserRound },
  { title: "Şəxsiyyət məlumatları", short: "Şəxsiyyət", icon: IdCard },
  { title: "Satıcı məlumatları", short: "Satıcı", icon: Store },
  { title: "Razılıqlar", short: "Razılıq", icon: FileCheck2 },
  { title: "Təsdiqləmə", short: "Təsdiq", icon: ShieldCheck },
] as const;

const SELLER_TYPES: Array<{ value: SellerType; label: string; description: string }> = [
  { value: "individual", label: "Fərdi şəxs", description: "Şəxsi adınızdan satış etmək üçün" },
  {
    value: "sole_proprietor",
    label: "Fərdi sahibkar",
    description: "VÖEN ilə sahibkarlıq fəaliyyəti üçün",
  },
  {
    value: "legal_entity",
    label: "Hüquqi şəxs (Şirkət)",
    description: "Şirkət adından satış etmək üçün",
  },
];

const initialForm: SellerRegistrationForm = {
  firstName: "",
  lastName: "",
  fatherName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  password: "",
  passwordConfirm: "",
  finCode: "",
  identityDocumentNumber: "",
  residentialAddress: "",
  shopName: "",
  sellerType: "individual",
  voen: "",
  acquisitionSource: "",
  acquisitionDetail: "",
  termsAccepted: false,
  privacyAccepted: false,
  sellerAgreementAccepted: false,
};

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 outline-none transition focus:ring-2 focus:ring-ring";
const labelClass = "text-sm font-semibold";

function dateYearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function normalizeIdentityNumber(value: string) {
  return value.toLocaleUpperCase("az-AZ").replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

export function SellerRegistrationWizard({ referralCode }: SellerRegistrationWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SellerRegistrationForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [acquisitionEnabled, setAcquisitionEnabled] = useState(true);
  const [acquisitionRequired, setAcquisitionRequired] = useState(true);
  const [phoneOtpRequired, setPhoneOtpRequired] = useState(true);

  const normalizedPhone = useMemo(() => normalizeE164Phone(form.phone), [form.phone]);
  const needsVoen = form.sellerType !== "individual";
  const maximumBirthDate = useMemo(() => dateYearsAgo(18), []);

  useEffect(() => {
    if (user && !submittedEmail) navigate({ to: "/become-seller", replace: true });
  }, [navigate, submittedEmail, user]);

  useEffect(() => {
    void supabase
      .from("system_settings")
      .select("acquisition_source_enabled,acquisition_source_required,seller_phone_otp_required")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const settings = data as {
          acquisition_source_enabled?: boolean;
          acquisition_source_required?: boolean;
          seller_phone_otp_required?: boolean;
        } | null;
        setAcquisitionEnabled(settings?.acquisition_source_enabled ?? true);
        setAcquisitionRequired(settings?.acquisition_source_required ?? true);
        setPhoneOtpRequired(settings?.seller_phone_otp_required ?? true);
      });
  }, []);

  const update = <K extends keyof SellerRegistrationForm>(
    key: K,
    value: SellerRegistrationForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const validateStep = (index: number) => {
    if (index === 0) {
      if (form.firstName.trim().length < 2) return "Adınızı daxil edin";
      if (form.lastName.trim().length < 2) return "Soyadınızı daxil edin";
      if (form.fatherName.trim().length < 2) return "Ata adını daxil edin";
      if (!form.dateOfBirth || form.dateOfBirth > maximumBirthDate) {
        return "Qeydiyyat üçün minimum yaş 18-dir";
      }
      if (!isValidE164Phone(normalizedPhone)) {
        return "Telefon nömrəsini ölkə kodu ilə düzgün daxil edin";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return "Düzgün e-poçt ünvanı daxil edin";
      }
      if (
        form.password.length < 8
        || !/[a-z]/.test(form.password)
        || !/[A-Z]/.test(form.password)
        || !/\d/.test(form.password)
      ) {
        return "Şifrə ən azı 8 simvol, böyük və kiçik hərf, həmçinin rəqəm içərməlidir";
      }
      if (form.password !== form.passwordConfirm) return "Şifrələr eyni deyil";
    }

    if (index === 1) {
      if (!/^[A-Z0-9]{7}$/.test(form.finCode)) {
        return "FİN kodu 7 hərf və rəqəmdən ibarət olmalıdır";
      }
      if (!/^[A-Z0-9]{5,20}$/.test(form.identityDocumentNumber)) {
        return "Şəxsiyyət vəsiqəsinin seriya və nömrəsini düzgün daxil edin";
      }
      if (form.residentialAddress.trim().length < 10) return "Tam yaşayış ünvanını daxil edin";
    }

    if (index === 2) {
      if (form.shopName.trim().length < 2) return "Satıcı və ya mağaza adını daxil edin";
      if (needsVoen && !/^\d{10}$/.test(form.voen.replace(/\D/g, ""))) {
        return "Sahibkar və şirkətlər üçün VÖEN 10 rəqəmdən ibarət olmalıdır";
      }
      if (acquisitionEnabled && acquisitionRequired && !form.acquisitionSource) {
        return "Bizi necə tanıdığınızı seçin";
      }
      if (
        acquisitionEnabled
        && ACQUISITION_DETAIL_SOURCES.has(form.acquisitionSource as AcquisitionSource)
        && !form.acquisitionDetail.trim()
      ) {
        return "Kim tərəfindən cəlb olunduğunuzu qeyd edin";
      }
    }

    if (index === 3) {
      if (!form.termsAccepted) return "İstifadəçi şərtlərini qəbul edin";
      if (!form.privacyAccepted) return "Məxfilik siyasətini qəbul edin";
      if (!form.sellerAgreementAccepted) return "Satıcı müqaviləsini qəbul edin";
    }
    return null;
  };

  const next = () => {
    const message = validateStep(step);
    if (message) {
      toast.error(message);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    for (let index = 0; index < 4; index += 1) {
      const message = validateStep(index);
      if (message) {
        setStep(index);
        toast.error(message);
        return;
      }
    }

    setBusy(true);
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/become-seller?start_payment=1`,
        data: {
          account_role: "buyer",
          onboarding_portal: "seller",
          registration_version: "seller_wizard_v1",
          full_name: fullName,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          father_name: form.fatherName.trim(),
          date_of_birth: form.dateOfBirth,
          phone: normalizedPhone,
          fin_code: form.finCode,
          identity_document_number: form.identityDocumentNumber,
          residential_address: form.residentialAddress.trim(),
          shop_name: form.shopName.trim(),
          seller_type: form.sellerType,
          voen: needsVoen ? form.voen.replace(/\D/g, "") : undefined,
          referral_code: referralCode?.trim().toUpperCase() || undefined,
          acquisition_source:
            acquisitionEnabled && form.acquisitionSource ? form.acquisitionSource : undefined,
          acquisition_detail:
            acquisitionEnabled && form.acquisitionDetail.trim()
              ? form.acquisitionDetail.trim()
              : undefined,
          terms_accepted: true,
          privacy_accepted: true,
          seller_agreement_accepted: true,
          agreements_accepted_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    if (!data.session) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setSubmittedEmail(form.email.trim().toLowerCase());
      setBusy(false);
      toast.success("Təsdiq linki e-poçt ünvanınıza göndərildi");
      return;
    }

    setBusy(false);
    navigate({ to: "/become-seller", search: { start_payment: "1" } as never });
  };

  if (submittedEmail) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-12">
        <div className="rounded-3xl border border-border bg-card p-7 text-center shadow-card md:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-black md:text-3xl">E-poçtunuzu təsdiqləyin</h1>
          <p className="mt-3 text-muted-foreground">
            Təsdiq linkini <strong className="text-foreground">{submittedEmail}</strong> ünvanına
            göndərdik. Linki açdıqdan sonra {phoneOtpRequired ? "telefon SMS kodu və " : ""}
            ödəniş mərhələsi görünəcək.
          </p>
          <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-left text-sm">
            <div className="flex items-center gap-2 font-bold">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Növbəti addımlar
            </div>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-muted-foreground">
              <li>E-poçtdakı EG Shop təsdiq linkini açın.</li>
              {phoneOtpRequired && (
                <li>Telefonunuza göndərilən 6 rəqəmli SMS kodunu daxil edin.</li>
              )}
              <li>Qeydiyyat ödənişini tamamlayın.</li>
            </ol>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Məktub görünmürsə Spam və Promotions qovluqlarını da yoxlayın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 rounded-3xl bg-gradient-brand p-6 text-primary-foreground shadow-elegant md:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/15 p-3"><Store className="h-8 w-8" /></div>
          <div>
            <div className="text-sm font-semibold opacity-80">EG Shop · Satıcı portalı</div>
            <h1 className="text-2xl font-black md:text-4xl">Satıcı qeydiyyatı</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm opacity-90 md:text-base">
          Məlumatlarınızı mərhələli şəkildə daxil edin. Hər addımdan sonra məlumatlar
          yoxlanılır və yalnız tamamlandıqda növbəti mərhələyə keçilir.
        </p>
      </div>

      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex min-w-[680px] items-center">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = index === step;
            const complete = index < step;
            return (
              <div key={item.title} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => { if (index <= step) setStep(index); }}
                  className="group flex min-w-[105px] flex-col items-center gap-2 text-center"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  }`}>
                    {complete ? <BadgeCheck className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </span>
                  <span className={`text-xs font-bold ${
                    active || complete ? "text-foreground" : "text-muted-foreground"
                  }`}>{item.short}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 ${complete ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-8">
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            Addım {step + 1} / {STEPS.length}
          </div>
          <h2 className="mt-1 text-xl font-black md:text-2xl">{STEPS[step].title}</h2>
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Ad *</label>
                <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)}
                  autoComplete="given-name" maxLength={80} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Soyad *</label>
                <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)}
                  autoComplete="family-name" maxLength={80} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ata adı *</label>
                <input value={form.fatherName} onChange={(e) => update("fatherName", e.target.value)}
                  maxLength={80} className={inputClass} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Doğum tarixi *</label>
                <input type="date" value={form.dateOfBirth} max={maximumBirthDate}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  autoComplete="bday" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Telefon nömrəsi *</label>
                <div className="mt-1">
                  <PhoneNumberField value={form.phone}
                    onChange={(value) => update("phone", value)} required />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {phoneOtpRequired
                    ? "E-poçt təsdiqindən sonra bu nömrəyə SMS kodu göndəriləcək."
                    : "Telefon nömrəsi qeydiyyat və sifariş əlaqəsi üçün istifadə ediləcək."}
                </p>
              </div>
            </div>
            <div>
              <label className={labelClass}>E-poçt ünvanı *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                autoComplete="email" maxLength={255} className={inputClass} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Şifrə *</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password}
                    onChange={(e) => update("password", e.target.value)} autoComplete="new-password"
                    maxLength={72} className={`${inputClass} pr-11`} />
                  <button type="button" aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-4 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Şifrəni təsdiqlə *</label>
                <input type={showPassword ? "text" : "password"} value={form.passwordConfirm}
                  onChange={(e) => update("passwordConfirm", e.target.value)}
                  autoComplete="new-password" maxLength={72} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 simvol; böyük və kiçik hərf, həmçinin ən azı bir rəqəm.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" /> Məlumatların qorunması
              </div>
              <p className="mt-1 text-muted-foreground">
                FİN və vəsiqə məlumatları açıq profildə göstərilmir. Yalnız hesab yoxlaması,
                müqavilə və qanuni tələblər üçün qorunan satıcı müraciətində saxlanılır.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>FİN kodu *</label>
                <input value={form.finCode}
                  onChange={(e) => update("finCode", normalizeIdentityNumber(e.target.value).slice(0, 7))}
                  autoCapitalize="characters" maxLength={7} placeholder="7 simvol"
                  className={`${inputClass} uppercase tracking-widest`} />
              </div>
              <div>
                <label className={labelClass}>Şəxsiyyət vəsiqəsinin seriya və nömrəsi *</label>
                <input value={form.identityDocumentNumber}
                  onChange={(e) => update("identityDocumentNumber", normalizeIdentityNumber(e.target.value))}
                  autoCapitalize="characters" maxLength={20} placeholder="Məsələn: AA1234567"
                  className={`${inputClass} uppercase`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Yaşayış ünvanı *</label>
              <textarea value={form.residentialAddress}
                onChange={(e) => update("residentialAddress", e.target.value)}
                autoComplete="street-address" maxLength={300} rows={3}
                placeholder="Şəhər/rayon, küçə, bina və mənzil"
                className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 outline-none transition focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Satıcı adı (Mağaza adı) *</label>
              <input value={form.shopName} onChange={(e) => update("shopName", e.target.value)}
                maxLength={100} placeholder="Müştərilərin görəcəyi mağaza adı"
                className={inputClass} />
            </div>
            <fieldset>
              <legend className={labelClass}>Satıcı növü *</legend>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {SELLER_TYPES.map((item) => (
                  <label key={item.value} className={`cursor-pointer rounded-2xl border p-4 transition ${
                    form.sellerType === item.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}>
                    <input type="radio" name="seller-type" value={item.value}
                      checked={form.sellerType === item.value}
                      onChange={() => update("sellerType", item.value)} className="sr-only" />
                    <Building2 className="mb-2 h-5 w-5 text-primary" />
                    <div className="font-bold">{item.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                  </label>
                ))}
              </div>
            </fieldset>
            {needsVoen && (
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <label className={labelClass}>VÖEN *</label>
                <input value={form.voen}
                  onChange={(e) => update("voen", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric" maxLength={10} placeholder="10 rəqəm" className={inputClass} />
                <p className="mt-1 text-xs text-muted-foreground">
                  VÖEN yalnız fərdi sahibkar və hüquqi şəxslər üçün məcburidir.
                </p>
              </div>
            )}
            <AcquisitionSourceFields source={form.acquisitionSource}
              detail={form.acquisitionDetail} enabled={acquisitionEnabled}
              required={acquisitionRequired}
              onSourceChange={(value) => update("acquisitionSource", value)}
              onDetailChange={(value) => update("acquisitionDetail", value)} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Qeydiyyatı tamamlamaq üçün aşağıdakı sənədləri oxuyub ayrıca təsdiqləyin.
            </p>
            {[
              { key: "termsAccepted" as const, label: "İstifadəçi şərtlərini qəbul edirəm.",
                href: "https://egshop.az/terms", link: "Şərtləri oxu" },
              { key: "privacyAccepted" as const, label: "Məxfilik siyasəti ilə razıyam.",
                href: "https://egshop.az/privacy", link: "Siyasəti oxu" },
              { key: "sellerAgreementAccepted" as const, label: "Satıcı müqaviləsini qəbul edirəm.",
                href: "https://egshop.az/terms", link: "Müqaviləni oxu" },
            ].map((item) => (
              <label key={item.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                form[item.key] ? "border-primary bg-primary/5" : "border-border"
              }`}>
                <input type="checkbox" checked={form[item.key]}
                  onChange={(e) => update(item.key, e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-input accent-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.label}</span>
                  <a href={item.href} target="_blank" rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block text-sm font-semibold text-primary hover:underline">
                    {item.link}
                  </a>
                </span>
              </label>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5">
              <h3 className="font-black">Məlumatları yoxlayın</h3>
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                <div><dt className="text-muted-foreground">Ad, soyad, ata adı</dt>
                  <dd className="font-semibold">{form.firstName} {form.lastName} {form.fatherName}</dd></div>
                <div><dt className="text-muted-foreground">Doğum tarixi</dt>
                  <dd className="font-semibold">{form.dateOfBirth}</dd></div>
                <div><dt className="text-muted-foreground">Telefon</dt>
                  <dd className="font-semibold">{normalizedPhone}</dd></div>
                <div><dt className="text-muted-foreground">E-poçt</dt>
                  <dd className="font-semibold">{form.email}</dd></div>
                <div><dt className="text-muted-foreground">Mağaza</dt>
                  <dd className="font-semibold">{form.shopName}</dd></div>
                <div><dt className="text-muted-foreground">Satıcı növü</dt>
                  <dd className="font-semibold">
                    {SELLER_TYPES.find((item) => item.value === form.sellerType)?.label}
                  </dd></div>
              </dl>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 font-black">
                <ShieldCheck className="h-5 w-5 text-primary" /> Təhlükəsiz təsdiqləmə ardıcıllığı
              </div>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>1. EG Shop təsdiq linki e-poçt ünvanınıza göndəriləcək.</li>
                {phoneOtpRequired ? (
                  <>
                    <li>2. Linki açdıqdan sonra telefonunuza SMS OTP kodu göndəriləcək.</li>
                    <li>3. Telefon təsdiqindən sonra qeydiyyat ödənişinə keçəcəksiniz.</li>
                  </>
                ) : (
                  <li>2. Linki açdıqdan sonra qeydiyyat ödənişinə keçəcəksiniz.</li>
                )}
              </ol>
            </div>
            <button type="button" onClick={submit} disabled={busy}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MailCheck className="h-5 w-5" />}
              {busy ? "Hesab yaradılır..." : "Qeydiyyatı tamamla və e-poçtu təsdiqlə"}
            </button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
          <button type="button" onClick={back} disabled={step === 0 || busy}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 font-semibold disabled:invisible">
            <ChevronLeft className="h-4 w-4" /> Geri
          </button>
          {step < STEPS.length - 1 && (
            <button type="button" onClick={next} disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90">
              Davam et <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Artıq hesabınız var?{" "}
        <a href="https://seller.egshop.az/login" className="font-bold text-primary hover:underline">
          Daxil olun
        </a>
      </p>
    </div>
  );
}

