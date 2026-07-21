import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle, BellRing, CheckCircle2, CreditCard, Filter, PackageCheck,
  RefreshCw, Save, Search, TicketCheck, UserRoundCog, Users, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";

type View = "overview" | "sellers" | "moderation" | "alerts" | "payments" | "users" | "support" | "admins";
type JsonRecord = Record<string, unknown>;

interface QueueStats {
  pending_products?: number; unpaid_sellers?: number; open_disputes?: number; open_tickets?: number;
  urgent_tickets?: number; failed_payments_24h?: number; pending_orders?: number;
  stock_out_products?: number; unresolved_alerts?: number;
}
interface ProductRow { id:string; title:string; seller_id:string; price:number; stock:number; is_active:boolean; moderation_status:string; moderation_reason:string|null; created_at:string }
interface AlertRow { id:string; severity:string; title:string; description:string|null; status:string; created_at:string }
interface PaymentRow { id:string; merchant_order_id:string; amount:number; currency:string; status:string; message:string|null; paid_at:string|null; created_at:string }
interface TicketRow { id:string; subject:string; category:string; status:string; priority:string; user_id:string; assigned_admin_id:string|null; internal_note:string|null; admin_reply:string|null; created_at:string }
interface AccountRow { user_id:string; email:string; full_name:string|null; shop_name:string|null; roles:string[]; account_status:string; created_at:string; seller_status?:string|null; seller_payment_status?:string|null; seller_registration_fee?:number|null; seller_paid_at?:string|null; seller_product_access_override?:boolean }
interface SavedView { id:string; name:string; section:string; filters:JsonRecord; is_default:boolean }
interface StaffRow { admin_id:string; name:string; role_key:string; permissions:string[]; is_active:boolean }

const db = supabase as any;
const primaryButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-bold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50";
const successButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const rolePresets: Record<string, string[]> = {
  super_admin: ["*"], seller_moderator: ["accounts.manage","sellers.manage"],
  product_moderator: ["products.manage"], finance: ["payments.manage","reports.view"],
  support: ["support.manage","accounts.view"], advertising: ["advertising.manage"],
  delivery: ["delivery.manage","disputes.manage"], analyst: ["reports.view"],
};

export function AdminOperationsCenter() {
  const [view,setView]=useState<View>("overview");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [queue,setQueue]=useState<QueueStats>({});
  const [products,setProducts]=useState<ProductRow[]>([]);
  const [alerts,setAlerts]=useState<AlertRow[]>([]);
  const [payments,setPayments]=useState<PaymentRow[]>([]);
  const [tickets,setTickets]=useState<TicketRow[]>([]);
  const [accounts,setAccounts]=useState<AccountRow[]>([]);
  const [savedViews,setSavedViews]=useState<SavedView[]>([]);
  const [staff,setStaff]=useState<StaffRow[]>([]);
  const [selectedProducts,setSelectedProducts]=useState<string[]>([]);
  const [selectedAccounts,setSelectedAccounts]=useState<string[]>([]);
  const [productSearch,setProductSearch]=useState("");
  const [paymentStatus,setPaymentStatus]=useState("");
  const [ticketStatus,setTicketStatus]=useState("");
  const [accountSearch,setAccountSearch]=useState("");
  const [user360,setUser360]=useState<JsonRecord|null>(null);
  const [currentUserId,setCurrentUserId]=useState<string|null>(null);
  const [permissions,setPermissions]=useState<string[]>(["*"]);

  const load=useCallback(async()=>{
    setLoading(true);
    const auth=await supabase.auth.getUser();
    setCurrentUserId(auth.data.user?.id??null);
    const [q,p,a,pay,t,acc,sv,roles,profiles,perms]=await Promise.all([
      supabase.rpc("admin_work_queue" as never),
      db.from("products").select("id,title,seller_id,price,stock,is_active,moderation_status,moderation_reason,created_at").order("created_at",{ascending:false}).limit(300),
      db.from("admin_operational_alerts").select("id,severity,title,description,status,created_at").order("created_at",{ascending:false}).limit(200),
      supabase.rpc("admin_payment_reconciliation" as never,{_status:null,_limit:300} as never),
      db.from("support_tickets").select("id,subject,category,status,priority,user_id,assigned_admin_id,internal_note,admin_reply,created_at").order("created_at",{ascending:false}).limit(300),
      supabase.rpc("admin_list_accounts" as never,{_search:null,_role:null,_status:null,_source:null,_limit:500} as never),
      auth.data.user?.id?db.from("admin_saved_views").select("*").eq("admin_id",auth.data.user.id).order("name"):Promise.resolve({data:[]}),
      db.from("user_roles").select("user_id").eq("role","admin"),
      db.from("profiles").select("id,full_name"),
      db.from("admin_staff_permissions").select("admin_id,role_key,permissions,is_active"),
    ]);
    const firstError=[q,p,a,pay,t,acc].find((result:any)=>result?.error)?.error;
    if(firstError) toast.error(firstError.message);
    setQueue((q.data??{}) as QueueStats); setProducts((p.data??[]) as ProductRow[]); setAlerts((a.data??[]) as AlertRow[]);
    setPayments((pay.data??[]) as PaymentRow[]); setTickets((t.data??[]) as TicketRow[]); setAccounts((acc.data??[]) as unknown as AccountRow[]);
    setSavedViews((sv.data??[]) as SavedView[]);
    const profileMap=new Map((profiles.data??[]).map((x:any)=>[x.id,x.full_name]));
    const permMap=new Map((perms.data??[]).map((x:any)=>[x.admin_id,x]));
    const ownPermission:any=auth.data.user?.id?permMap.get(auth.data.user.id):null;
    if(ownPermission)setPermissions(ownPermission.is_active===false?[]:(ownPermission.permissions??[]));
    setStaff((roles.data??[]).map((r:any)=>{const permission:any=permMap.get(r.user_id);return{admin_id:r.user_id,name:profileMap.get(r.user_id)??"Admin",role_key:permission?.role_key??"super_admin",permissions:permission?.permissions??["*"],is_active:permission?.is_active??true};}));
    setLoading(false);
  },[]);

  useEffect(()=>{void load();},[load]);

  const filteredProducts=useMemo(()=>products.filter(p=>p.moderation_status==="pending"&&p.title.toLowerCase().includes(productSearch.toLowerCase())),[products,productSearch]);
  const filteredPayments=useMemo(()=>payments.filter(p=>!paymentStatus||p.status===paymentStatus),[payments,paymentStatus]);
  const filteredTickets=useMemo(()=>tickets.filter(t=>!ticketStatus||t.status===ticketStatus),[tickets,ticketStatus]);
  const filteredAccounts=useMemo(()=>accounts.filter(a=>`${a.full_name??""} ${a.email} ${a.shop_name??""}`.toLowerCase().includes(accountSearch.toLowerCase())),[accounts,accountSearch]);
  const sellerQueue=useMemo(()=>accounts.filter(a=>a.seller_status||a.roles?.includes("seller")).sort((a,b)=>(a.seller_payment_status==="success"?1:0)-(b.seller_payment_status==="success"?1:0)),[accounts]);

  const bulk=async(entity:"product"|"account",ids:string[],action:string)=>{
    if(!ids.length){toast.error("Ən azı bir qeyd seçin");return;}
    const reason=action==="reject"||action==="deactivate"?prompt("Səbəb:")??"":"";
    setBusy(true);const {data,error}=await supabase.rpc("admin_bulk_operational_action" as never,{_entity:entity,_ids:ids,_action:action,_reason:reason||null} as never);setBusy(false);
    if(error){toast.error(error.message);return;} toast.success(`${(data as any)?.affected??ids.length} qeyd yeniləndi`);setSelectedProducts([]);setSelectedAccounts([]);await load();
  };
  const refreshAlerts=async()=>{setBusy(true);const {error}=await supabase.rpc("admin_refresh_operational_alerts" as never);setBusy(false);if(error)toast.error(error.message);else{toast.success("Xəbərdarlıqlar yeniləndi");await load();}};
  const updateAlert=async(id:string,status:"acknowledged"|"resolved")=>{await db.from("admin_operational_alerts").update({status,[status==="resolved"?"resolved_at":"acknowledged_at"]:new Date().toISOString(),assigned_admin_id:currentUserId}).eq("id",id);await load();};
  const openUser360=async(id:string)=>{const {data,error}=await supabase.rpc("admin_user_360" as never,{_target_id:id} as never);if(error)toast.error(error.message);else setUser360((data??{}) as JsonRecord);};
  const addNote=async(targetId:string)=>{const note=prompt("Daxili admin qeydi:");if(!note||!currentUserId)return;const {error}=await db.from("admin_internal_notes").insert({target_user_id:targetId,admin_id:currentUserId,note});if(error)toast.error(error.message);else{toast.success("Qeyd əlavə edildi");await openUser360(targetId);}};
  const takeTicket=async(id:string)=>{if(!currentUserId)return;await db.from("support_tickets").update({assigned_admin_id:currentUserId,status:"in_progress",updated_at:new Date().toISOString()}).eq("id",id);await load();};
  const updateTicket=async(id:string,patch:JsonRecord)=>{const {error}=await db.from("support_tickets").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(error)toast.error(error.message);else await load();};
  const setStaffRole=async(row:StaffRow,role_key:string)=>{const permissions=rolePresets[role_key]??[];const {error}=await supabase.rpc("admin_set_staff_role" as never,{_admin_id:row.admin_id,_role_key:role_key,_permissions:permissions} as never);if(error)toast.error(error.message);else{toast.success("Admin səlahiyyəti yeniləndi");await load();}};
  const setSellerAccess=async(row:AccountRow,allowed:boolean)=>{if(!currentUserId)return;const reason=prompt(allowed?"Məhsul yerləşdirmə icazəsinin səbəbi:":"İcazənin ləğv səbəbi:")??"";const {error}=await supabase.rpc("admin_set_seller_product_access" as never,{_admin_id:currentUserId,_target_id:row.user_id,_allowed:allowed,_reason:reason||null,_admin_email:null,_ip_address:null,_user_agent:typeof navigator!=="undefined"?navigator.userAgent:null} as never);if(error)toast.error(error.message);else{toast.success("Satıcı icazəsi yeniləndi");await load();}};
  const saveCurrentView=async()=>{if(!currentUserId)return;const name=prompt("Görünüşün adı:");if(!name)return;const filters={view,productSearch,paymentStatus,ticketStatus,accountSearch};const {error}=await db.from("admin_saved_views").insert({admin_id:currentUserId,name,section:view,filters});if(error)toast.error(error.message);else{toast.success("Filtr yadda saxlanıldı");await load();}};
  const applySavedView=(saved:SavedView)=>{const f=saved.filters as any;setView((f.view??saved.section) as View);setProductSearch(f.productSearch??"");setPaymentStatus(f.paymentStatus??"");setTicketStatus(f.ticketStatus??"");setAccountSearch(f.accountSearch??"");};

  const can=(permission:string)=>permissions.includes("*")||permissions.includes(permission);
  const tabs:[View,string][]=([
    ["overview","Gündəlik işlər"],["sellers","Satıcı təsdiq növbəsi"],["moderation","Məhsul moderasiyası"],["alerts","Xəbərdarlıqlar"],
    ["payments","Ödəniş uzlaşdırması"],["users","İstifadəçi 360"],["support","Dəstək növbəsi"],
    ["admins","Admin səlahiyyətləri"],
  ] as [View,string][]).filter(([key])=>{
    if(key==="moderation")return can("products.manage");
    if(key==="payments")return can("payments.manage");
    if(key==="users"||key==="sellers")return can("accounts.view")||can("accounts.manage");
    if(key==="support")return can("support.manage");
    if(key==="admins")return can("admins.manage");
    return true;
  });
  if(loading)return <div className="min-h-[420px] animate-pulse rounded-2xl bg-muted/30"/>;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">{tabs.map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`rounded-xl px-3 py-2 text-sm font-bold ${view===key?"bg-primary text-primary-foreground":"border bg-card hover:bg-secondary"}`}>{label}</button>)}</div>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"><Filter className="h-4 w-4 text-primary"/><span className="text-sm font-bold">Saxlanılan filtrlər:</span>{savedViews.map(s=><button key={s.id} onClick={()=>applySavedView(s)} className="rounded-lg bg-secondary px-2 py-1 text-xs">{s.name}</button>)}<button onClick={()=>void saveCurrentView()} className="ml-auto inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold"><Save className="h-3 w-3"/>Yadda saxla</button></div>

    {view==="overview"&&<Overview queue={queue} setView={setView} refresh={refreshAlerts} busy={busy}/>} 
    {view==="sellers"&&<section className="space-y-3"><Toolbar icon={Users} title="Satıcı təsdiq və ödəniş növbəsi"/><DataTable headers={["Satıcı","Ödəniş","Məbləğ","Hesab","Məhsul icazəsi","Qeydiyyat","Əməliyyat"]}>{sellerQueue.map(s=>{const paid=["success","migrated"].includes(s.seller_payment_status??"");const allowed=paid||Boolean(s.seller_product_access_override);return <tr key={s.user_id} className="border-t"><td className="p-3"><b>{s.shop_name??s.full_name??"Adsız mağaza"}</b><div className="text-xs text-muted-foreground">{s.email}</div></td><td className="p-3"><Status value={paid?"success":(s.seller_payment_status??"pending")}/></td><td className="p-3">{formatAZN(Number(s.seller_registration_fee??0))}</td><td className="p-3"><Status value={s.account_status}/></td><td className="p-3"><Status value={allowed?"active":"inactive"}/></td><td className="p-3 text-xs">{formatDate(s.created_at)}</td><td className="p-3">{!paid&&<button onClick={()=>void setSellerAccess(s,!Boolean(s.seller_product_access_override))} className={s.seller_product_access_override?dangerButton:successButton}>{s.seller_product_access_override?"İcazəni ləğv et":"Müvəqqəti icazə ver"}</button>}</td></tr>})}</DataTable></section>}
    {view==="moderation"&&<section className="space-y-3"><Toolbar icon={PackageCheck} title="Məhsul moderasiya növbəsi"><SearchBox value={productSearch} setValue={setProductSearch}/><button disabled={busy} onClick={()=>void bulk("product",selectedProducts,"approve")} className={successButton}>Seçilənləri təsdiqlə</button><button disabled={busy} onClick={()=>void bulk("product",selectedProducts,"reject")} className={dangerButton}>İmtina et</button></Toolbar><DataTable headers={["Seç","Məhsul","Satıcı","Qiymət","Stok","Tarix"]}>{filteredProducts.map(p=><tr key={p.id} className="border-t"><td className="p-3"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={e=>setSelectedProducts(e.target.checked?[...selectedProducts,p.id]:selectedProducts.filter(id=>id!==p.id))}/></td><td className="p-3 font-bold">{p.title}</td><td className="p-3 text-xs">{p.seller_id}</td><td className="p-3">{formatAZN(p.price)}</td><td className="p-3">{p.stock}</td><td className="p-3 text-xs">{formatDate(p.created_at)}</td></tr>)}</DataTable></section>}
    {view==="alerts"&&<section className="space-y-3"><Toolbar icon={BellRing} title="Ağıllı xəbərdarlıqlar"><button disabled={busy} onClick={()=>void refreshAlerts()} className={primaryButton}><RefreshCw className="h-4 w-4"/>Yenilə</button></Toolbar><div className="grid gap-3">{alerts.map(a=><div key={a.id} className={`rounded-xl border p-4 ${a.severity==="critical"?"border-destructive/50 bg-destructive/5":"bg-card"}`}><div className="flex flex-wrap items-start gap-3"><AlertTriangle className={`h-5 w-5 ${a.severity==="critical"?"text-destructive":"text-warning"}`}/><div className="flex-1"><b>{a.title}</b><p className="text-sm text-muted-foreground">{a.description}</p><span className="text-xs">{formatDate(a.created_at)} · {a.status}</span></div>{a.status==="open"&&<button onClick={()=>void updateAlert(a.id,"acknowledged")} className={secondaryButton}>Qəbul et</button>} {a.status!=="resolved"&&<button onClick={()=>void updateAlert(a.id,"resolved")} className={successButton}>Həll edildi</button>}</div></div>)}</div></section>}
    {view==="payments"&&<section className="space-y-3"><Toolbar icon={CreditCard} title="Epoint ödəniş uzlaşdırması"><select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className={fieldClass}><option value="">Bütün statuslar</option><option value="success">Uğurlu</option><option value="error">Xəta</option><option value="server_error">Server xətası</option><option value="returned">Geri qaytarılıb</option></select></Toolbar><DataTable headers={["Merchant ID","Məbləğ","Status","Uyğunluq","Tarix","Mesaj"]}>{filteredPayments.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono text-xs">{p.merchant_order_id}</td><td className="p-3 font-bold">{formatAZN(p.amount)}</td><td className="p-3"><Status value={p.status}/></td><td className="p-3">{p.status==="success"&&p.paid_at?<span className="font-bold text-emerald-600">Uyğundur</span>:<span className="font-bold text-amber-600">Yoxlanmalıdır</span>}</td><td className="p-3 text-xs">{formatDate(p.created_at)}</td><td className="p-3 text-xs">{p.message??"—"}</td></tr>)}</DataTable></section>}
    {view==="users"&&<section className="space-y-3"><Toolbar icon={Users} title="Vahid istifadəçi səhifəsi"><SearchBox value={accountSearch} setValue={setAccountSearch}/><button disabled={busy} onClick={()=>void bulk("account",selectedAccounts,"activate")} className={successButton}>Aktiv et</button><button disabled={busy} onClick={()=>void bulk("account",selectedAccounts,"deactivate")} className={dangerButton}>Passiv et</button></Toolbar><DataTable headers={["Seç","İstifadəçi","Rol","Status","Qeydiyyat","Detallar"]}>{filteredAccounts.slice(0,100).map(a=><tr key={a.user_id} className="border-t"><td className="p-3"><input type="checkbox" checked={selectedAccounts.includes(a.user_id)} onChange={e=>setSelectedAccounts(e.target.checked?[...selectedAccounts,a.user_id]:selectedAccounts.filter(id=>id!==a.user_id))}/></td><td className="p-3"><b>{a.full_name??a.shop_name??"Adsız"}</b><div className="text-xs">{a.email}</div></td><td className="p-3">{a.roles?.join(", ")}</td><td className="p-3"><Status value={a.account_status}/></td><td className="p-3 text-xs">{formatDate(a.created_at)}</td><td className="p-3"><button onClick={()=>void openUser360(a.user_id)} className={primaryButton}>360° baxış</button></td></tr>)}</DataTable>{user360&&<User360 data={user360} close={()=>setUser360(null)} addNote={addNote}/>}</section>}
    {view==="support"&&<section className="space-y-3"><Toolbar icon={TicketCheck} title="Dəstək və şikayət növbəsi"><select value={ticketStatus} onChange={e=>setTicketStatus(e.target.value)} className={fieldClass}><option value="">Bütün statuslar</option><option value="open">Yeni</option><option value="in_progress">Araşdırılır</option><option value="answered">Cavablandırılıb</option><option value="closed">Bağlanıb</option></select></Toolbar><DataTable headers={["Mövzu","Kateqoriya","Prioritet","Status","Məsul","Tarix","Əməliyyat"]}>{filteredTickets.map(t=><tr key={t.id} className="border-t"><td className="p-3 font-bold">{t.subject}</td><td className="p-3">{t.category}</td><td className="p-3"><select value={t.priority} onChange={e=>void updateTicket(t.id,{priority:e.target.value})} className={fieldClass}><option value="low">Aşağı</option><option value="normal">Normal</option><option value="high">Yüksək</option><option value="urgent">Təcili</option></select></td><td className="p-3"><Status value={t.status}/></td><td className="p-3 text-xs">{t.assigned_admin_id??"Təyin edilməyib"}</td><td className="p-3 text-xs">{formatDate(t.created_at)}</td><td className="p-3"><div className="flex min-w-max gap-1"><button onClick={()=>void takeTicket(t.id)} className={secondaryButton}>Özümə götür</button><button onClick={()=>{const reply=prompt("Cavab:",t.admin_reply??"");if(reply)void updateTicket(t.id,{admin_reply:reply,status:"answered",first_response_at:new Date().toISOString()});}} className={primaryButton}>Cavab ver</button><button onClick={()=>void updateTicket(t.id,{status:"closed",resolved_at:new Date().toISOString()})} className={successButton}>Bağla</button></div></td></tr>)}</DataTable></section>}
    {view==="admins"&&<section className="space-y-3"><Toolbar icon={UserRoundCog} title="Admin rolları və səlahiyyətləri"/><DataTable headers={["Admin","ID","Rol","Aktivlik","İcazələr"]}>{staff.map(s=><tr key={s.admin_id} className="border-t"><td className="p-3 font-bold">{s.name}</td><td className="p-3 font-mono text-xs">{s.admin_id}</td><td className="p-3"><select value={s.role_key} onChange={e=>void setStaffRole(s,e.target.value)} className={fieldClass}>{Object.keys(rolePresets).map(r=><option key={r} value={r}>{r}</option>)}</select></td><td className="p-3"><Status value={s.is_active?"active":"inactive"}/></td><td className="max-w-md p-3 text-xs">{s.permissions.join(", ")}</td></tr>)}</DataTable></section>}
  </div>;
}

function Overview({queue,setView,refresh,busy}:{queue:QueueStats;setView:(v:View)=>void;refresh:()=>Promise<void>;busy:boolean}){
  const cards:[keyof QueueStats,string,View,typeof AlertTriangle][]=[
    ["pending_products","Təsdiq gözləyən məhsullar","moderation",PackageCheck],["unpaid_sellers","Ödəniş etməyən satıcılar","sellers",Users],
    ["open_disputes","Açıq mübahisələr","overview",AlertTriangle],["open_tickets","Cavabsız müraciətlər","support",TicketCheck],
    ["failed_payments_24h","Uğursuz ödənişlər (24s)","payments",CreditCard],["stock_out_products","Stoku bitən məhsullar","moderation",PackageCheck],
    ["pending_orders","Yeni sifarişlər","overview",CheckCircle2],["unresolved_alerts","Açıq xəbərdarlıqlar","alerts",BellRing],
  ];
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Bugünkü iş növbəsi</h2><p className="text-sm text-muted-foreground">Vacib əməliyyatlar bir ekranda</p></div><button disabled={busy} onClick={()=>void refresh()} className={primaryButton}><RefreshCw className="h-4 w-4"/>Xəbərdarlıqları yoxla</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key,label,target,Icon])=><button key={key} onClick={()=>setView(target)} className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary"/><span className="text-3xl font-black">{queue[key]??0}</span></div><div className="mt-3 text-sm font-bold">{label}</div></button>)}</div></section>;
}
function Toolbar({icon:Icon,title,children}:{icon:LucideIcon;title:string;children?:ReactNode}){return <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4"><Icon className="h-6 w-6 text-primary"/><h2 className="mr-auto text-lg font-black">{title}</h2>{children}</div>}
function SearchBox({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Axtar..." className={`${fieldClass} pl-9`}/></div>}
function DataTable({headers,children}:{headers:string[];children:ReactNode}){return <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full min-w-[900px] text-sm"><thead className="bg-secondary/50"><tr>{headers.map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
function Status({value}:{value:string}){const ok=["active","success","approved","answered","resolved","closed"].includes(value);return <span className={`rounded-full px-2 py-1 text-xs font-bold ${ok?"bg-success/10 text-success":"bg-warning/10 text-warning"}`}>{value}</span>}
function User360({data,close,addNote}:{data:JsonRecord;close:()=>void;addNote:(id:string)=>Promise<void>}){const profile=(data.profile??{}) as any;return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">İstifadəçi 360°</h2><button onClick={close} className={secondaryButton}>Bağla</button></div><div className="mt-4 grid gap-3 md:grid-cols-2"><Info title="Profil" value={profile}/><Info title="Rollar" value={data.roles}/><Info title="Satıcı müraciəti" value={data.seller_application}/><Info title="Məhsullar" value={data.products}/><Info title="Sifarişlər" value={data.orders}/><Info title="Dəstək müraciətləri" value={data.tickets}/><Info title="Admin qeydləri" value={data.notes}/><Info title="Audit tarixçəsi" value={data.audit}/></div>{profile.id&&<button onClick={()=>void addNote(profile.id)} className={`${primaryButton} mt-4`}>Daxili qeyd əlavə et</button>}</div></div>}
function Info({title,value}:{title:string;value:unknown}){return <div className="rounded-xl border bg-secondary/20 p-3"><b>{title}</b><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(value,null,2)}</pre></div>}

