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
import egLogo from "@/assets/eg-logo.svg";
import { AZ_CITIES } from "@/lib/azCities";
import { AcquisitionSourceFields } from "@/components/AcquisitionSourceFields";
import { ACQUISITION_DETAIL_SOURCES, type AcquisitionSource } from "@/lib/acquisitionSources";

const authSearchSchema = z.object({
  role: z.enum(["buyer", "seller", "pvz", "admin"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: "GiriĹź / Qeydiyyat â€” EG Shop" }] }),
  component: AuthPage,
});

export type RoleTab = "buyer" | "seller" | "pvz" | "admin";
export type AuthMode = "login" | "signup";

const TERMS_TEXT: Record<Exclude<RoleTab, "admin">, { title: string; body: string }> = {
  buyer: {
    title: "MĂĽĹźtÉ™ri istifadÉ™Ă§i razÄ±laĹźmasÄ±",
    body: `EG Shop platformasÄ±ndan istifadÉ™ etmÉ™klÉ™ Siz aĹźaÄźÄ±dakÄ± ĹźÉ™rtlÉ™ri qeyd-ĹźÉ™rtsiz qÉ™bul edirsiniz:

1. ELZAN SHOP YALNIZ TEXNOLOJÄ° VASÄ°TĆŹĂ‡Ä° PLATFORMADIR. MÉ™hsullarÄ± EG Shop satmÄ±r â€” satÄ±ĹźÄ± mĂĽstÉ™qil satÄ±cÄ±lar hÉ™yata keĂ§irir. MÉ™hsulun keyfiyyÉ™ti, orijinallÄ±ÄźÄ±, tÉ™svirÉ™ uyÄźunluÄźu, Ă§atdÄ±rÄ±lma mĂĽddÉ™ti vÉ™ qarantiyasÄ±na gĂ¶rÉ™ tam mÉ™suliyyÉ™t SATICIYA aiddir.
2. ĹžÉ™xsi mÉ™lumatlarÄ±nÄ±z (ad, telefon, ĂĽnvan) yalnÄ±z sifariĹź vÉ™ Ă§atdÄ±rÄ±lma mÉ™qsÉ™dilÉ™ istifadÉ™ olunur.
3. Saxta hesab, saxta sifariĹź, Ă¶dÉ™niĹźdÉ™n imtina (kart fÄ±rÄ±ldaqĂ§Ä±lÄ±ÄźÄ±), baĹźqa istifadÉ™Ă§ilÉ™ri narahat etmÉ™k vÉ™ ya platformanÄ± sui-istifadÉ™ etmÉ™k QĆŹTÄ°YYĆŹN qadaÄźandÄ±r vÉ™ hesabÄ±n dÉ™rhal baÄźlanmasÄ±na, hĂĽquqi orqanlara mĂĽraciÉ™t olunmasÄ±na sÉ™bÉ™b olur.
4. QadaÄźan olunmuĹź mallarÄ±n (narkotik, silah, partlayÄ±cÄ±, saxta sÉ™nÉ™d, oÄźurluq mal, mĂĽÉ™llif hĂĽquqlarÄ±nÄ± pozan kontrafakt, qanunla qadaÄźan olunmuĹź hÉ™r hansÄ± mÉ™hsul) sifariĹźi qÉ™tiyyÉ™n qadaÄźandÄ±r. BelÉ™ hallarda mÉ™suliyyÉ™t tam mĂĽĹźtÉ™ri/satÄ±cÄ±nÄ±n ĂĽzÉ™rinÉ™ dĂĽĹźĂĽr.
5. Bonus, endirim, promo-kod vÉ™ qiymÉ™tlÉ™r platforma tÉ™rÉ™findÉ™n istÉ™nilÉ™n vaxt birtÉ™rÉ™fli qaydada dÉ™yiĹźdirilÉ™ bilÉ™r.
6. MĂĽbahisÉ™ yarandÄ±qda EG Shop kĂ¶nĂĽllĂĽ vasitÉ™Ă§i rolunu oynaya bilÉ™r, lakin son qÉ™rar vÉ™ kompensasiya Ă¶hdÉ™liyi satÄ±cÄ±ya aiddir. EG Shop heĂ§ bir halda zÉ™rÉ™rÉ™ gĂ¶rÉ™ birbaĹźa cavabdeh deyil.
7. Ă‡atdÄ±rÄ±lma zamanÄ± yolda baĹź verÉ™n zÉ™dÉ™, itki, gecikmÉ™, hava ĹźÉ™raiti, fors-major hallar â€” EG Shop-un mÉ™suliyyÉ™tindÉ™n kÉ™nardÄ±r.
8. Bu razÄ±laĹźma AzÉ™rbaycan RespublikasÄ± qanunvericiliyinÉ™ uyÄźun tÉ™nzimlÉ™nir; mĂĽbahisÉ™lÉ™r BakÄ± ĹźÉ™hÉ™ri mÉ™hkÉ™mÉ™lÉ™rinin mĂĽstÉ™sna yurisdiksiyasÄ±ndadÄ±r.

Qeydiyyatdan keĂ§mÉ™klÉ™ Siz yuxarÄ±dakÄ± ĹźÉ™rtlÉ™ri tam oxuduÄźunuzu, baĹźa dĂĽĹźdĂĽyĂĽnĂĽzĂĽ vÉ™ qeyd-ĹźÉ™rtsiz qÉ™bul etdiyinizi tÉ™sdiqlÉ™yirsiniz.`,
  },
  seller: {
    title: "SatÄ±cÄ± razÄ±laĹźmasÄ±",
    body: `EG Shop-da satÄ±cÄ± kimi qeydiyyatdan keĂ§mÉ™klÉ™ Siz aĹźaÄźÄ±dakÄ± Ă¶hdÉ™liklÉ™ri TAM vÉ™ QEYD-ĹžĆŹRTSÄ°Z qÉ™bul edirsiniz:

1. SATIĹžIN BĂśTĂśN HĂśQUQÄ° MĆŹSULÄ°YYĆŹTÄ° SATICIYA AÄ°DDÄ°R. EG Shop yalnÄ±z texnoloji platforma vÉ™ Ă¶dÉ™niĹź/Ă§atdÄ±rÄ±lma vasitÉ™Ă§isidir. SatÄ±lan mÉ™hsulun keyfiyyÉ™ti, orijinallÄ±ÄźÄ±, qanuniliyi, sertifikatlarÄ±, qarantiyasÄ±, vergi Ă¶hdÉ™liklÉ™ri vÉ™ istehlakĂ§Ä± hĂĽquqlarÄ±na dair bĂĽtĂĽn iddialar ĂĽĂ§ĂĽn yeganÉ™ cavabdeh tÉ™rÉ™f SATICIDIR.
2. QADAÄžAN OLUNMUĹž MALLARIN SATIĹžI QĆŹTÄ°YYĆŹN QADAÄžANDIR: narkotik vÉ™ psixotrop maddÉ™lÉ™r, silah/sursat/partlayÄ±cÄ±, saxta pul vÉ™ sÉ™nÉ™dlÉ™r, oÄźurluq mal, kontrafakt (saxta brend), reseptlÉ™ buraxÄ±lan dÉ™rmanlar, insan orqanlarÄ±, vÉ™hĹźi heyvan, pornoqrafik mÉ™hsullar, AR qanunvericiliyi ilÉ™ qadaÄźan olunmuĹź istÉ™nilÉ™n digÉ™r mal. BelÉ™ malÄ±n aĹźkarlanmasÄ± halÄ±nda: hesab dÉ™rhal baÄźlanÄ±r, vÉ™sait dondurulur vÉ™ mÉ™lumat hĂĽquq-mĂĽhafizÉ™ orqanlarÄ±na Ă¶tĂĽrĂĽlĂĽr. BĂĽtĂĽn cinayÉ™t vÉ™ mĂĽlki mÉ™suliyyÉ™t SATICININ ĂĽzÉ™rindÉ™dir.
3. SatÄ±cÄ± mÉ™hsulun orijinal, qanuni, tÉ™svirÉ™ tam uyÄźun, sertifikatlÄ± (tÉ™lÉ™b olunarsa) olduÄźuna ZĆŹMANĆŹT verir. YanlÄ±Ĺź mÉ™lumat verilmÉ™si fÄ±rÄ±ldaqĂ§Ä±lÄ±q sayÄ±lÄ±r.
4. SifariĹź qÉ™bul olunduqdan sonra 48 saat É™rzindÉ™ satÄ±cÄ± paketi gĂ¶ndÉ™rmÉ™yÉ™ borcludur. VaxtÄ±nda gĂ¶ndÉ™rilmÉ™yÉ™n sifariĹźlÉ™rÉ™ gĂ¶rÉ™ cÉ™rimÉ™ tÉ™tbiq oluna bilÉ™r.
5. Yolda zÉ™dÉ™lÉ™nmÉ™, itki, yanlÄ±Ĺź qablaĹźdÄ±rma, keyfiyyÉ™tsiz mÉ™hsul, geri qaytarma â€” bĂĽtĂĽn xÉ™rclÉ™r vÉ™ kompensasiya SATICININ ĂĽzÉ™rinÉ™ dĂĽĹźĂĽr. EG Shop bu xÉ™rclÉ™rÉ™ gĂ¶rÉ™ cavabdeh deyil.
6. MĂĽĹźtÉ™ri ĹźikayÉ™ti vÉ™ geri Ă¶dÉ™niĹź halÄ±nda mÉ™blÉ™Äź avtomatik olaraq satÄ±cÄ±nÄ±n balansÄ±ndan tutulur. SatÄ±cÄ± bunu É™vvÉ™lcÉ™dÉ™n qÉ™bul edir.
7. PlatformanÄ±n komissiyasÄ± (cari: 10%) hÉ™r satÄ±Ĺźdan tutulur. Komissiya, tariflÉ™r vÉ™ qaydalar EG Shop tÉ™rÉ™findÉ™n birtÉ™rÉ™fli dÉ™yiĹźdirilÉ™ bilÉ™r.
8. Vergi Ă¶hdÉ™liklÉ™ri (gÉ™lir vergisi, ĆŹDV, sosial Ă¶dÉ™niĹźlÉ™r) tam SATICIYA aiddir. EG Shop vergi agenti deyil.
9. VĂ–EN/ĹźÉ™xsiyyÉ™t vÉ™siqÉ™si mÉ™lumatlarÄ± yoxlama, mĂĽbahisÉ™ vÉ™ qanuni tÉ™lÉ™blÉ™r ĂĽĂ§ĂĽn saxlanÄ±lÄ±r vÉ™ zÉ™rurÉ™t yarandÄ±qda dĂ¶vlÉ™t orqanlarÄ±na tÉ™qdim olunur.
10. MĂĽĹźtÉ™ri ilÉ™ kobud davranÄ±Ĺź, qiymÉ™t manipulyasiyasÄ±, saxta rÉ™y yazmaq, platformadan kÉ™nar É™laqÉ™ tÉ™klif etmÉ™k â€” hesabÄ±n baÄźlanmasÄ±na sÉ™bÉ™b olur, Ă¶dÉ™nilmÉ™miĹź vÉ™sait dondurulur.
11. MĂĽbahisÉ™ yarandÄ±qda EG Shop adminin qÉ™rarÄ± son vÉ™ icbaridir. SatÄ±cÄ± bu qÉ™rara qeyd-ĹźÉ™rtsiz tabe olur.
12. EG Shop heĂ§ bir halda dolayÄ± zÉ™rÉ™r, mÉ™nfÉ™É™t itkisi, reputasiya zÉ™rÉ™ri vÉ™ ya ĂĽĂ§ĂĽncĂĽ tÉ™rÉ™f iddialarÄ±na gĂ¶rÉ™ cavabdeh deyil. Maksimum mÉ™suliyyÉ™t hĂĽdudu â€” son 30 gĂĽnĂĽn komissiya gÉ™liri ilÉ™ mÉ™hdudlaĹźÄ±r.
13. Bu razÄ±laĹźma AzÉ™rbaycan RespublikasÄ± qanunvericiliyinÉ™ tabedir; bĂĽtĂĽn mĂĽbahisÉ™lÉ™r BakÄ± ĹźÉ™hÉ™ri mÉ™hkÉ™mÉ™lÉ™rindÉ™ hÉ™ll olunur.

Qeydiyyatdan keĂ§mÉ™klÉ™ bu ĹźÉ™rtlÉ™ri tam, qeyd-ĹźÉ™rtsiz vÉ™ geri dĂ¶nĂĽlmÉ™z ĹźÉ™kildÉ™ qÉ™bul edirsiniz.`,
  },
  pvz: {
    title: "PVZ (Ă§atdÄ±rÄ±lma nĂ¶qtÉ™si) iĹźĂ§i razÄ±laĹźmasÄ±",
    body: `EG Shop PVZ iĹźĂ§isi kimi qeydiyyatdan keĂ§mÉ™klÉ™ Siz aĹźaÄźÄ±dakÄ± qaydalarÄ± TAM vÉ™ QEYD-ĹžĆŹRTSÄ°Z qÉ™bul edirsiniz:

1. PaketlÉ™ri qÉ™bul etmÉ™k vÉ™ mĂĽĹźtÉ™riyÉ™ YALNIZ doÄźru kod/QR yoxlamasÄ±ndan sonra tÉ™hvil vermÉ™k. YanlÄ±Ĺź tÉ™hvilÉ™ gĂ¶rÉ™ tam maddi mÉ™suliyyÉ™t PVZ iĹźĂ§isinin ĂĽzÉ™rindÉ™dir.
2. PVZ iĹźĂ§isi paketin mÉ™zmununu yoxlamÄ±r vÉ™ satÄ±cÄ±nÄ±n mÉ™hsulun qanuniliyinÉ™ gĂ¶rÉ™ cavabdehliyini Ă¶z ĂĽzÉ™rinÉ™ gĂ¶tĂĽrmĂĽr. ĹžĂĽbhÉ™li (narkotik, silah, qadaÄźan olunmuĹź mal) paketlÉ™ri dÉ™rhal admin vÉ™ hĂĽquq-mĂĽhafizÉ™ orqanlarÄ±na bildirmÉ™yÉ™ borcludur.
3. PVZ-nin iĹź saatlarÄ±na dÉ™qiq riayÉ™t etmÉ™k. Ä°ĹźÉ™ Ă§Ä±xmama vÉ™ ya gecikmÉ™ cÉ™rimÉ™ ilÉ™ nÉ™ticÉ™lÉ™nÉ™ bilÉ™r.
4. MĂĽĹźtÉ™ri ilÉ™ hĂ¶rmÉ™tlÉ™ davranmaq; kobud davranÄ±Ĺź, mĂĽĹźtÉ™ri ilÉ™ mĂĽbahisÉ™, rĂĽĹźvÉ™t tÉ™lÉ™bi â€” dÉ™rhal iĹźdÉ™n azad olunmaya sÉ™bÉ™b olur.
5. Paketin saxlanma mĂĽddÉ™tindÉ™ zÉ™dÉ™lÉ™nmÉ™si, itmÉ™si, oÄźurlanmasÄ± halÄ±nda â€” maddi mÉ™suliyyÉ™t birbaĹźa PVZ iĹźĂ§isinin vÉ™/vÉ™ ya nĂ¶qtÉ™ sahibinin ĂĽzÉ™rinÉ™ dĂĽĹźĂĽr. EG Shop bu zÉ™rÉ™rÉ™ gĂ¶rÉ™ cavabdeh deyil.
6. ĹžÉ™xsi vÉ™ mĂĽĹźtÉ™ri mÉ™lumatlarÄ±nÄ±n mÉ™xfiliyini qorumaq. MÉ™lumat sÄ±zmasÄ± cinayÉ™t mÉ™suliyyÉ™ti yaradÄ±r.
7. PVZ nĂ¶qtÉ™sinin avadanlÄ±qlarÄ±na (skaner, terminal, rÉ™flÉ™r) tam maddi mÉ™suliyyÉ™t daĹźÄ±yÄ±rsÄ±nÄ±z.
8. EG Shop bu razÄ±laĹźmanÄ± istÉ™nilÉ™n vaxt birtÉ™rÉ™fli lÉ™Äźv edÉ™ bilÉ™r. Ă–dÉ™nilmÉ™miĹź haqq son hesablama dĂ¶vrĂĽ É™sasÄ±nda Ă¶dÉ™nilir.
9. Bu razÄ±laĹźma AzÉ™rbaycan RespublikasÄ± qanunvericiliyinÉ™ tabedir; mĂĽbahisÉ™lÉ™r BakÄ± ĹźÉ™hÉ™ri mÉ™hkÉ™mÉ™lÉ™rindÉ™ hÉ™ll olunur.

Qeydiyyatdan keĂ§mÉ™klÉ™ bu qaydalara qeyd-ĹźÉ™rtsiz É™mÉ™l etmÉ™yÉ™ razÄ±lÄ±q verirsiniz.`,
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
      full_name: String(metadata.full_name ?? user.email ?? "PVZ istifadÉ™Ă§isi"),
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
        toast.error("PVZ qeydiyyatÄ± tamamlana bilmÉ™di: " + error.message);
        return;
      }
      await refreshRoles();
      navigate({ to: "/dashboard", replace: true });
    });
  }, [fixedMode, fixedRole, navigate, refreshRoles, user]);

  if (!mounted) {
    return <div className="container mx-auto px-4 py-10 max-w-lg"><div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card h-96 animate-pulse" /></div>;
  }

  const sendReset = async () => {
    const v = z.string().trim().email("YanlÄ±Ĺź e-poĂ§t").safeParse(forgotEmail);
    if (!v.success) { toast.error(v.error.issues[0].message); return; }
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("BÉ™rpa linki e-poĂ§tunuza gĂ¶ndÉ™rildi");
    setForgotOpen(false);
    setForgotEmail("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailV = z.string().trim().email("YanlÄ±Ĺź e-poĂ§t").max(255).safeParse(email);
    if (!emailV.success) { toast.error(emailV.error.issues[0].message); return; }
    const passV = z.string().min(6, "ĹžifrÉ™ minimum 6 simvol").max(72).safeParse(password);
    if (!passV.success) { toast.error(passV.error.issues[0].message); return; }

    if (mode === "login") {
      setBusy(true);
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !signInData.user) { setBusy(false); toast.error("E-poĂ§t vÉ™ ya ĹźifrÉ™ yanlÄ±ĹźdÄ±r"); return; }

      // Rol uyÄźunluÄźunu yoxla â€” hÉ™r rol yalnÄ±z Ă¶z panelinÉ™ daxil ola bilÉ™r
      const { data: rolesData } = await supabase
        .from("user_roles").select("role").eq("user_id", signInData.user.id);
      const roles = (rolesData ?? []).map((r) => r.role as string);

      if (role === "buyer" && (roles.includes("seller") || roles.includes("pvz"))) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab mĂĽĹźtÉ™ri deyil. SatÄ±cÄ± vÉ™ ya PVZ PUNKT seĂ§imini istifadÉ™ edin.");
        return;
      }
      if (role === "pvz" && !roles.includes("pvz")) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab PVZ PUNKT iĹźĂ§isi kimi qeydiyyatdan keĂ§mÉ™yib.");
        return;
      }
      if (role === "admin" && !roles.includes("admin")) {
        await supabase.auth.signOut();
        setBusy(false);
        toast.error("Bu hesab admin deyil.");
        return;
      }

      setBusy(false);
      toast.success("XoĹź gÉ™ldiniz!");
      const dest = role === "seller"
        ? (roles.includes("seller") ? "/dashboard" : "/become-seller")
        : role === "pvz" ? "/dashboard"
        : role === "admin" ? "/dashboard"
        : "/";
      navigate({ to: dest });
      return;
    }

    // signup validations
    if (!agree) { toast.error("MĂĽqavilÉ™ ĹźÉ™rtlÉ™rini qÉ™bul etmÉ™lisiniz"); return; }
    if (name.trim().length < 2) { toast.error("Ad daxil edin"); return; }
    if (phone.trim().length < 7) { toast.error("Telefon nĂ¶mrÉ™si daxil edin"); return; }

    const normalizedVoen = voen.replace(/\D/g, "");
    if (role === "seller") {
      if (shopName.trim().length < 2) { toast.error("MaÄźaza adÄ± daxil edin"); return; }
      if (!/^\d{10}$/.test(normalizedVoen)) {
        toast.error("VĂ–EN 10 rÉ™qÉ™mdÉ™n ibarÉ™t olmalÄ±dÄ±r");
        return;
      }
    }
    if (role === "pvz") {
      if (!pickupPointId) {
        // creating a new PVZ PUNKT â€” require all fields
        if (newPvzName.trim().length < 2) { toast.error("PVZ PUNKT adÄ±nÄ± daxil edin"); return; }
        if (newPvzCity.trim().length < 2) { toast.error("ĹžÉ™hÉ™ri daxil edin"); return; }
        if (newPvzAddress.trim().length < 5) { toast.error("PVZ PUNKT-un tam ĂĽnvanÄ±nÄ± daxil edin"); return; }
      }
    }
    if (acquisitionEnabled && (role === "seller" || role === "pvz")) {
      if (acquisitionRequired && !acquisitionSource) {
        toast.error("Sizi haradan tanÄ±dÄ±ÄźÄ±mÄ±zÄ± seĂ§in");
        return;
      }
      if (
        ACQUISITION_DETAIL_SOURCES.has(acquisitionSource as AcquisitionSource)
        && !acquisitionDetail.trim()
      ) {
        toast.error("Kim tÉ™rÉ™findÉ™n cÉ™lb olunduÄźunuzu qeyd edin");
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

    // When email confirmation is enabled Supabase intentionally returns no
    // session. Clear a session that may belong to a previously signed-in
    // customer and never bypass confirmation with a password sign-in attempt.
    if (!data.session) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }

    if (role === "seller") {
      toast.success(data.session
        ? "Hesab yaradÄ±ldÄ±. SatÄ±cÄ± mĂĽraciÉ™tini vÉ™ 20 AZN Ă¶dÉ™niĹźi tamamlayÄ±n."
        : "Hesab yaradÄ±ldÄ±. E-poĂ§tunuzu tÉ™sdiqlÉ™yib satÄ±cÄ± mĂĽraciÉ™tini tamamlayÄ±n.");
      setBusy(false);
      if (data.session) navigate({ to: "/become-seller" });
      return;
    }

    if (role === "pvz") {
      if (!data.session) {
        toast.success("Hesab yaradÄ±ldÄ±. E-poĂ§tunuzu tÉ™sdiqlÉ™yib PVZ qeydiyyatÄ±nÄ± tamamlayÄ±n.");
        setBusy(false);
        return;
      }

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
      toast.success("PVZ PUNKT qeydiyyatÄ± tamamlandÄ±");
      setBusy(false);
      navigate({ to: "/dashboard" });
      return;
    }

    // buyer
    setBusy(false);
    if (!data.session) {
      toast.success("Hesab yaradÄ±ldÄ±. Daxil olmaq ĂĽĂ§ĂĽn e-poĂ§tunuzu tÉ™sdiqlÉ™yin.");
      return;
    }
    toast.success("Qeydiyyat uÄźurla tamamlandÄ±");
    navigate({ to: "/" });
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg">
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
        <div className="flex justify-center mb-4">
          <img src={egLogo} alt="EG Shop logo" className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30 shadow-lg bg-white" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1 text-center">{mode === "login" ? "GiriĹź" : "Qeydiyyat"}</h1>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          {portalLabel ?? "Hesab nĂ¶vĂĽnĂĽ seĂ§in"}
        </p>

        <div className="mb-5 grid grid-cols-4 gap-2">
          {([
            { key: "buyer", label: "MĂĽĹźtÉ™ri", Icon: ShoppingBag },
            { key: "seller", label: "SatÄ±cÄ±", Icon: Store },
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
                placeholder="Telefon (mÉ™s. +994551234567)" maxLength={20} className={inputCls} />
            </>
          )}

          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-poĂ§t" maxLength={255} autoComplete="email" className={inputCls} />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="ĹžifrÉ™ (minimum 6 simvol)" maxLength={72}
              autoComplete={mode === "login" ? "current-password" : "new-password"} className={`${inputCls} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "ĹžifrÉ™ni gizlÉ™" : "ĹžifrÉ™ni gĂ¶stÉ™r"}
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
                placeholder="MaÄźaza adÄ±" maxLength={100} className={inputCls} required />
              <div>
                <input
                  value={voen}
                  onChange={(e) => setVoen(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="VĂ–EN (10 rÉ™qÉ™m)"
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
                  SatÄ±cÄ± hesabÄ±nÄ±n tÉ™sdiqi ĂĽĂ§ĂĽn 10 rÉ™qÉ™mli VĂ–EN mÉ™cburidir.
                </p>
              </div>
            </div>
          )}

          {mode === "signup" && role === "pvz" && (
            <>
              <div>
                <label className="text-xs font-semibold text-primary mb-1 block">PVZ PUNKT seĂ§imi</label>
                <select
                  value={pickupPointId}
                  onChange={(e) => setPickupPointId(e.target.value)}
                  className={`${inputCls} ${!pickupPointId ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-semibold text-primary" : ""}`}
                >
                  <option value="">+ Yeni PVZ PUNKT yarat</option>
                  {pvzList.map((p) => (
                    <option key={p.id} value={p.id}>{p.city} â€” {p.name}</option>
                  ))}
                </select>
                {!pickupPointId && (
                  <p className="text-[11px] text-primary mt-1 font-medium">
                    âś“ Yeni PVZ PUNKT yaradÄ±lÄ±r â€” mÉ™lumatlarÄ± aĹźaÄźÄ±da doldurun
                  </p>
                )}
              </div>

              {!pickupPointId && (
                <div className="space-y-2 p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
                  <div className="text-xs font-bold text-primary">Yeni PVZ PUNKT mÉ™lumatlarÄ±</div>
                  <input value={newPvzName} onChange={(e) => setNewPvzName(e.target.value)}
                    placeholder="PVZ PUNKT adÄ± (mÉ™s. MÉ™rkÉ™z-1)" maxLength={80} className={inputCls} />
                  <select value={newPvzCity} onChange={(e) => setNewPvzCity(e.target.value)} className={inputCls}>
                    <option value="">ĹžÉ™hÉ™r seĂ§in</option>
                    {AZ_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <input value={newPvzAddress} onChange={(e) => setNewPvzAddress(e.target.value)}
                    placeholder="Tam ĂĽnvan (kĂĽĂ§É™, bina, mÉ™nzil)" maxLength={200} className={inputCls} />
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
                {" "}â€” oxudum vÉ™ qÉ™bul edirÉ™m.
              </span>
            </label>
          )}

          <button type="submit" disabled={busy}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
            {busy ? "..." : mode === "login" ? "Daxil ol" : (
              role === "seller" ? "SatÄ±cÄ± kimi qeydiyyat" : role === "pvz" ? "PVZ PUNKT qeydiyyatÄ±" : "Qeydiyyat"
            )}
          </button>
        </form>

        {mode === "login" && (
          <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
            className="mt-3 w-full text-sm text-primary hover:underline">
            ĹžifrÉ™mi unutdum
          </button>
        )}

        {role !== "admin" && !fixedMode && (
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-primary">
            {mode === "login" ? "HesabÄ±nÄ±z yoxdur? Qeydiyyat" : "ArtÄ±q hesabÄ±nÄ±z var? Daxil olun"}
          </button>
        )}
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>ĹžifrÉ™ni bÉ™rpa et</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            E-poĂ§tunuzu daxil edin â€” bÉ™rpa linki gĂ¶ndÉ™rilÉ™cÉ™k. MĂĽĹźtÉ™ri, satÄ±cÄ± vÉ™ PVZ iĹźĂ§ilÉ™ri ĂĽĂ§ĂĽn eyni qaydada iĹźlÉ™yir.
          </p>
          <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="E-poĂ§t" maxLength={255}
            className="w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={sendReset} disabled={forgotBusy}
            className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60">
            {forgotBusy ? "..." : "BÉ™rpa linkini gĂ¶ndÉ™r"}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

