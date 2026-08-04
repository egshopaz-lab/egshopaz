import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, Coins, Loader2, Plus, RefreshCw, Save, Settings2, Tag, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminAdvertisingPackages } from "@/components/AdminAdvertisingPackages";
import { formatAZN } from "@/lib/format";

type Row = Record<string, any>;
type View = "prices" | "subscriptions" | "advertising" | "reservations" | "hours" | "delivery" | "marketing";

const db = supabase as any;
const input = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary";
const tabs: { key: View; label: string; icon: typeof Coins }[] = [
  { key: "prices", label: "Modul və sistem qiymətləri", icon: Coins },
  { key: "subscriptions", label: "Abunə paketləri", icon: Tag },
  { key: "advertising", label: "Reklam və banner", icon: Settings2 },
  { key: "reservations", label: "Rezervasiya qaydaları", icon: CalendarClock },
  { key: "hours", label: "İş saatı şablonları", icon: Clock3 },
  { key: "delivery", label: "Kuryer və PVZ", icon: Truck },
  { key: "marketing", label: "Kampaniya və kuponlar", icon: Tag },
];

export function AdminCommercialSettings() {
  const [view, setView] = useState<View>("prices");
  const [loading, setLoading] = useState(true);
  const [system, setSystem] = useState<Row | null>(null);
  const [modules, setModules] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [policies, setPolicies] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [tariffs, setTariffs] = useState<Row[]>([]);
  const [campaigns, setCampaigns] = useState<Row[]>([]);
  const [coupons, setCoupons] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all([
      db.from("system_settings").select("*").limit(1).maybeSingle(),
      db.from("business_modules").select("*").order("sort_order"),
      db.from("subscription_plans").select("*").order("sort_order"),
      db.from("reservation_policies").select("*,business_modules(name_az)").order("module_code"),
      db.from("working_hours_templates").select("*").order("created_at"),
      db.from("courier_tariffs").select("*").order("created_at"),
      db.from("marketing_campaigns").select("*").order("starts_at", { ascending: false }),
      db.from("promo_codes").select("*").order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    const failed = results.find((result) => result.error);
    if (failed?.error) toast.error(`Parametrlər yüklənmədi: ${failed.error.message}`);
    setSystem(results[0].data ?? null);
    setModules(results[1].data ?? []);
    setPlans(results[2].data ?? []);
    setPolicies(results[3].data ?? []);
    setTemplates(results[4].data ?? []);
    setTariffs(results[5].data ?? []);
    setCampaigns(results[6].data ?? []);
    setCoupons(results[7].data ?? []);
  }, []);

  useEffect(() => {
    void load();
    const channel = db.channel("admin-commercial-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_settings" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "business_modules" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_policies" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_tariffs" }, () => void load())
      .subscribe();
    return () => { void db.removeChannel(channel); };
  }, [load]);

  const update = async (table: string, idField: string, id: string, patch: Row, success = "Dəyişiklik dərhal tətbiq edildi") => {
    if (!window.confirm("Bu dəyişikliyi təsdiqləyirsiniz?")) return;
    const { error } = await db.from(table).update(patch).eq(idField, id);
    if (error) return toast.error(error.message);
    toast.success(success);
    await load();
  };
  const remove = async (table: string, id: string) => {
    if (!window.confirm("Bu qeydi silmək istəyirsiniz?")) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Silindi");
    await load();
  };
  const insert = async (table: string, payload: Row) => {
    const { error } = await db.from(table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Əlavə edildi və dərhal aktivdir");
    await load();
  };

  const activeCampaigns = useMemo(() => {
    const now = Date.now();
    return campaigns.filter((item) => item.is_active && new Date(item.starts_at).getTime() <= now && new Date(item.ends_at).getTime() > now).length;
  }, [campaigns]);

  if (loading && !system) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-black">Kommersiya və əməliyyat parametrləri</h1>
            <p className="mt-1 text-sm text-muted-foreground">Buradakı dəyişikliklər Supabase-də saxlanılır və bütün panellərdə dərhal qüvvəyə minir.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold"><RefreshCw className="h-4 w-4" /> Yenilə</button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setView(key)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${view === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "prices" && system && <PricesView system={system} modules={modules} update={update} />}
      {view === "subscriptions" && <PlansView rows={plans} insert={insert} update={update} remove={remove} />}
      {view === "advertising" && <div className="space-y-5"><AdvertisingRates system={system} update={update} /><AdminAdvertisingPackages /></div>}
      {view === "reservations" && <PoliciesView rows={policies} update={update} />}
      {view === "hours" && <TemplatesView rows={templates} insert={insert} update={update} remove={remove} />}
      {view === "delivery" && system && <DeliveryView system={system} tariffs={tariffs} insert={insert} update={update} remove={remove} />}
      {view === "marketing" && <MarketingView campaigns={campaigns} coupons={coupons} activeCampaigns={activeCampaigns} insert={insert} update={update} remove={remove} />}
    </div>
  );
}

function PricesView({ system, modules, update }: { system: Row; modules: Row[]; update: Function }) {
  return <div className="space-y-5">
    <Section title="Platforma qiymətləri" description="Ümumi komissiya və Shorts aylıq haqqı">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Ümumi komissiya (%)" value={system.commission_percent} onSave={(v) => update("system_settings","id",system.id,{commission_percent:v})} />
        <NumberField label="Satıcı qeydiyyatı (₼)" value={system.seller_signup_fee} onSave={(v) => update("system_settings","id",system.id,{seller_signup_fee:v})} />
        <NumberField label="Shorts aylıq qiyməti (₼)" value={system.shorts_monthly_price} onSave={(v) => update("system_settings","id",system.id,{shorts_monthly_price:v})} />
        <NumberField label="Minimum çıxarış (₼)" value={system.min_payout} onSave={(v) => update("system_settings","id",system.id,{min_payout:v})} />
      </div>
    </Section>
    <Section title="Modul qiymətləri və komissiyalar" description="Boş komissiya sahəsi ümumi platforma komissiyasından istifadə edir">
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="text-left text-muted-foreground"><th className="p-3">Modul</th><th className="p-3">Aktivləşdirmə</th><th className="p-3">Aylıq</th><th className="p-3">Komissiya</th><th className="p-3">Status</th></tr></thead><tbody>
        {modules.map((m) => <tr key={m.code} className="border-t">
          <td className="p-3"><b>{m.name_az}</b><div className="text-xs text-muted-foreground">{m.code}</div></td>
          <td className="p-3"><InlineNumber value={m.activation_fee} suffix="₼" onSave={(v) => update("business_modules","code",m.code,{activation_fee:v})} /></td>
          <td className="p-3"><InlineNumber value={m.monthly_fee} suffix="₼" onSave={(v) => update("business_modules","code",m.code,{monthly_fee:v})} /></td>
          <td className="p-3"><InlineNumber nullable value={m.commission_percent} suffix="%" onSave={(v) => update("business_modules","code",m.code,{commission_percent:v})} /></td>
          <td className="p-3"><Toggle value={m.is_active} onChange={(v) => update("business_modules","code",m.code,{is_active:v})} /></td>
        </tr>)}
      </tbody></table></div>
    </Section>
  </div>;
}

function AdvertisingRates({ system, update }: { system: Row | null; update: Function }) {
  if (!system) return null;
  const fields = [
    ["Məhsul reklamı", "single_product_promo_price"], ["Mağaza reklamı", "single_shop_promo_price"],
    ["Banner reklamı", "single_banner_price"], ["Məhsul slotu", "slot_product_fee"],
    ["Mağaza slotu", "slot_shop_fee"], ["Banner slotu", "slot_banner_fee"],
  ];
  return <Section title="Reklam və banner tarifləri" description="Satıcı paneli bu qiymətləri system_settings cədvəlindən real vaxtda oxuyur">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label,key]) => <NumberField key={key} label={`${label} (₼)`} value={system[key]} onSave={(v) => update("system_settings","id",system.id,{[key]:v})} />)}</div>
  </Section>;
}

function PlansView({ rows, insert, update, remove }: { rows: Row[]; insert: Function; update: Function; remove: Function }) {
  const blank = { code:"",name:"",description:"",audience:"seller",price:0,duration_days:30,features:[],is_active:true,sort_order:rows.length * 10 };
  return <CrudCards title="Abunə paketləri" description="Seller, PVZ və müştəri üçün ümumi abunə planları" rows={rows} blank={blank} insert={(v:Row)=>insert("subscription_plans",v)} update={(id:string,v:Row)=>update("subscription_plans","id",id,v)} remove={(id:string)=>remove("subscription_plans",id)}
    fields={[["name","Paket adı","text"],["code","Sistem kodu","text"],["audience","Auditoriya","select:seller|pvz|customer"],["price","Qiymət (₼)","number"],["duration_days","Müddət (gün)","number"],["description","Təsvir","text"]]} />;
}

function PoliciesView({ rows, update }: { rows: Row[]; update: Function }) {
  return <Section title="Rezervasiya qaydaları" description="Qaydalar yeni rezervasiya yaradılan anda server tərəfindən məcburi tətbiq olunur">
    <div className="grid gap-4 xl:grid-cols-2">{rows.map((r) => <div key={r.module_code} className="rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between"><div><b>{r.business_modules?.name_az ?? r.module_code}</b><div className="text-xs text-muted-foreground">{r.module_code}</div></div><Toggle value={r.is_active} onChange={(v)=>update("reservation_policies","module_code",r.module_code,{is_active:v})} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Minimum öncədən (dəq.)" value={r.min_advance_minutes} onSave={(v)=>update("reservation_policies","module_code",r.module_code,{min_advance_minutes:v})} />
        <NumberField label="Maksimum öncədən (gün)" value={r.max_advance_days} onSave={(v)=>update("reservation_policies","module_code",r.module_code,{max_advance_days:v})} />
        <NumberField label="Ləğv limiti (saat)" value={r.cancel_before_hours} onSave={(v)=>update("reservation_policies","module_code",r.module_code,{cancel_before_hours:v})} />
        <NumberField label="Depozit (%)" value={r.deposit_percent} onSave={(v)=>update("reservation_policies","module_code",r.module_code,{deposit_percent:v})} />
        <NumberField label="Maksimum iştirakçı" value={r.max_party_size} onSave={(v)=>update("reservation_policies","module_code",r.module_code,{max_party_size:v})} />
        <div className="space-y-2"><ToggleLine label="Avtomatik təsdiq" value={r.auto_confirm} onChange={(v)=>update("reservation_policies","module_code",r.module_code,{auto_confirm:v})} /><ToggleLine label="Onlayn ödəniş məcburi" value={r.require_online_payment} onChange={(v)=>update("reservation_policies","module_code",r.module_code,{require_online_payment:v})} /></div>
      </div>
    </div>)}</div>
  </Section>;
}

function TemplatesView({ rows, insert, update, remove }: { rows: Row[]; insert: Function; update: Function; remove: Function }) {
  const blank = { name:"Yeni şablon",schedule:[{day:1,start:"09:00",end:"18:00"}],is_default:false,is_active:true };
  return <Section title="İş saatları şablonları" description="JSON cədvəli gün (0–6), başlanğıc və son saatdan ibarətdir">
    <button onClick={()=>void insert("working_hours_templates",blank)} className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4"/> Şablon əlavə et</button>
    <div className="grid gap-4 lg:grid-cols-2">{rows.map((r)=><div key={r.id} className="rounded-xl border p-4 space-y-3">
      <input className={input} value={r.name} onChange={(e)=>{r.name=e.target.value;}} onBlur={(e)=>void update("working_hours_templates","id",r.id,{name:e.target.value})}/>
      <textarea className="min-h-32 w-full rounded-lg border bg-background p-3 font-mono text-xs" defaultValue={JSON.stringify(r.schedule,null,2)} onBlur={(e)=>{try{void update("working_hours_templates","id",r.id,{schedule:JSON.parse(e.target.value)});}catch{toast.error("JSON formatı yanlışdır");}}}/>
      <div className="flex items-center justify-between"><ToggleLine label="Aktiv" value={r.is_active} onChange={(v)=>update("working_hours_templates","id",r.id,{is_active:v})}/><button onClick={()=>void remove("working_hours_templates",r.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></button></div>
    </div>)}</div>
  </Section>;
}

function DeliveryView({ system, tariffs, insert, update, remove }: { system: Row; tariffs: Row[]; insert: Function; update: Function; remove: Function }) {
  const blank={name:"Standart tarif",service_type:"standard",city:null,base_fee:3,per_km_fee:0.5,min_fee:3,free_delivery_over:null,is_active:true};
  return <div className="space-y-5">
    <Section title="PVZ parametrləri"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NumberField label="PVZ qeydiyyatı (₼)" value={system.pvz_registration_fee} onSave={(v)=>update("system_settings","id",system.id,{pvz_registration_fee:v})}/>
      <NumberField label="Pulsuz saxlama (gün)" value={system.pvz_free_storage_days} onSave={(v)=>update("system_settings","id",system.id,{pvz_free_storage_days:v})}/>
      <NumberField label="Saxlama / gün (₼)" value={system.storage_fee_per_day} onSave={(v)=>update("system_settings","id",system.id,{storage_fee_per_day:v})}/>
      <NumberField label="PVZ komissiyası / sifariş" value={system.pvz_commission_per_order} onSave={(v)=>update("system_settings","id",system.id,{pvz_commission_per_order:v})}/>
    </div><div className="mt-4"><ToggleLine label="PVZ sifarişləri avtomatik qəbul etsin" value={system.pvz_auto_accept} onChange={(v)=>update("system_settings","id",system.id,{pvz_auto_accept:v})}/></div></Section>
    <Section title="Kuryer tarifləri"><button onClick={()=>void insert("courier_tariffs",blank)} className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4"/> Tarif əlavə et</button>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-muted-foreground"><th className="p-3">Tarif</th><th className="p-3">Növ</th><th className="p-3">Baza</th><th className="p-3">1 km</th><th className="p-3">Minimum</th><th className="p-3">Status</th><th/></tr></thead><tbody>{tariffs.map(r=><tr key={r.id} className="border-t"><td className="p-3"><input className={input} defaultValue={r.name} onBlur={(e)=>update("courier_tariffs","id",r.id,{name:e.target.value})}/></td><td className="p-3">{r.service_type}</td><td className="p-3"><InlineNumber value={r.base_fee} suffix="₼" onSave={(v)=>update("courier_tariffs","id",r.id,{base_fee:v})}/></td><td className="p-3"><InlineNumber value={r.per_km_fee} suffix="₼" onSave={(v)=>update("courier_tariffs","id",r.id,{per_km_fee:v})}/></td><td className="p-3"><InlineNumber value={r.min_fee} suffix="₼" onSave={(v)=>update("courier_tariffs","id",r.id,{min_fee:v})}/></td><td className="p-3"><Toggle value={r.is_active} onChange={(v)=>update("courier_tariffs","id",r.id,{is_active:v})}/></td><td><button onClick={()=>remove("courier_tariffs",r.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></button></td></tr>)}</tbody></table></div>
    </Section>
  </div>;
}

function MarketingView({ campaigns, coupons, activeCampaigns, insert, update, remove }: { campaigns: Row[]; coupons: Row[]; activeCampaigns:number; insert:Function; update:Function; remove:Function }) {
  const start=new Date(); const end=new Date(Date.now()+30*86400000);
  return <div className="space-y-5">
    <Section title={`Kampaniyalar (${activeCampaigns} aktiv)`}><button onClick={()=>insert("marketing_campaigns",{name:"Yeni kampaniya",campaign_type:"discount",starts_at:start.toISOString(),ends_at:end.toISOString(),discount_percent:10,is_active:true})} className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4"/> Kampaniya yarat</button>
      <div className="grid gap-3 lg:grid-cols-2">{campaigns.map(r=><div key={r.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><input className={`${input} font-bold`} defaultValue={r.name} onBlur={(e)=>update("marketing_campaigns","id",r.id,{name:e.target.value})}/><div className="mt-2 text-xs text-muted-foreground">{new Date(r.starts_at).toLocaleString("az-AZ")} — {new Date(r.ends_at).toLocaleString("az-AZ")}</div><div className="mt-2 font-black">{r.discount_percent ? `${r.discount_percent}% endirim` : r.campaign_type}</div></div><div className="flex gap-2"><Toggle value={r.is_active} onChange={(v)=>update("marketing_campaigns","id",r.id,{is_active:v})}/><button onClick={()=>remove("marketing_campaigns",r.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></button></div></div></div>)}</div>
    </Section>
    <Section title="Kuponlar" description="Mövcud promo_codes sistemi ilə səbətdə dərhal işləyir"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="text-left text-muted-foreground"><th className="p-3">Kod</th><th className="p-3">Endirim</th><th className="p-3">Minimum</th><th className="p-3">İstifadə</th><th className="p-3">Status</th></tr></thead><tbody>{coupons.map(r=><tr key={r.id} className="border-t"><td className="p-3 font-black">{r.code}</td><td className="p-3">{r.discount_percent ? `${r.discount_percent}%` : formatAZN(r.discount_amount ?? 0)}</td><td className="p-3">{formatAZN(r.min_order ?? 0)}</td><td className="p-3">{r.used_count ?? 0}/{r.usage_limit ?? "∞"}</td><td className="p-3"><Toggle value={r.is_active} onChange={(v)=>update("promo_codes","id",r.id,{is_active:v})}/></td></tr>)}</tbody></table></div></Section>
  </div>;
}

function CrudCards({ title, description, rows, blank, fields, insert, update, remove }: any) {
  const [draft,setDraft]=useState<Row|null>(null);
  return <Section title={title} description={description}><button onClick={()=>setDraft({...blank})} className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4"/> Yeni paket</button><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((r:Row)=><div key={r.id} className="rounded-xl border p-4"><div className="flex justify-between"><div><b>{r.name}</b><div className="text-xs text-muted-foreground">{r.code} · {r.audience}</div></div><Toggle value={r.is_active} onChange={(v:boolean)=>update(r.id,{is_active:v})}/></div><div className="mt-4 text-2xl font-black">{formatAZN(r.price)} <span className="text-xs font-normal text-muted-foreground">/ {r.duration_days} gün</span></div><div className="mt-4 flex gap-2"><button onClick={()=>setDraft({...r})} className="h-9 flex-1 rounded-lg border text-sm font-bold">Redaktə</button><button onClick={()=>remove(r.id)} className="h-9 rounded-lg border px-3 text-destructive"><Trash2 className="h-4 w-4"/></button></div></div>)}</div>{draft&&<Editor title={title} draft={draft} fields={fields} onClose={()=>setDraft(null)} onSave={async(v:Row)=>{draft.id?await update(draft.id,v):await insert(v);setDraft(null);}}/>}</Section>;
}

function Editor({ title,draft,fields,onClose,onSave }:any) {
  const [value,setValue]=useState<Row>(draft);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onMouseDown={onClose}><div className="w-full max-w-2xl rounded-2xl bg-card p-5" onMouseDown={e=>e.stopPropagation()}><div className="flex justify-between"><h3 className="text-xl font-black">{title}</h3><button onClick={onClose}><X className="h-5 w-5"/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(([key,label,type]:string[]) => <label key={key} className="space-y-1 text-sm font-bold"><span>{label}</span>{type.startsWith("select:")?<select className={input} value={value[key]} onChange={e=>setValue({...value,[key]:e.target.value})}>{type.slice(7).split("|").map(x=><option key={x}>{x}</option>)}</select>:<input type={type} className={input} value={value[key]??""} onChange={e=>setValue({...value,[key]:type==="number"?Number(e.target.value):e.target.value})}/>}</label>)}</div><div className="mt-5 flex justify-end"><button onClick={()=>void onSave(value)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground"><Save className="h-4 w-4"/> Yadda saxla</button></div></div></div>;
}

function Section({ title,description,children }: { title:string;description?:string;children:React.ReactNode }) { return <section className="rounded-2xl border bg-card p-5"><h2 className="text-lg font-black">{title}</h2>{description&&<p className="mb-5 mt-1 text-sm text-muted-foreground">{description}</p>} {!description&&<div className="h-4"/>}{children}</section>; }
function NumberField({label,value,onSave}:{label:string;value:any;onSave:(v:number)=>void}) { return <label className="space-y-1.5 text-sm font-bold"><span>{label}</span><input className={input} type="number" min="0" step="0.01" defaultValue={Number(value??0)} onBlur={e=>onSave(Math.max(0,Number(e.target.value)||0))}/></label>; }
function InlineNumber({value,onSave,suffix,nullable=false}:{value:any;onSave:(v:number|null)=>void;suffix:string;nullable?:boolean}) { return <div className="flex items-center gap-1"><input className="h-9 w-24 rounded-lg border bg-background px-2" type="number" min="0" step="0.01" defaultValue={value??""} placeholder={nullable?"Ümumi":"0"} onBlur={e=>onSave(nullable&&e.target.value===""?null:Math.max(0,Number(e.target.value)||0))}/><span>{suffix}</span></div>; }
function Toggle({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}) { return <button type="button" onClick={()=>onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value?"bg-emerald-500":"bg-muted"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value?"left-5.5":"left-0.5"}`}/></button>; }
function ToggleLine({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}) { return <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{label}</span><Toggle value={value} onChange={onChange}/></div>; }
