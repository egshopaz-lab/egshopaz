import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { toast } from "sonner";
import { ShoppingBag, Store, Building2, Eye, EyeOff, Shield } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import egLogo from "@/assets/eg-logo.png";
import { AZ_CITIES } from "@/lib/azCities";
import { AcquisitionSourceFields } from "@/components/AcquisitionSourceFields";
import { ACQUISITION_DETAIL_SOURCES, type AcquisitionSource } from "@/lib/acquisitionSources";

const authSearchSchema = z.object({
  role: z.enum(["buyer", "seller", "pvz", "admin"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: "Giriş / Qeydiyyat — EG Shop" }] }),
  component: AuthPage,
});

export type RoleTab = "buyer" | "seller" | "pvz" | "admin";
export type AuthMode = "login" | "signup";

const TERMS_TEXT: Record<Exclude<RoleTab, "admin">, { title: string; body: string }> = {
  buyer: {
    title: "Müştəri istifadəçi razılaşması",
    body: `EG Shop platformasından istifadə etməklə Siz aşağıdakı şərtləri qeyd-şərtsiz qəbul edirsiniz:

1. ELZAN SHOP YALNIZ TEXNOLOJİ VASİTƏÇİ PLATFORMADIR. Məhsulları EG Shop satmır — satışı müstəqil satıcılar həyata keçirir. Məhsulun keyfiyyəti, orijinallığı, təsvirə uyğunluğu, çatdırılma müddəti və qarantiyasına görə tam məsuliyyət SATICIYA aiddir.
2. Şəxsi məlumatlarınız (ad, telefon, ünvan) yalnız sifariş və çatdırılma məqsədilə istifadə olunur.
3. Saxta hesab, saxta sifariş, ödənişdən imtina (kart fırıldaqçılığı), başqa istifadəçiləri narahat etmək və ya platformanı sui-istifadə etmək QƏTİYYƏN qadağandır və hesabın dərhal bağlanmasına, hüquqi orqanlara müraciət olunmasına səbəb olur.
4. Qadağan olunmuş malların (narkotik, silah, partlayıcı, saxta sənəd, oğurluq mal, müəllif hüquqlarını pozan kontrafakt, qanunla qadağan olunmuş hər hansı məhsul) sifarişi qətiyyən qadağandır. Belə hallarda məsuliyyət tam müştəri/satıcının üzərinə düşür.
5. Bonus, endirim, promo-kod və qiymətlər platforma tərəfindən istənilən vaxt birtərəfli qaydada dəyişdirilə bilər.
6. Mübahisə yarandıqda EG Shop könüllü vasitəçi rolunu oynaya bilər, lakin son qərar və kompensasiya öhdəliyi satıcıya aiddir. EG Shop heç bir halda zərərə görə birbaşa cavabdeh deyil.
7. Çatdırılma zamanı yolda baş verən zədə, itki, gecikmə, hava şəraiti, fors-major hallar — EG Shop-un məsuliyyətindən kənardır.
8. Bu razılaşma Azərbaycan Respublikası qanunvericiliyinə uyğun tənzimlənir; mübahisələr Bakı şəhəri məhkəmələrinin müstəsna yurisdiksiyasındadır.

Qeydiyyatdan keçməklə Siz yuxarıdakı şərtləri tam oxuduğunuzu, başa düşdüyünüzü və qeyd-şərtsiz qəbul etdiyinizi təsdiqləyirsiniz.`,
  },
  seller: {
    title: "Satıcı razılaşması",
    body: `EG Shop-da satıcı kimi qeydiyyatdan keçməklə Siz aşağıdakı öhdəlikləri TAM və QEYD-ŞƏRTSİZ qəbul edirsiniz:

1. SATIŞIN BÜTÜN HÜQUQİ MƏSULİYYƏTİ SATICIYA AİDDİR. EG Shop yalnız texnoloji platforma və ödəniş/çatdırılma vasitəçisidir. Satılan məhsulun keyfiyyəti, orijinallığı, qanuniliyi, sertifikatları, qarantiyası, vergi öhdəlikləri və istehlakçı hüquqlarına dair bütün iddialar üçün yeganə cavabdeh tərəf SATICIDIR.
2. QADAĞAN OLUNMUŞ MALLARIN SATIŞI QƏTİYYƏN QADAĞANDIR: narkotik və psixotrop maddələr, silah/sursat/partlayıcı, saxta pul və sənədlər, oğurluq mal, kontrafakt (saxta brend), reseptlə buraxılan dərmanlar, insan orqanları, vəhşi heyvan, pornoqrafik məhsullar, AR qanunvericiliyi ilə qadağan olunmuş istənilən digər mal. Belə malın aşkarlanması halında: hesab dərhal bağlanır, vəsait dondurulur və məlumat hüquq-mühafizə orqanlarına ötürülür. Bütün cinayət və mülki məsuliyyət SATICININ üzərindədir.
3. Satıcı məhsulun orijinal, qanuni, təsvirə tam uyğun, sertifikatlı (tələb olunarsa) olduğuna ZƏMANƏT verir. Yanlış məlumat verilməsi fırıldaqçılıq sayılır.
4. Sifariş qəbul olunduqdan sonra 48 saat ərzində satıcı paketi göndərməyə borcludur. Vaxtında göndərilməyən sifarişlərə görə cərimə tətbiq oluna bilər.
5. Yolda zədələnmə, itki, yanlış qablaşdırma, keyfiyyətsiz məhsul, geri qaytarma — bütün xərclər və kompensasiya SATICININ üzərinə düşür. EG Shop bu xərclərə görə cavabdeh deyil.
6. Müştəri şikayəti və geri ödəniş halında məbləğ avtomatik olaraq satıcının balansından tutulur. Satıcı bunu əvvəlcədən qəbul edir.
7. Platformanın komissiyası (cari: 10%) hər satışdan tutulur. Komissiya, tariflər və qaydalar EG Shop tərəfindən birtərəfli dəyişdirilə bilər.
8. Vergi öhdəlikləri (gəlir vergisi, ƏDV, sosial ödənişlər) tam SATICIYA aiddir. EG Shop vergi agenti deyil.
9. VÖEN/şəxsiyyət vəsiqəsi məlumatları yoxlama, mübahisə və qanuni tələblər üçün saxlanılır və zərurət yarandıqda dövlət orqanlarına təqdim olunur.
10. Müştəri ilə kobud davranış, qiymət manipulyasiyası, saxta rəy yazmaq, platformadan kənar əlaqə təklif etmək — hesabın bağlanmasına səbəb olur, ödənilməmiş vəsait dondurulur.
11. Mübahisə yarandıqda EG Shop adminin qərarı son və icbaridir. Satıcı bu qərara qeyd-şərtsiz tabe olur.
12. EG Shop heç bir halda dolayı zərər, mənfəət itkisi, reputasiya zərəri və ya üçüncü tərəf iddialarına görə cavabdeh deyil. Maksimum məsuliyyət hüdudu — son 30 günün komissiya gəliri ilə məhdudlaşır.
13. Bu razılaşma Azərbaycan Respublikası qanunvericiliyinə tabedir; bütün mübahisələr Bakı şəhəri məhkəmələrində həll olunur.

Qeydiyyatdan keçməklə bu şərtləri tam, qeyd-şərtsiz və geri dönülməz şəkildə qəbul edirsiniz.`,
  },
  pvz: {
    title: "PVZ (çatdırılma nöqtəsi) işçi razılaşması",
    body: `EG Shop PVZ işçisi kimi qeydiyyatdan keçməklə Siz aşağıdakı qaydaları TAM və QEYD-ŞƏRTSİZ qəbul edirsiniz:

1. Paketləri qəbul etmək və müştəriyə YALNIZ doğru kod/QR yoxlamasından sonra təhvil vermək. Yanlış təhvilə görə tam maddi məsuliyyət PVZ işçisinin üzərindədir.
2. PVZ işçisi paketin məzmununu yoxlamır və satıcının məhsulun qanuniliyinə görə cavabdehliyini öz üzərinə götürmür. Şübhəli (narkotik, silah, qadağan olunmuş mal) paketləri dərhal admin və hüquq-mühafizə orqanlarına bildirməyə borcludur.
3. PVZ-nin iş saatlarına dəqiq riayət etmək. İşə çıxmama və ya gecikmə cərimə ilə nəticələnə bilər.
4. Müştəri ilə hörmətlə davranmaq; kobud davranış, müştəri ilə mübahisə, rüşvət tələbi — dərhal işdən azad olunmaya səbəb olur.
5. Paketin saxlanma müddətində zədələnməsi, itməsi, oğurlanması halında — maddi məsuliyyət birbaşa PVZ işçisinin və/və ya nöqtə sahibinin üzərinə düşür. EG Shop bu zərərə görə cavabdeh deyil.
6. Şəxsi və müştəri məlumatlarının məxfiliyini qorumaq. Məlumat sızması cinayət məsuliyyəti yaradır.
7. PVZ nöqtəsinin avadanlıqlarına (skaner, terminal, rəflər) tam maddi məsuliyyət daşıyırsınız.
8. EG Shop bu razılaşmanı istənilən vaxt birtərəfli ləğv edə bilər. Ödənilməmiş haqq son hesablama dövrü əsasında ödənilir.
9. Bu razılaşma Azərbaycan Respublikası qanunvericiliyinə tabedir; mübahisələr Bakı şəhəri məhkəmələrində həll olunur.

Qeydiyyatdan keçməklə bu qaydalara qeyd-şərtsiz əməl etməyə razılıq verirsiniz.`,
  },
};

function AuthPage() {
  const search = Route.useSearch();
  const role = search.role && ["buyer", "seller", "pvz", "admin"].includes(search.role)
    ? search.role
    : "buyer";
  return <PortalAuthForm fixedRole={role} referralCode={search.ref} />;
}

export function PortalAuthForm({
  fixedRole,
  fixedMode,
  referralCode: initialReferralCode,
  portalLabel,
}: {
  fixedRole?: RoleTab;
  fixedMode?: AuthMode;
  referralCode?: string;
  portalLabel?: string;
}) {
  const { user, refreshRoles } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>(fixedMode ?? "login");
  const lockedRole = fixedRole ?? null;
  const validLocked: RoleTab | null = lockedRole && ["buyer","seller","pvz","admin"].includes(lockedRole) ? lockedRole : null;
  const [role, setRole] = useState<RoleTab>(validLocked ?? "buyer");
  useEffect(() => {
    if (validLocked === "admin" || fixedMode === "login") setMode("login");
    else if (fixedMode === "signup") setMode("signup");
  }, [fixedMode, validLocked]);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(() => initialReferralCode ?? "");
  const [agree, setAgree] = useState(false);
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [acquisitionDetail, setAcquisitionDetail] = useState("");
  const [acquisitionEnabled, setAcquisitionEnabled] = useState(true);
  const [acquisitionRequired, setAcquisitionRequired] = useState(true);

  // seller
  const [shopName, setShopName] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [voen, setVoen] = useState("");

  // pvz
  const [pvzList, setPvzList] = useState<{ id: string; name: string; city: string }[]>([]);
  const [pickupPointId, setPickupPointId] = useState<string>("");
  const [position, setPosition] = useState("operator");
  const [newPvzName, setNewPvzName] = useState("");
  const [newPvzCity, setNewPvzCity] = useState("");
  const [newPvzAddress, setNewPvzAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    void supabase.from("system_settings")
      .select("acquisition_source_enabled,acquisition_source_required")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const settings = data as { acquisition_source_enabled?: boolean; acquisition_source_required?: boolean } | null;
        setAcquisitionEnabled(settings?.acquisition_source_enabled ?? true);
        setAcquisitionRequired(settings?.acquisition_source_required ?? true);
      });
  }, []);
  useEffect(() => {
    if (role !== "pvz") return;
    supabase.from("pickup_points").select("id,name,city").eq("is_active", true).order("city")
      .then(({ data }) => setPvzList(data ?? []));
  }, [role]);

  useEffect(() => {
    if (!user || fixedMode !== "signup") return;
    if (fixedRole === "seller") {
      navigate({ to: "/become-seller", replace: true });
      return;
    }
    if (fixedRole !== "pvz") return;

    const metadata = user.user_metadata ?? {};
    if (metadata.onboarding_portal !== "pvz") return;
    const args: Record<string, string> = {
      full_name: String(metadata.full_name ?? user.email ?? "PVZ istifadəçisi"),
      phone: String(metadata.phone ?? ""),
      position: String(metadata.position ?? "operator"),
    };
    if (metadata.pickup_point_id) args.pickup_point_id = String(metadata.pickup_point_id);
    else {
      args.new_pvz_name = String(metadata.new_pvz_name ?? "");
      args.new_pvz_city = String(metadata.new_pvz_city ?? "");
      args.new_pvz_address = String(metadata.new_pvz_address ?? "");
    }
    void supabase.functions.invoke("pvz-registration", { body: args }).then(async ({ error }) => {
      if (error) {
        toast.error("PVZ qeydiyyatı tamamlana bilmədi: " + error.message);
        return;
      }
      await refreshRoles();
      navigate({ to: "/pvz", replace: true });
    });
  }, [fixedMode, fixedRole, navigate, refreshRoles, user]);

  if (!mounted) {
    return <div className="container mx-auto px-4 py-10 max-w-lg"><div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card h-96 animate-pulse" /></div>;
  }

  const sendReset = async () => {
    const v = z.string().trim().email("Yanlış e-poçt").safeParse(forgotEmail);
    if (!v.success) { toast.error(v.error.issues[0].message); return; }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bərpa linki e-poçtunuza göndərildi");
    setForgotOpen(false);
    setForgotEmail("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailV = z.string().trim().email("Yanlış e-poçt").max(255).safeParse(email);
    if (!emailV.success) { toast.error(emailV.error.issues[0].message); return; }
    const passV = z.string().min(6, "Şifrə minimum 6 simvol").max(72).safeParse(password);
    if (!passV.success) { toast.error(passV.error.issues[0].message); return; }

    if (mode === "login") {
      setBusy(true);
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !signInData.user) { setBusy(false); toast.error("E-poçt və ya şifrə yanlışdır"); return; }

      // Rol uyğunluğunu yoxla — hər rol yalnız öz panelinə daxil ola bilər
      const { data: rolesData } = await supabase
        .from("user_roles").select("role").eq("user_id", signInData.user.id);
      const roles = (rolesData ?? []).map((r) => r.role as string);

      if (role === "buyer" && (roles.includes("seller") || roles.includes("pvz"))) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab müştəri deyil. Satıcı və ya PVZ PUNKT seçimini istifadə edin.");
        return;
      }
      if (role === "pvz" && !roles.includes("pvz")) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab PVZ PUNKT işçisi kimi qeydiyyatdan keçməyib.");
        return;
      }
      if (role === "admin" && !roles.includes("admin")) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab admin deyil.");
        return;
      }

      setBusy(false);
      toast.success("Xoş gəldiniz!");
      const dest = role === "seller"
        ? (roles.includes("seller") ? "/seller" : "/become-seller")
        : role === "pvz" ? "/pvz"
        : role === "admin" ? "/admin"
        : "/";
      navigate({ to: dest });
      return;
    }

    // signup validations
    if (!agree) { toast.error("Müqavilə şərtlərini qəbul etməlisiniz"); return; }
    if (name.trim().length < 2) { toast.error("Ad daxil edin"); return; }
    if (phone.trim().length < 7) { toast.error("Telefon nömrəsi daxil edin"); return; }

    const normalizedVoen = voen.replace(/\D/g, "");
    if (role === "seller") {
      if (shopName.trim().length < 2) { toast.error("Mağaza adı daxil edin"); return; }
      if (!/^\d{10}$/.test(normalizedVoen)) {
        toast.error("VÖEN 10 rəqəmdən ibarət olmalıdır");
        return;
      }
    }
    if (role === "pvz") {
      if (!pickupPointId) {
        // creating a new PVZ PUNKT — require all fields
        if (newPvzName.trim().length < 2) { toast.error("PVZ PUNKT adını daxil edin"); return; }
        if (newPvzCity.trim().length < 2) { toast.error("Şəhəri daxil edin"); return; }
        if (newPvzAddress.trim().length < 5) { toast.error("PVZ PUNKT-un tam ünvanını daxil edin"); return; }
      }
    }
    if (acquisitionEnabled && (role === "seller" || role === "pvz")) {
      if (acquisitionRequired && !acquisitionSource) {
        toast.error("Sizi haradan tanıdığımızı seçin");
        return;
      }
      if (
        ACQUISITION_DETAIL_SOURCES.has(acquisitionSource as AcquisitionSource)
        && !acquisitionDetail.trim()
      ) {
        toast.error("Kim tərəfindən cəlb olunduğunuzu qeyd edin");
        return;
      }
    }

    setBusy(true);
    const signupMetadata = {
      // Authorization is never assigned from user-editable metadata. Every new
      // account starts as a customer; paid/RPC flows grant operational roles.
      account_role: "buyer",
      onboarding_portal: role,
      full_name: name.trim(),
      phone: phone.trim(),
      referral_code: referralCode.trim().toUpperCase() || undefined,
      acquisition_source: acquisitionEnabled && acquisitionSource ? acquisitionSource : undefined,
      acquisition_detail: acquisitionEnabled && acquisitionDetail.trim() ? acquisitionDetail.trim() : undefined,
      ...(role === "seller" ? {
        shop_name: shopName.trim(),
        shop_city: shopCity.trim(),
        voen: normalizedVoen,
      } : {}),
      ...(role === "pvz" ? {
        position,
        pickup_point_id: pickupPointId || undefined,
        new_pvz_name: pickupPointId ? undefined : newPvzName.trim(),
        new_pvz_city: pickupPointId ? undefined : newPvzCity.trim(),
        new_pvz_address: pickupPointId ? undefined : newPvzAddress.trim(),
      } : {}),
    };
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/${role === "seller" ? "become-seller" : role === "pvz" ? "register" : ""}`,
        data: signupMetadata,
      },
    });
    if (error) { setBusy(false); toast.error(error.message); return; }

    // ensure session available for RPC
    if (!data.session) {
      // try sign-in (works when auto-confirm is on)
      await supabase.auth.signInWithPassword({ email, password }).catch(() => {});
    }

    if (role === "seller") {
      toast.success(data.session
        ? "Hesab yaradıldı. Satıcı müraciətini və 20 AZN ödənişi tamamlayın."
        : "Hesab yaradıldı. E-poçtunuzu təsdiqləyib satıcı müraciətini tamamlayın.");
      setBusy(false);
      if (data.session) navigate({ to: "/become-seller" });
      return;
    }

    if (role === "pvz") {
      const rpcArgs: Record<string, string> = {
        full_name: name.trim(),
        phone: phone.trim(),
        position,
      };
      if (pickupPointId) {
        rpcArgs.pickup_point_id = pickupPointId;
      } else {
        rpcArgs.new_pvz_name = newPvzName.trim();
        rpcArgs.new_pvz_city = newPvzCity.trim();
        rpcArgs.new_pvz_address = newPvzAddress.trim();
      }
      const { error: e3 } = await supabase.functions.invoke("pvz-registration", { body: rpcArgs });
      if (e3) { setBusy(false); toast.error(e3.message); return; }
      toast.success("PVZ PUNKT qeydiyyatı tamamlandı");
      setBusy(false);
      navigate({ to: "/pvz" });
      return;
    }

    // buyer
    setBusy(false);
    toast.success("Qeydiyyat uğurla tamamlandı");
    navigate({ to: "/" });
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
        <div className="flex justify-center mb-4">
          <img src={egLogo} alt="EG Shop logo" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30 shadow-lg bg-white" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1 text-center">{mode === "login" ? "Giriş" : "Qeydiyyat"}</h1>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          {portalLabel ?? "Hesab növünü seçin"}
        </p>

        <div className="mb-5 grid grid-cols-4 gap-2">
          {([
            { key: "buyer", label: "Müştəri", Icon: ShoppingBag },
            { key: "seller", label: "Satıcı", Icon: Store },
            { key: "pvz", label: "PVZ PUNKT", Icon: Building2 },
            { key: "admin", label: "Admin", Icon: Shield },
          ] as const)
            .filter(({ key }) => !validLocked || key === validLocked)
            .map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              disabled={!!validLocked}
              onClick={() => { setRole(key); if (key === "admin") setMode("login"); }}
              className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-3 text-[11px] font-bold transition ${validLocked ? "col-span-4" : ""} ${
                role === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-tight text-center">{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={role === "pvz" ? "Tam ad (Soyad Ad)" : "Ad Soyad"}
                maxLength={100} className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefon (məs. +994551234567)" maxLength={20} className={inputCls} />
            </>
          )}

          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-poçt" maxLength={255} autoComplete="email" className={inputCls} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrə (minimum 6 simvol)" maxLength={72}
              autoComplete={mode === "login" ? "current-password" : "new-password"} className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Şifrəni gizlə" : "Şifrəni göstər"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mode === "signup" && (role === "seller" || role === "pvz") && (
            <AcquisitionSourceFields
              source={acquisitionSource}
              detail={acquisitionDetail}
              enabled={acquisitionEnabled}
              required={acquisitionRequired}
              onSourceChange={setAcquisitionSource}
              onDetailChange={setAcquisitionDetail}
            />
          )}
          {mode === "signup" && role === "seller" && (
            <div className="space-y-3">
              <input value={shopName} onChange={(e) => setShopName(e.target.value)}
                placeholder="Mağaza adı" maxLength={100} className={inputCls} required />
              <div>
                <input
                  value={voen}
                  onChange={(e) => setVoen(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="VÖEN (10 rəqəm)"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  minLength={10}
                  maxLength={10}
                  autoComplete="off"
                  aria-describedby="voen-help"
                  className={inputCls}
                  required
                />
                <p id="voen-help" className="mt-1 text-xs text-muted-foreground">
                  Satıcı hesabının təsdiqi üçün 10 rəqəmli VÖEN məcburidir.
                </p>
              </div>
            </div>
          )}

          {mode === "signup" && role === "pvz" && (
            <>
              <div>
                <label className="text-xs font-semibold text-primary mb-1 block">PVZ PUNKT seçimi</label>
                <select
                  value={pickupPointId}
                  onChange={(e) => setPickupPointId(e.target.value)}
                  className={`${inputCls} ${!pickupPointId ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-semibold text-primary" : ""}`}
                >
                  <option value="">+ Yeni PVZ PUNKT yarat</option>
                  {pvzList.map((p) => (
                    <option key={p.id} value={p.id}>{p.city} — {p.name}</option>
                  ))}
                </select>
                {!pickupPointId && (
                  <p className="text-[11px] text-primary mt-1 font-medium">
                    ✓ Yeni PVZ PUNKT yaradılır — məlumatları aşağıda doldurun
                  </p>
                )}
              </div>

              {!pickupPointId && (
                <div className="space-y-2 p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
                  <div className="text-xs font-bold text-primary">Yeni PVZ PUNKT məlumatları</div>
                  <input value={newPvzName} onChange={(e) => setNewPvzName(e.target.value)}
                    placeholder="PVZ PUNKT adı (məs. Mərkəz-1)" maxLength={80} className={inputCls} />
                  <select value={newPvzCity} onChange={(e) => setNewPvzCity(e.target.value)} className={inputCls}>
                    <option value="">Şəhər seçin</option>
                    {AZ_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <input value={newPvzAddress} onChange={(e) => setNewPvzAddress(e.target.value)}
                    placeholder="Tam ünvan (küçə, bina, mənzil)" maxLength={200} className={inputCls} />
                </div>
              )}

              <select value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls}>
                <option value="operator">Operator</option>
                <option value="manager">Menecer</option>
                <option value="courier">Kuryer</option>
              </select>
            </>
          )}

          {mode === "signup" && role !== "admin" && (
            <label className="flex items-start gap-2 text-sm text-muted-foreground pt-1">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary" />
              <span>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary underline underline-offset-2 hover:opacity-80">
                      {TERMS_TEXT[role as Exclude<RoleTab, "admin">].title}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>{TERMS_TEXT[role as Exclude<RoleTab, "admin">].title}</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <p className="text-sm whitespace-pre-line leading-relaxed">{TERMS_TEXT[role as Exclude<RoleTab, "admin">].body}</p>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                {" "}— oxudum və qəbul edirəm.
              </span>
            </label>
          )}

          <button type="submit" disabled={busy}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
            {busy ? "..." : mode === "login" ? "Daxil ol" : (
              role === "seller" ? "Satıcı kimi qeydiyyat" : role === "pvz" ? "PVZ PUNKT qeydiyyatı" : "Qeydiyyat"
            )}
          </button>
        </form>

        {mode === "login" && (
          <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
            className="mt-3 w-full text-sm text-primary hover:underline">
            Şifrəmi unutdum
          </button>
        )}

        {role !== "admin" && !fixedMode && (
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-primary">
            {mode === "login" ? "Hesabınız yoxdur? Qeydiyyat" : "Artıq hesabınız var? Daxil olun"}
          </button>
        )}
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Şifrəni bərpa et</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            E-poçtunuzu daxil edin — bərpa linki göndəriləcək. Müştəri, satıcı və PVZ işçiləri üçün eyni qaydada işləyir.
          </p>
          <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="E-poçt" maxLength={255}
            className="w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={sendReset} disabled={forgotBusy}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
            {forgotBusy ? "..." : "Bərpa linkini göndər"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
