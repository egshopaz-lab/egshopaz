import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus, Check, Edit3, Layers3, Megaphone, PackagePlus,
  Plus, Power, Settings2, Store, Trash2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { toast } from "sonner";

type LooseClient = { from: (table: string) => any };
const db = supabase as unknown as LooseClient;

interface AdPackage {
  id: string;
  name: string;
  tier: string;
  price: number;
  duration_days: number;
  color: string;
  is_active: boolean;
  sort_order: number;
}

interface ServiceType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  base_price: number;
  default_duration_days: number;
  default_usage_limit: number;
  display_rules: Record<string, unknown>;
  priority: number;
  settings: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

interface PackageService {
  id?: string;
  package_id: string;
  service_type_id: string;
  is_active: boolean;
  activation_price: number;
  duration_days: number;
  usage_limit: number;
  priority: number;
  display_rules: Record<string, unknown>;
  settings: Record<string, unknown>;
}

interface Seller {
  id: string;
  full_name: string | null;
  shop_name: string | null;
}

interface Assignment {
  id: string;
  seller_id: string;
  package_id: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  source: string;
  admin_note: string | null;
  ad_packages?: { id: string; name: string; color: string } | null;
}

type ViewKey = "packages" | "services" | "assignments";

const inputClass = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
const labelClass = "block text-xs font-bold text-muted-foreground mb-1";

function parseObject(value: string, label: string) {
  try {
    const parsed = JSON.parse(value || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label} dÃ¼zgÃ¼n JSON obyekti olmalÄ±dÄ±r`);
  }
}

function json(value: Record<string, unknown>) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function AdminAdvertisingPackages() {
  const [view, setView] = useState<ViewKey>("packages");
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [packageServices, setPackageServices] = useState<PackageService[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageDraft, setPackageDraft] = useState<AdPackage | null>(null);
  const [serviceDraft, setServiceDraft] = useState<ServiceType | null>(null);
  const [sellerId, setSellerId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [assignmentDays, setAssignmentDays] = useState(30);
  const [assignmentNote, setAssignmentNote] = useState("");

  const load = useCallback(async () => {
    const [pkg, types, links, profileRows, roleRows, subs] = await Promise.all([
      db.from("ad_packages").select("id,name,tier,price,duration_days,color,is_active,sort_order").order("sort_order"),
      db.from("ad_service_types").select("*").order("sort_order"),
      db.from("ad_package_services").select("*"),
      supabase.from("profiles").select("id,full_name,shop_name").order("shop_name"),
      supabase.from("user_roles").select("user_id").eq("role", "seller"),
      db.from("seller_subscriptions").select("id,seller_id,package_id,starts_at,ends_at,is_active,source,admin_note,ad_packages(id,name,color)").order("created_at", { ascending: false }),
    ]);
    const error = pkg.error || types.error || links.error || profileRows.error || roleRows.error || subs.error;
    if (error) toast.error(error.message);
    const sellerIds = new Set((roleRows.data ?? []).map((row: { user_id: string }) => row.user_id));
    setPackages((pkg.data ?? []) as AdPackage[]);
    setServiceTypes((types.data ?? []) as ServiceType[]);
    setPackageServices((links.data ?? []) as PackageService[]);
    setSellers(((profileRows.data ?? []) as Seller[]).filter((row) => sellerIds.has(row.id)));
    setAssignments((subs.data ?? []) as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("admin-advertising-management")
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_packages" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_service_types" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ad_package_services" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_subscriptions" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const sellerById = useMemo(() => new Map(sellers.map((seller) => [seller.id, seller])), [sellers]);

  const newPackage = () => setPackageDraft({
    id: "", name: "", tier: `custom_${Date.now()}`, price: 0,
    duration_days: 30, color: "#7c3aed", is_active: true,
    sort_order: packages.length,
  });

  const savePackage = async (draft: AdPackage, services: PackageService[]) => {
    const payload = {
      name: draft.name.trim(), tier: draft.tier.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"),
      price: Number(draft.price), duration_days: Number(draft.duration_days), color: draft.color,
      is_active: draft.is_active, sort_order: Number(draft.sort_order),
    };
    if (!payload.name || !payload.tier) { toast.error("Paket adÄ± vÉ™ kodu vacibdir"); return; }
    let savedId = draft.id;
    if (draft.id) {
      const { error } = await db.from("ad_packages").update(payload).eq("id", draft.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await db.from("ad_packages").insert({
        ...payload, banner_slots: 0, sponsored_product_slots: 0, shop_promo_slots: 0,
        features: [],
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      savedId = data.id;
    }
    const rows = services.map((service) => ({
      package_id: savedId, service_type_id: service.service_type_id,
      is_active: service.is_active, activation_price: Number(service.activation_price),
      duration_days: Number(service.duration_days), usage_limit: Number(service.usage_limit),
      priority: Number(service.priority), display_rules: service.display_rules, settings: service.settings,
    }));
    if (rows.length) {
      const { error } = await db.from("ad_package_services").upsert(rows, { onConflict: "package_id,service_type_id" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(draft.id ? "Paket yenilÉ™ndi" : "Paket yaradÄ±ldÄ±");
    setPackageDraft(null);
    await load();
  };

  const togglePackage = async (pkg: AdPackage) => {
    const { error } = await db.from("ad_packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    if (error) toast.error(error.message); else toast.success(!pkg.is_active ? "Paket aktiv edildi" : "Paket deaktiv edildi");
  };

  const deletePackage = async (pkg: AdPackage) => {
    if (!confirm(`${pkg.name} paketi silinsin? Aktiv tÉ™yinat varsa silinmÉ™yÉ™cÉ™k.`)) return;
    const { error } = await db.from("ad_packages").delete().eq("id", pkg.id);
    if (error) toast.error(error.message); else toast.success("Paket silindi");
  };

  const saveServiceType = async (draft: ServiceType) => {
    const payload = {
      slug: draft.slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"), name: draft.name.trim(),
      description: draft.description?.trim() || null, base_price: Number(draft.base_price),
      default_duration_days: Number(draft.default_duration_days), default_usage_limit: Number(draft.default_usage_limit),
      display_rules: draft.display_rules, priority: Number(draft.priority), settings: draft.settings,
      is_active: draft.is_active, sort_order: Number(draft.sort_order),
    };
    if (!payload.slug || !payload.name) { toast.error("Funksiya adÄ± vÉ™ kodu vacibdir"); return; }
    const query = draft.id
      ? db.from("ad_service_types").update(payload).eq("id", draft.id)
      : db.from("ad_service_types").insert(payload);
    const { error } = await query;
    if (error) { toast.error(error.message); return; }
    toast.success(draft.id ? "Reklam funksiyasÄ± yenilÉ™ndi" : "Yeni reklam funksiyasÄ± yaradÄ±ldÄ±");
    setServiceDraft(null);
    await load();
  };

  const toggleServiceType = async (service: ServiceType) => {
    const { error } = await db.from("ad_service_types").update({ is_active: !service.is_active }).eq("id", service.id);
    if (error) toast.error(error.message);
  };

  const deleteServiceType = async (service: ServiceType) => {
    if (!confirm(`${service.name} funksiyasÄ± silinsin? PaketlÉ™rdÉ™ istifadÉ™ olunursa silinmÉ™yÉ™cÉ™k.`)) return;
    const { error } = await db.from("ad_service_types").delete().eq("id", service.id);
    if (error) toast.error(error.message); else toast.success("Reklam funksiyasÄ± silindi");
  };

  const assignPackage = async () => {
    const pkg = packages.find((item) => item.id === packageId);
    if (!sellerId || !pkg) { toast.error("SatÄ±cÄ± vÉ™ paket seÃ§in"); return; }
    const now = new Date();
    const ends = new Date(now); ends.setDate(ends.getDate() + Math.max(1, assignmentDays || pkg.duration_days));
    await db.from("seller_subscriptions").update({
      is_active: false, cancelled_at: now.toISOString(), admin_note: "Yeni admin tÉ™yinatÄ± ilÉ™ É™vÉ™zlÉ™ndi",
    }).eq("seller_id", sellerId).eq("is_active", true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await db.from("seller_subscriptions").insert({
      seller_id: sellerId, package_id: pkg.id, starts_at: now.toISOString(), ends_at: ends.toISOString(),
      payment_status: "completed", payment_method: "admin", amount: 0, is_active: true,
      source: "admin", admin_note: assignmentNote.trim() || null, assigned_by: authData.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Paket satÄ±cÄ±ya tÉ™yin edildi");
    setAssignmentNote("");
    await load();
  };

  const extendAssignment = async (assignment: Assignment, days: number) => {
    const base = Math.max(Date.now(), new Date(assignment.ends_at).getTime());
    const ends = new Date(base); ends.setDate(ends.getDate() + days);
    const { error } = await db.from("seller_subscriptions").update({ ends_at: ends.toISOString(), is_active: true, cancelled_at: null }).eq("id", assignment.id);
    if (error) toast.error(error.message); else toast.success(`Paket ${days} gÃ¼n uzadÄ±ldÄ±`);
  };

  const cancelAssignment = async (assignment: Assignment) => {
    if (!confirm("SatÄ±cÄ±nÄ±n reklam paketi lÉ™ÄŸv edilsin?")) return;
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await db.from("seller_subscriptions").update({
      is_active: false, cancelled_at: new Date().toISOString(), cancelled_by: authData.user?.id ?? null,
    }).eq("id", assignment.id);
    if (error) toast.error(error.message); else toast.success("Paket lÉ™ÄŸv edildi");
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">Reklam idarÉ™etmÉ™si yÃ¼klÉ™nir...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          PaketlÉ™ri, reklam funksiyalarÄ±nÄ± vÉ™ satÄ±cÄ± tÉ™yinatlarÄ±nÄ± bir yerdÉ™n idarÉ™ edin. DÉ™yiÅŸikliklÉ™r satÄ±cÄ± panelinÉ™ real vaxtda Ã¶tÃ¼rÃ¼lÃ¼r.
        </p>
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          <ViewButton active={view === "packages"} icon={Layers3} label="PaketlÉ™r" onClick={() => setView("packages")} />
          <ViewButton active={view === "services"} icon={Settings2} label="Funksiyalar" onClick={() => setView("services")} />
          <ViewButton active={view === "assignments"} icon={Store} label="SatÄ±cÄ±lar" onClick={() => setView("assignments")} />
        </div>
      </div>

      {view === "packages" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={newPackage} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2">
              <PackagePlus className="h-4 w-4" /> Yeni paket
            </button>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              const enabled = packageServices.filter((link) => link.package_id === pkg.id && link.is_active);
              return (
                <div key={pkg.id} className="border border-border bg-card rounded-lg overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: pkg.color }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="font-black text-lg">{pkg.name}</h3><div className="text-xs text-muted-foreground">{pkg.tier}</div></div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${pkg.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{pkg.is_active ? "Aktiv" : "Deaktiv"}</span>
                    </div>
                    <div className="mt-3 text-2xl font-black">{formatAZN(pkg.price)} <span className="text-xs font-normal text-muted-foreground">/ {pkg.duration_days} gÃ¼n</span></div>
                    <div className="mt-3 space-y-1">
                      {enabled.length === 0 && <div className="text-xs text-muted-foreground">Aktiv xidmÉ™t yoxdur</div>}
                      {enabled.map((link) => {
                        const service = serviceTypes.find((type) => type.id === link.service_type_id);
                        return <div key={link.service_type_id} className="text-xs flex justify-between gap-2"><span>{service?.name ?? "Reklam funksiyasÄ±"}</span><b>{link.usage_limit} istifadÉ™</b></div>;
                      })}
                    </div>
                  </div>
                  <div className="border-t border-border p-3 flex gap-2">
                    <button onClick={() => setPackageDraft(pkg)} title="RedaktÉ™ et" className="h-9 flex-1 rounded-md border border-border font-semibold inline-flex items-center justify-center gap-1"><Edit3 className="h-4 w-4" /> RedaktÉ™</button>
                    <button onClick={() => void togglePackage(pkg)} title={pkg.is_active ? "Deaktiv et" : "Aktiv et"} className="h-9 w-9 rounded-md border border-border inline-flex items-center justify-center"><Power className="h-4 w-4" /></button>
                    <button onClick={() => void deletePackage(pkg)} title="Sil" className="h-9 w-9 rounded-md border border-destructive/30 text-destructive inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "services" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Yeni reklam nÃ¶vÃ¼ yaradÄ±ldÄ±qda avtomatik olaraq bÃ¼tÃ¼n paket redaktorlarÄ±nda gÃ¶rÃ¼nÉ™cÉ™k.</p>
            <button onClick={() => setServiceDraft({
              id: "", slug: "", name: "", description: "", base_price: 0,
              default_duration_days: 7, default_usage_limit: 1, display_rules: {}, priority: 100,
              settings: {}, is_active: true, sort_order: serviceTypes.length,
            })} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Yeni funksiya
            </button>
          </div>
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/50 text-left"><tr><th className="p-3">Funksiya</th><th className="p-3">QiymÉ™t</th><th className="p-3">MÃ¼ddÉ™t</th><th className="p-3">Limit</th><th className="p-3">Prioritet</th><th className="p-3">Status</th><th className="p-3 text-right">ÆmÉ™liyyat</th></tr></thead>
              <tbody>{serviceTypes.map((service) => (
                <tr key={service.id} className="border-t border-border">
                  <td className="p-3"><div className="font-bold">{service.name}</div><code className="text-xs text-muted-foreground">{service.slug}</code></td>
                  <td className="p-3">{formatAZN(service.base_price)}</td><td className="p-3">{service.default_duration_days} gÃ¼n</td><td className="p-3">{service.default_usage_limit}</td><td className="p-3">{service.priority}</td>
                  <td className="p-3"><button onClick={() => void toggleServiceType(service)} className={`text-xs px-2 py-1 rounded-full font-bold ${service.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{service.is_active ? "Aktiv" : "Deaktiv"}</button></td>
                  <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setServiceDraft(service)} title="RedaktÉ™ et" className="p-2 rounded-md border border-border"><Edit3 className="h-4 w-4" /></button><button onClick={() => void deleteServiceType(service)} title="Sil" className="p-2 rounded-md border border-destructive/30 text-destructive"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {view === "assignments" && (
        <div className="space-y-5">
          <div className="border border-border rounded-lg bg-card p-4">
            <div className="font-black mb-3">SatÄ±cÄ±ya paket tÉ™yin et vÉ™ ya dÉ™yiÅŸdir</div>
            <div className="grid md:grid-cols-[1.2fr_1fr_120px_1fr_auto] gap-3 items-end">
              <Field label="SatÄ±cÄ±"><select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className={inputClass}><option value="">SatÄ±cÄ± seÃ§in</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.shop_name || seller.full_name || seller.id}</option>)}</select></Field>
              <Field label="Paket"><select value={packageId} onChange={(e) => { setPackageId(e.target.value); const p = packages.find((item) => item.id === e.target.value); if (p) setAssignmentDays(p.duration_days); }} className={inputClass}><option value="">Paket seÃ§in</option>{packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></Field>
              <Field label="MÃ¼ddÉ™t"><input type="number" min={1} value={assignmentDays} onChange={(e) => setAssignmentDays(Number(e.target.value))} className={inputClass} /></Field>
              <Field label="Admin qeydi"><input value={assignmentNote} onChange={(e) => setAssignmentNote(e.target.value)} className={inputClass} placeholder="Opsional" /></Field>
              <button onClick={() => void assignPackage()} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"><Check className="h-4 w-4" /> TÉ™yin et</button>
            </div>
          </div>
          <div className="border border-border rounded-lg overflow-x-auto bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/50 text-left"><tr><th className="p-3">SatÄ±cÄ±</th><th className="p-3">Paket</th><th className="p-3">BaÅŸlanÄŸÄ±c</th><th className="p-3">BitmÉ™</th><th className="p-3">Status</th><th className="p-3 text-right">Ä°darÉ™etmÉ™</th></tr></thead>
              <tbody>{assignments.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Paket tÉ™yinatÄ± yoxdur</td></tr> : assignments.map((assignment) => {
                const seller = sellerById.get(assignment.seller_id);
                const active = assignment.is_active && new Date(assignment.ends_at) > new Date();
                return <tr key={assignment.id} className="border-t border-border"><td className="p-3"><div className="font-bold">{seller?.shop_name || seller?.full_name || "SatÄ±cÄ±"}</div><div className="text-xs text-muted-foreground">{assignment.source}</div></td><td className="p-3 font-semibold" style={{ color: assignment.ad_packages?.color }}>{assignment.ad_packages?.name ?? "â€”"}</td><td className="p-3">{formatDate(assignment.starts_at)}</td><td className="p-3">{formatDate(assignment.ends_at)}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded-full font-bold ${active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{active ? "Aktiv" : "Bitib / lÉ™ÄŸv edilib"}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => void extendAssignment(assignment, 7)} className="h-8 px-2 rounded-md border border-border text-xs font-bold">+7 gÃ¼n</button><button onClick={() => void extendAssignment(assignment, 30)} className="h-8 px-2 rounded-md border border-border text-xs font-bold inline-flex items-center gap-1"><CalendarPlus className="h-3.5 w-3.5" /> +30 gÃ¼n</button>{active && <button onClick={() => void cancelAssignment(assignment)} className="h-8 px-2 rounded-md border border-destructive/30 text-destructive text-xs font-bold">LÉ™ÄŸv et</button>}</div></td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {packageDraft && <PackageModal pkg={packageDraft} serviceTypes={serviceTypes} current={packageServices.filter((item) => item.package_id === packageDraft.id)} onClose={() => setPackageDraft(null)} onSave={savePackage} />}
      {serviceDraft && <ServiceModal service={serviceDraft} onClose={() => setServiceDraft(null)} onSave={saveServiceType} />}
    </div>
  );
}

function ViewButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Megaphone; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`h-9 px-3 rounded-md text-sm font-bold inline-flex items-center gap-2 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

function PackageModal({ pkg, serviceTypes, current, onClose, onSave }: { pkg: AdPackage; serviceTypes: ServiceType[]; current: PackageService[]; onClose: () => void; onSave: (pkg: AdPackage, services: PackageService[]) => Promise<void> }) {
  const [draft, setDraft] = useState(pkg);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<PackageService[]>(() => serviceTypes.map((type) => current.find((item) => item.service_type_id === type.id) ?? {
    package_id: pkg.id, service_type_id: type.id, is_active: type.is_active,
    activation_price: type.base_price, duration_days: pkg.duration_days || type.default_duration_days,
    usage_limit: type.default_usage_limit, priority: type.priority,
    display_rules: type.display_rules, settings: type.settings,
  }));
  const [rulesText, setRulesText] = useState<Record<string, string>>(() => Object.fromEntries(services.map((row) => [row.service_type_id, json(row.display_rules)])));
  const [settingsText, setSettingsText] = useState<Record<string, string>>(() => Object.fromEntries(services.map((row) => [row.service_type_id, json(row.settings)])));
  const updateService = (id: string, patch: Partial<PackageService>) => setServices((rows) => rows.map((row) => row.service_type_id === id ? { ...row, ...patch } : row));
  const submit = async () => {
    try {
      const parsed = services.map((row) => ({
        ...row,
        display_rules: parseObject(rulesText[row.service_type_id], "GÃ¶stÉ™rilmÉ™ qaydalarÄ±"),
        settings: parseObject(settingsText[row.service_type_id], "ParametrlÉ™r"),
      }));
      setSaving(true);
      await onSave(draft, parsed);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return <Modal title={pkg.id ? "Reklam paketini redaktÉ™ et" : "Yeni reklam paketi"} onClose={onClose}>
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Paket adÄ±"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} /></Field>
        <Field label="Paket kodu"><input value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} className={inputClass} /></Field>
        <Field label="QiymÉ™t (â‚¼)"><input type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="Paket mÃ¼ddÉ™ti (gÃ¼n)"><input type="number" min={1} value={draft.duration_days} onChange={(e) => setDraft({ ...draft, duration_days: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="SÄ±ralama"><input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className={inputClass} /></Field>
        <Field label="RÉ™ng"><input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background p-1" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Paket aktivdir</label>
      <div><h4 className="font-black mb-3">PaketÉ™ daxil olan reklam funksiyalarÄ±</h4><div className="space-y-3">{serviceTypes.map((type) => {
        const row = services.find((item) => item.service_type_id === type.id)!;
        return <div key={type.id} className="border border-border rounded-md p-4">
          <div className="flex items-start justify-between gap-3 mb-3"><div><div className="font-bold">{type.name}</div><div className="text-xs text-muted-foreground">{type.description}</div></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={row.is_active} onChange={(e) => updateService(type.id, { is_active: e.target.checked })} /> Aktiv</label></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Aktivasiya qiymÉ™ti"><input type="number" min={0} step="0.01" value={row.activation_price} onChange={(e) => updateService(type.id, { activation_price: Number(e.target.value) })} className={inputClass} /></Field>
            <Field label="MÃ¼ddÉ™t (gÃ¼n)"><input type="number" min={1} value={row.duration_days} onChange={(e) => updateService(type.id, { duration_days: Number(e.target.value) })} className={inputClass} /></Field>
            <Field label="Ä°stifadÉ™ limiti"><input type="number" min={0} value={row.usage_limit} onChange={(e) => updateService(type.id, { usage_limit: Number(e.target.value) })} className={inputClass} /></Field>
            <Field label="Prioritet"><input type="number" value={row.priority} onChange={(e) => updateService(type.id, { priority: Number(e.target.value) })} className={inputClass} /></Field>
            <div className="sm:col-span-2"><Field label="GÃ¶stÉ™rilmÉ™ qaydalarÄ± (JSON)"><textarea rows={4} value={rulesText[type.id] ?? "{}"} onChange={(e) => setRulesText((text) => ({ ...text, [type.id]: e.target.value }))} className="w-full p-3 rounded-md border border-input bg-background text-xs font-mono" /></Field></div>
            <div className="sm:col-span-2"><Field label="DigÉ™r parametrlÉ™r (JSON)"><textarea rows={4} value={settingsText[type.id] ?? "{}"} onChange={(e) => setSettingsText((text) => ({ ...text, [type.id]: e.target.value }))} className="w-full p-3 rounded-md border border-input bg-background text-xs font-mono" /></Field></div>
          </div>
        </div>;
      })}</div></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-md border border-border font-bold">LÉ™ÄŸv et</button><button disabled={saving} onClick={() => void submit()} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"><Check className="h-4 w-4" />{saving ? "SaxlanÄ±lÄ±r..." : "Yadda saxla"}</button></div>
    </div>
  </Modal>;
}

function ServiceModal({ service, onClose, onSave }: { service: ServiceType; onClose: () => void; onSave: (service: ServiceType) => Promise<void> }) {
  const [draft, setDraft] = useState(service);
  const [rulesText, setRulesText] = useState(json(service.display_rules));
  const [settingsText, setSettingsText] = useState(json(service.settings));
  const submit = async () => {
    try { await onSave({ ...draft, display_rules: parseObject(rulesText, "GÃ¶stÉ™rilmÉ™ qaydalarÄ±"), settings: parseObject(settingsText, "ParametrlÉ™r") }); }
    catch (error) { toast.error((error as Error).message); }
  };
  return <Modal title={service.id ? "Reklam funksiyasÄ±nÄ± redaktÉ™ et" : "Yeni reklam funksiyasÄ±"} onClose={onClose}>
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Funksiya adÄ±"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} /></Field><Field label="Sistem kodu"><input value={draft.slug} disabled={Boolean(service.id)} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className={inputClass} placeholder="new_ad_type" /></Field></div>
      <Field label="TÉ™svir"><textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full p-3 rounded-md border border-input bg-background text-sm" /></Field>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><Field label="QiymÉ™t (â‚¼)"><input type="number" min={0} step="0.01" value={draft.base_price} onChange={(e) => setDraft({ ...draft, base_price: Number(e.target.value) })} className={inputClass} /></Field><Field label="MÃ¼ddÉ™t (gÃ¼n)"><input type="number" min={1} value={draft.default_duration_days} onChange={(e) => setDraft({ ...draft, default_duration_days: Number(e.target.value) })} className={inputClass} /></Field><Field label="Ä°stifadÉ™ limiti"><input type="number" min={0} value={draft.default_usage_limit} onChange={(e) => setDraft({ ...draft, default_usage_limit: Number(e.target.value) })} className={inputClass} /></Field><Field label="Prioritet"><input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} className={inputClass} /></Field></div>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="GÃ¶stÉ™rilmÉ™ qaydalarÄ± (JSON)"><textarea rows={7} value={rulesText} onChange={(e) => setRulesText(e.target.value)} className="w-full p-3 rounded-md border border-input bg-background text-xs font-mono" /></Field><Field label="DigÉ™r parametrlÉ™r (JSON)"><textarea rows={7} value={settingsText} onChange={(e) => setSettingsText(e.target.value)} className="w-full p-3 rounded-md border border-input bg-background text-xs font-mono" /></Field></div>
      <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Aktivdir</label><Field label="SÄ±ralama"><input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} className="h-9 w-28 px-3 rounded-md border border-input bg-background" /></Field></div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-md border border-border font-bold">LÉ™ÄŸv et</button><button onClick={() => void submit()} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"><Check className="h-4 w-4" /> Yadda saxla</button></div>
    </div>
  </Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onMouseDown={onClose}><div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-lg bg-card border border-border shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4 flex items-center justify-between"><h3 className="text-xl font-black">{title}</h3><button onClick={onClose} title="BaÄŸla" className="h-9 w-9 rounded-md hover:bg-secondary inline-flex items-center justify-center"><X className="h-5 w-5" /></button></div><div className="p-5">{children}</div></div></div>;
}

