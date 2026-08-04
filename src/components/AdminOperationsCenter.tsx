import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle, BellRing, CheckCircle2, CreditCard, PackageCheck, RefreshCw,
  Search, TicketCheck, UserRoundCog, Users, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";

type Workspace = "operations" | "users";
type View = "overview" | "moderation" | "alerts" | "payments" | "support" | "users" | "admins";
type JsonRecord = Record<string, unknown>;

interface QueueStats {
  pending_products?: number; unpaid_sellers?: number; open_disputes?: number; open_tickets?: number;
  urgent_tickets?: number; failed_payments_24h?: number; pending_orders?: number;
  stock_out_products?: number; unresolved_alerts?: number;
}
interface ProductRow { id:string; title:string; seller_id:string; price:number; stock:number; moderation_status:string; created_at:string }
interface AlertRow { id:string; severity:string; title:string; description:string|null; status:string; created_at:string }
interface PaymentRow { id:string; merchant_order_id:string; amount:number; status:string; message:string|null; paid_at:string|null; created_at:string }
interface TicketRow { id:string; subject:string; category:string; status:string; priority:string; assigned_admin_id:string|null; admin_reply:string|null; created_at:string }
interface AccountRow {
  user_id:string; email:string; full_name:string|null; phone?:string|null; shop_name:string|null; roles:string[];
  account_status:string; created_at:string; acquisition_source?:string|null; acquisition_detail?:string|null;
  seller_status?:string|null; seller_payment_status?:string|null; seller_registration_fee?:number|null;
  seller_paid_at?:string|null; seller_product_access_override?:boolean;
}
interface StaffRow { admin_id:string; name:string; role_key:string; permissions:string[]; is_active:boolean }

const db = supabase as any;
const primaryButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-bold transition hover:bg-secondary disabled:opacity-50";
const successButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50";
const dangerButton = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50";
const fieldClass = "h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const roleLabels: Record<string,string> = {
  buyer:"Müştəri", seller:"Satıcı", pvz:"PVZ", admin:"Admin", super_admin:"Super Admin",
  seller_moderator:"Satıcı moderatoru", product_moderator:"Məhsul moderatoru", finance:"Maliyyə",
  support:"Dəstək", advertising:"Marketinq", delivery:"Çatdırılma", analyst:"Analitik",
};
const staffRoles = ["super_admin","seller_moderator","product_moderator","finance","support","advertising","delivery","analyst"];

export function AdminOperationsCenter({ workspace = "operations" }: { workspace?: Workspace }) {
  const [view,setView]=useState<View>(workspace === "users" ? "users" : "overview");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [queue,setQueue]=useState<QueueStats>({});
  const [products,setProducts]=useState<ProductRow[]>([]);
  const [alerts,setAlerts]=useState<AlertRow[]>([]);
  const [payments,setPayments]=useState<PaymentRow[]>([]);
  const [tickets,setTickets]=useState<TicketRow[]>([]);
  const [accounts,setAccounts]=useState<AccountRow[]>([]);
  const [staff,setStaff]=useState<StaffRow[]>([]);
  const [selectedProducts,setSelectedProducts]=useState<string[]>([]);
  const [selectedAccounts,setSelectedAccounts]=useState<string[]>([]);
  const [productSearch,setProductSearch]=useState("");
  const [accountSearch,setAccountSearch]=useState("");
  const [accountRole,setAccountRole]=useState("");
  const [accountStatus,setAccountStatus]=useState("");
  const [paymentStatus,setPaymentStatus]=useState("");
  const [ticketStatus,setTicketStatus]=useState("");
  const [user360,setUser360]=useState<JsonRecord|null>(null);
  const [currentUserId,setCurrentUserId]=useState<string|null>(null);
  const [permissions,setPermissions]=useState<string[]>(["*"]);
  const [newAdminId,setNewAdminId]=useState("");
  const [newAdminRole,setNewAdminRole]=useState("support");

  useEffect(()=>setView(workspace === "users" ? "users" : "overview"),[workspace]);

  const load=useCallback(async()=>{
    setLoading(true);
    const auth=await supabase.auth.getUser();
    setCurrentUserId(auth.data.user?.id??null);
    const [q,p,a,pay,t,acc,roles,profiles,perms]=await Promise.all([
      supabase.rpc("admin_work_queue" as never),
      db.from("products").select("id,title,seller_id,price,stock,moderation_status,created_at").order("created_at",{ascending:false}).limit(300),
      db.from("admin_operational_alerts").select("id,severity,title,description,status,created_at").order("created_at",{ascending:false}).limit(200),
      supabase.rpc("admin_payment_reconciliation" as never,{_status:null,_limit:300} as never),
      db.from("support_tickets").select("id,subject,category,status,priority,assigned_admin_id,admin_reply,created_at").order("created_at",{ascending:false}).limit(300),
      supabase.rpc("admin_list_accounts" as never,{_search:null,_role:null,_status:null,_source:null,_limit:500} as never),
      db.from("user_roles").select("user_id").eq("role","admin"),
      db.from("profiles").select("id,full_name"),
      db.from("admin_staff_permissions").select("admin_id,role_key,permissions,is_active"),
    ]);
    const firstError=[q,p,a,pay,t,acc].find((result:any)=>result?.error)?.error;
    if(firstError) toast.error(firstError.message);
    setQueue((q.data??{}) as QueueStats); setProducts((p.data??[]) as ProductRow[]); setAlerts((a.data??[]) as AlertRow[]);
    setPayments((pay.data??[]) as PaymentRow[]); setTickets((t.data??[]) as TicketRow[]); setAccounts((acc.data??[]) as unknown as AccountRow[]);
    const profileMap=new Map((profiles.data??[]).map((x:any)=>[x.id,x.full_name]));
    const permMap=new Map((perms.data??[]).map((x:any)=>[x.admin_id,x]));
    const own:any=auth.data.user?.id?permMap.get(auth.data.user.id):null;
    setPermissions(own?.is_active===false?[]:(own?.role_key==="super_admin"?["*"]:(own?.permissions??["*"])));
    setStaff((roles.data??[]).map((r:any)=>{const permission:any=permMap.get(r.user_id);return{admin_id:r.user_id,name:profileMap.get(r.user_id)??"Admin",role_key:permission?.role_key??"super_admin",permissions:permission?.permissions??["*"],is_active:permission?.is_active??true};}));
    setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);

  const can=(permission:string)=>permissions.includes("*")||permissions.includes(permission);
  const filteredProducts=useMemo(()=>products.filter(p=>p.moderation_status==="pending"&&p.title.toLowerCase().includes(productSearch.toLowerCase())),[products,productSearch]);
  const filteredAccounts=useMemo(()=>accounts.filter(a=>{
    const matchesSearch=`${a.full_name??""} ${a.email} ${a.phone??""} ${a.shop_name??""}`.toLowerCase().includes(accountSearch.toLowerCase());
    const matchesRole=!accountRole||a.roles?.includes(accountRole)||(accountRole==="seller"&&Boolean(a.seller_status));
    const matchesStatus=!accountStatus||a.account_status===accountStatus;
    return matchesSearch&&matchesRole&&matchesStatus;
  }),[accounts,accountRole,accountSearch,accountStatus]);
  const filteredPayments=useMemo(()=>payments.filter(p=>!paymentStatus||p.status===paymentStatus),[payments,paymentStatus]);
  const filteredTickets=useMemo(()=>tickets.filter(t=>!ticketStatus||t.status===ticketStatus),[tickets,ticketStatus]);

  const confirmAction=(message:string)=>window.confirm(`${message}\n\nBu əməliyyatı təsdiqləyirsiniz?`);
  const bulk=async(entity:"product"|"account",ids:string[],action:string)=>{
    if(!ids.length){toast.error("Ən azı bir qeyd seçin");return;}
    if(!confirmAction(`${ids.length} qeyd üçün “${action}” əməliyyatı icra ediləcək.`))return;
    const reason=action==="reject"||action==="deactivate"?prompt("Səbəb:")??"":"";
    setBusy(true);const {data,error}=await supabase.rpc("admin_bulk_operational_action" as never,{_entity:entity,_ids:ids,_action:action,_reason:reason||null} as never);setBusy(false);
    if(error){toast.error(error.message);return;} toast.success(`${(data as any)?.affected??ids.length} qeyd yeniləndi`);setSelectedProducts([]);setSelectedAccounts([]);await load();
  };
  const refreshAlerts=async()=>{setBusy(true);const {error}=await supabase.rpc("admin_refresh_operational_alerts" as never);setBusy(false);if(error)toast.error(error.message);else{toast.success("Xəbərdarlıqlar yeniləndi");await load();}};
  const updateAlert=async(id:string,status:"acknowledged"|"resolved")=>{if(!confirmAction("Xəbərdarlığın statusu dəyişdiriləcək."))return;await db.from("admin_operational_alerts").update({status,[status==="resolved"?"resolved_at":"acknowledged_at"]:new Date().toISOString(),assigned_admin_id:currentUserId}).eq("id",id);await load();};
  const openUser360=async(id:string)=>{const {data,error}=await supabase.rpc("admin_user_360" as never,{_target_id:id} as never);if(error)toast.error(error.message);else setUser360((data??{}) as JsonRecord);};
  const addNote=async(targetId:string)=>{const note=prompt("Daxili admin qeydi:");if(!note||!currentUserId)return;if(!confirmAction("Qeyd istifadəçi profilinə əlavə ediləcək."))return;const {error}=await db.from("admin_internal_notes").insert({target_user_id:targetId,admin_id:currentUserId,note});if(error)toast.error(error.message);else{toast.success("Qeyd əlavə edildi");await openUser360(targetId);}};
  const takeTicket=async(id:string)=>{if(!currentUserId||!confirmAction("Müraciət sizə təyin ediləcək."))return;await db.from("support_tickets").update({assigned_admin_id:currentUserId,status:"in_progress",updated_at:new Date().toISOString()}).eq("id",id);await load();};
  const updateTicket=async(id:string,patch:JsonRecord)=>{if(!confirmAction("Dəstək müraciəti yenilənəcək."))return;const {error}=await db.from("support_tickets").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(error)toast.error(error.message);else await load();};
  const setSellerAccess=async(row:AccountRow,allowed:boolean)=>{if(!currentUserId)return;const reason=prompt(allowed?"Ödənişsiz aktivləşdirmənin səbəbi:":"İcazənin ləğv səbəbi:",allowed?"Super Admin tərəfindən ödənişsiz aktivləşdirildi":"")??"";if(!confirmAction(allowed?"Satıcı ödəniş etmədən tam aktivləşdiriləcək.":"Satıcının ödənişsiz icazəsi ləğv ediləcək."))return;setBusy(true);const {error}=await supabase.rpc("admin_set_seller_product_access" as never,{_admin_id:currentUserId,_target_id:row.user_id,_allowed:allowed,_reason:reason||null,_admin_email:null,_ip_address:null,_user_agent:navigator.userAgent} as never);setBusy(false);if(error)toast.error(error.message);else{toast.success(allowed?"Satıcı ödənişsiz aktivləşdirildi":"Ödənişsiz icazə ləğv edildi");await load();}};
  const setAdminRole=async(targetId:string,roleKey:string|null)=>{if(!targetId)return;if(!confirmAction(roleKey?`İstifadəçiyə “${roleLabels[roleKey]??roleKey}” admin dərəcəsi veriləcək.`:"Admin səlahiyyəti ləğv ediləcək."))return;setBusy(true);const {error}=await supabase.rpc("admin_set_user_admin_role" as never,{_target_id:targetId,_role_key:roleKey} as never);setBusy(false);if(error)toast.error(error.message);else{toast.success(roleKey?"Admin dərəcəsi təyin edildi":"Admin səlahiyyəti ləğv edildi");setNewAdminId("");await load();}};

  const tabs:[View,string][]=workspace==="users"
    ? [["users","Bütün istifadəçilər"],["admins","Admin və işçilər"]]
    : [["overview","Gündəlik işlər"],["moderation","Məhsul moderasiyası"],["alerts","Xəbərdarlıqlar"],["payments","Ödəniş uzlaşdırması"],["support","Dəstək növbəsi"]];
  const visibleTabs=tabs.filter(([key])=>key==="moderation"?can("products.manage"):key==="payments"?can("payments.manage"):key==="support"?can("support.manage"):key==="admins"?can("admins.manage"):true);
  if(loading)return <div className="min-h-[420px] animate-pulse rounded-2xl bg-muted/30"/>;

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">{visibleTabs.map(([key,label])=><button key={key} onClick={()=>setView(key)} className={`rounded-xl px-3 py-2 text-sm font-bold ${view===key?"bg-primary text-primary-foreground":"border bg-card hover:bg-secondary"}`}>{label}</button>)}</div>
    {view==="overview"&&<Overview queue={queue} setView={setView} refresh={refreshAlerts} busy={busy}/>} 
    {view==="moderation"&&<section className="space-y-3"><Toolbar icon={PackageCheck} title="Məhsul moderasiya növbəsi"><SearchBox value={productSearch} setValue={setProductSearch}/><button disabled={busy} onClick={()=>void bulk("product",selectedProducts,"approve")} className={successButton}>Seçilənləri təsdiqlə</button><button disabled={busy} onClick={()=>void bulk("product",selectedProducts,"reject")} className={dangerButton}>İmtina et</button></Toolbar><DataTable headers={["Seç","Məhsul","Satıcı","Qiymət","Stok","Tarix"]}>{filteredProducts.map(p=><tr key={p.id} className="border-t"><td className="p-3"><input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={e=>setSelectedProducts(e.target.checked?[...selectedProducts,p.id]:selectedProducts.filter(id=>id!==p.id))}/></td><td className="p-3 font-bold">{p.title}</td><td className="p-3 text-xs">{p.seller_id}</td><td className="p-3">{formatAZN(p.price)}</td><td className="p-3">{p.stock}</td><td className="p-3 text-xs">{formatDate(p.created_at)}</td></tr>)}</DataTable></section>}
    {view==="alerts"&&<section className="space-y-3"><Toolbar icon={BellRing} title="Ağıllı xəbərdarlıqlar"><button disabled={busy} onClick={()=>void refreshAlerts()} className={primaryButton}><RefreshCw className="h-4 w-4"/>Yenilə</button></Toolbar><div className="grid gap-3">{alerts.map(a=><div key={a.id} className={`rounded-xl border p-4 ${a.severity==="critical"?"border-destructive/50 bg-destructive/5":"bg-card"}`}><div className="flex flex-wrap items-start gap-3"><AlertTriangle className="h-5 w-5 text-warning"/><div className="flex-1"><b>{a.title}</b><p className="text-sm text-muted-foreground">{a.description}</p><span className="text-xs">{formatDate(a.created_at)} · {a.status}</span></div>{a.status==="open"&&<button onClick={()=>void updateAlert(a.id,"acknowledged")} className={secondaryButton}>Qəbul et</button>}{a.status!=="resolved"&&<button onClick={()=>void updateAlert(a.id,"resolved")} className={successButton}>Həll edildi</button>}</div></div>)}</div></section>}
    {view==="payments"&&<section className="space-y-3"><Toolbar icon={CreditCard} title="Epoint ödəniş uzlaşdırması"><select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)} className={fieldClass}><option value="">Bütün statuslar</option><option value="success">Uğurlu</option><option value="error">Xəta</option><option value="server_error">Server xətası</option><option value="returned">Geri qaytarılıb</option></select></Toolbar><DataTable headers={["Merchant ID","Məbləğ","Status","Uyğunluq","Tarix","Mesaj"]}>{filteredPayments.map(p=><tr key={p.id} className="border-t"><td className="p-3 font-mono text-xs">{p.merchant_order_id}</td><td className="p-3 font-bold">{formatAZN(p.amount)}</td><td className="p-3"><Status value={p.status}/></td><td className="p-3">{p.status==="success"&&p.paid_at?<span className="font-bold text-emerald-600">Uyğundur</span>:<span className="font-bold text-amber-600">Yoxlanmalıdır</span>}</td><td className="p-3 text-xs">{formatDate(p.created_at)}</td><td className="p-3 text-xs">{p.message??"—"}</td></tr>)}</DataTable></section>}
    {view==="support"&&<section className="space-y-3"><Toolbar icon={TicketCheck} title="Dəstək və şikayət növbəsi"><select value={ticketStatus} onChange={e=>setTicketStatus(e.target.value)} className={fieldClass}><option value="">Bütün statuslar</option><option value="open">Yeni</option><option value="in_progress">Araşdırılır</option><option value="answered">Cavablandırılıb</option><option value="closed">Bağlanıb</option></select></Toolbar><DataTable headers={["Mövzu","Kateqoriya","Prioritet","Status","Məsul","Tarix","Əməliyyat"]}>{filteredTickets.map(t=><tr key={t.id} className="border-t"><td className="p-3 font-bold">{t.subject}</td><td className="p-3">{t.category}</td><td className="p-3">{t.priority}</td><td className="p-3"><Status value={t.status}/></td><td className="p-3 text-xs">{t.assigned_admin_id??"Təyin edilməyib"}</td><td className="p-3 text-xs">{formatDate(t.created_at)}</td><td className="p-3"><div className="flex min-w-max gap-1"><button onClick={()=>void takeTicket(t.id)} className={secondaryButton}>Özümə götür</button><button onClick={()=>{const reply=prompt("Cavab:",t.admin_reply??"");if(reply)void updateTicket(t.id,{admin_reply:reply,status:"answered",first_response_at:new Date().toISOString()});}} className={primaryButton}>Cavab ver</button></div></td></tr>)}</DataTable></section>}
    {view==="users"&&<section className="space-y-3"><Toolbar icon={Users} title="Vahid istifadəçi idarəetməsi"><SearchBox value={accountSearch} setValue={setAccountSearch}/><select value={accountRole} onChange={e=>setAccountRole(e.target.value)} className={fieldClass}><option value="">Bütün rollar</option><option value="buyer">Müştəri</option><option value="seller">Satıcı</option><option value="pvz">PVZ</option><option value="admin">Admin</option></select><select value={accountStatus} onChange={e=>setAccountStatus(e.target.value)} className={fieldClass}><option value="">Bütün statuslar</option><option value="active">Aktiv</option><option value="inactive">Passiv</option><option value="blocked">Bloklanıb</option></select><button disabled={busy} onClick={()=>void bulk("account",selectedAccounts,"activate")} className={successButton}>Aktiv et</button><button disabled={busy} onClick={()=>void bulk("account",selectedAccounts,"deactivate")} className={dangerButton}>Passiv et</button></Toolbar><div className="grid gap-3 lg:hidden">{filteredAccounts.map(a=><AccountCard key={a.user_id} row={a} selected={selectedAccounts.includes(a.user_id)} toggle={()=>setSelectedAccounts(selectedAccounts.includes(a.user_id)?selectedAccounts.filter(id=>id!==a.user_id):[...selectedAccounts,a.user_id])} open={()=>void openUser360(a.user_id)} setSellerAccess={setSellerAccess}/>)}</div><div className="hidden lg:block"><DataTable headers={["Seç","İstifadəçi","Rol","Status","Ödəniş / icazə","Qeydiyyat","Əməliyyat"]}>{filteredAccounts.map(a=><AccountTableRow key={a.user_id} row={a} selected={selectedAccounts.includes(a.user_id)} toggle={()=>setSelectedAccounts(selectedAccounts.includes(a.user_id)?selectedAccounts.filter(id=>id!==a.user_id):[...selectedAccounts,a.user_id])} open={()=>void openUser360(a.user_id)} setSellerAccess={setSellerAccess}/>)}</DataTable></div>{user360&&<User360 data={user360} close={()=>setUser360(null)} addNote={addNote}/>}</section>}
    {view==="admins"&&<section className="space-y-4"><Toolbar icon={UserRoundCog} title="Admin dərəcələri və işçi səlahiyyətləri"/><div className="rounded-2xl border bg-card p-4"><h3 className="font-black">Qeydiyyatdan keçmiş istifadəçiyə adminlik ver</h3><p className="mt-1 text-sm text-muted-foreground">Yalnız Super Admin bu əməliyyatı edə bilər.</p><div className="mt-4 grid gap-3 md:grid-cols-[1fr_240px_auto]"><select value={newAdminId} onChange={e=>setNewAdminId(e.target.value)} className={fieldClass}><option value="">İstifadəçi seçin</option>{accounts.filter(a=>!a.roles?.includes("admin")).map(a=><option key={a.user_id} value={a.user_id}>{a.full_name??a.email} — {a.email}</option>)}</select><select value={newAdminRole} onChange={e=>setNewAdminRole(e.target.value)} className={fieldClass}>{staffRoles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select><button disabled={busy||!newAdminId} onClick={()=>void setAdminRole(newAdminId,newAdminRole)} className={primaryButton}>Adminlik ver</button></div></div><DataTable headers={["Admin","Dərəcə","Aktivlik","İcazələr","Əməliyyat"]}>{staff.map(s=><tr key={s.admin_id} className="border-t"><td className="p-3 font-bold">{s.name}</td><td className="p-3"><select value={s.role_key} onChange={e=>void setAdminRole(s.admin_id,e.target.value)} className={fieldClass}>{staffRoles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></td><td className="p-3"><Status value={s.is_active?"active":"inactive"}/></td><td className="max-w-md p-3 text-xs">{s.permissions.join(", ")}</td><td className="p-3"><button disabled={busy||s.admin_id===currentUserId} onClick={()=>void setAdminRole(s.admin_id,null)} className={dangerButton}>Adminliyi ləğv et</button></td></tr>)}</DataTable></section>}
  </div>;
}

function AccountTableRow({row,selected,toggle,open,setSellerAccess}:{row:AccountRow;selected:boolean;toggle:()=>void;open:()=>void;setSellerAccess:(row:AccountRow,allowed:boolean)=>Promise<void>}){const isSeller=Boolean(row.seller_status)||row.roles?.includes("seller");const paid=["success","migrated"].includes(row.seller_payment_status??"");const override=Boolean(row.seller_product_access_override);return <tr className="border-t"><td className="p-3"><input type="checkbox" checked={selected} onChange={toggle}/></td><td className="p-3"><b>{row.full_name??row.shop_name??"Adsız"}</b><div className="text-xs text-muted-foreground">{row.email}{row.phone?` · ${row.phone}`:""}</div></td><td className="p-3">{(row.roles??[]).map(r=>roleLabels[r]??r).join(", ")||"Müştəri"}</td><td className="p-3"><Status value={row.account_status}/></td><td className="p-3 text-xs">{isSeller?<><b className={paid?"text-emerald-600":override?"text-primary":"text-amber-600"}>{paid?"Ödəniş edilib":override?"Admin icazəsi":"Ödəniş edilməyib"}</b>{!paid&&<div className="mt-2"><button onClick={()=>void setSellerAccess(row,!override)} className={override?dangerButton:successButton}>{override?"İcazəni ləğv et":"Ödənişsiz aktiv et"}</button></div>}</>:"—"}</td><td className="p-3 text-xs">{formatDate(row.created_at)}</td><td className="p-3"><button onClick={open} className={primaryButton}>360° baxış</button></td></tr>}
function AccountCard(props:{row:AccountRow;selected:boolean;toggle:()=>void;open:()=>void;setSellerAccess:(row:AccountRow,allowed:boolean)=>Promise<void>}){const {row}=props;const isSeller=Boolean(row.seller_status)||row.roles?.includes("seller");const paid=["success","migrated"].includes(row.seller_payment_status??"");const override=Boolean(row.seller_product_access_override);return <article className="rounded-2xl border bg-card p-4"><div className="flex items-start gap-3"><input type="checkbox" checked={props.selected} onChange={props.toggle}/><div className="min-w-0 flex-1"><b>{row.full_name??row.shop_name??"Adsız"}</b><div className="truncate text-xs text-muted-foreground">{row.email}</div><div className="mt-2 flex flex-wrap gap-2"><Status value={row.account_status}/><span className="rounded-full bg-secondary px-2 py-1 text-xs font-bold">{(row.roles??[]).map(r=>roleLabels[r]??r).join(", ")||"Müştəri"}</span></div></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={props.open} className={primaryButton}>360° baxış</button>{isSeller&&!paid&&<button onClick={()=>void props.setSellerAccess(row,!override)} className={override?dangerButton:successButton}>{override?"İcazəni ləğv et":"Ödənişsiz aktiv et"}</button>}</div></article>}
function Overview({queue,setView,refresh,busy}:{queue:QueueStats;setView:(v:View)=>void;refresh:()=>Promise<void>;busy:boolean}){const cards:[keyof QueueStats,string,View,typeof AlertTriangle][]=[["pending_products","Təsdiq gözləyən məhsullar","moderation",PackageCheck],["open_tickets","Cavabsız müraciətlər","support",TicketCheck],["failed_payments_24h","Uğursuz ödənişlər (24s)","payments",CreditCard],["stock_out_products","Stoku bitən məhsullar","moderation",PackageCheck],["unresolved_alerts","Açıq xəbərdarlıqlar","alerts",BellRing]];return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Bugünkü iş növbəsi</h2><p className="text-sm text-muted-foreground">Satıcı təsdiqi və istifadəçi idarəetməsi yalnız “İstifadəçilər” bölməsindədir.</p></div><button disabled={busy} onClick={()=>void refresh()} className={primaryButton}><RefreshCw className="h-4 w-4"/>Xəbərdarlıqları yoxla</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([key,label,target,Icon])=><button key={key} onClick={()=>setView(target)} className="rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary"/><span className="text-3xl font-black">{queue[key]??0}</span></div><div className="mt-3 text-sm font-bold">{label}</div></button>)}</div></section>}
function Toolbar({icon:Icon,title,children}:{icon:LucideIcon;title:string;children?:ReactNode}){return <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4"><Icon className="h-6 w-6 text-primary"/><h2 className="mr-auto text-lg font-black">{title}</h2>{children}</div>}
function SearchBox({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Axtar..." className={`${fieldClass} pl-9`}/></div>}
function DataTable({headers,children}:{headers:string[];children:ReactNode}){return <div className="overflow-x-auto rounded-2xl border bg-card"><table className="w-full min-w-[900px] text-sm"><thead className="bg-secondary/50"><tr>{headers.map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
function Status({value}:{value:string}){const ok=["active","success","approved","answered","resolved","closed"].includes(value);const labels:Record<string,string>={active:"Aktiv",inactive:"Passiv",blocked:"Bloklanıb",success:"Uğurlu",pending:"Gözləyir",resolved:"Həll edilib",closed:"Bağlı"};return <span className={`rounded-full px-2 py-1 text-xs font-bold ${ok?"bg-success/10 text-success":"bg-warning/10 text-warning"}`}>{labels[value]??value}</span>}
function User360({data,close,addNote}:{data:JsonRecord;close:()=>void;addNote:(id:string)=>Promise<void>}){const profile=(data.profile??{}) as any;const seller=(data.seller_application??{}) as any;const roles=(data.roles??[]) as string[];const products=(data.products??{}) as any;const orders=(data.orders??{}) as any;const tickets=Array.isArray(data.tickets)?data.tickets:[];const notes=Array.isArray(data.notes)?data.notes:[];return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-card shadow-2xl"><header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-card/95 p-5 backdrop-blur"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-xl font-black text-primary">{String(profile.full_name??profile.email??"İ").slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-black">{profile.full_name??"Adsız istifadəçi"}</h2><p className="truncate text-sm text-muted-foreground">{profile.email??"E-poçt yoxdur"} {profile.phone?`· ${profile.phone}`:""}</p></div><button onClick={close} className="rounded-xl border p-2" aria-label="Bağla"><X className="h-5 w-5"/></button></header><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Hesab statusu" value={profile.account_status??"—"}/><Metric label="Rollar" value={roles.map(r=>roleLabels[r]??r).join(", ")||"Müştəri"}/><Metric label="Məhsullar" value={`${products.active??0} aktiv / ${products.total??0} ümumi`}/><Metric label="Sifarişlər" value={`${orders.total??0} ədəd · ${formatAZN(Number(orders.amount??0))}`}/></div><div className="grid gap-4 lg:grid-cols-2"><Section title="Şəxsi məlumatlar"><Details rows={[["Ad soyad",profile.full_name],["E-poçt",profile.email],["Telefon",profile.phone],["Qeydiyyat",profile.created_at?formatDate(profile.created_at):null],["Mənbə",profile.acquisition_source],["Cəlb edən",profile.acquisition_detail]]}/></Section><Section title="Satıcı və mağaza"><Details rows={[["Mağaza",seller.shop_name??profile.shop_name],["Status",seller.status],["Ödəniş",seller.payment_status],["Məbləğ",seller.registration_fee!=null?formatAZN(Number(seller.registration_fee)):null],["Ödənişsiz icazə",seller.product_access_override?"Bəli":"Xeyr"],["Şəhər",seller.shop_city??profile.shop_city]]}/></Section><Section title={`Dəstək müraciətləri (${tickets.length})`}>{tickets.length?<div className="divide-y">{tickets.slice(0,8).map((t:any)=><div key={t.id} className="flex justify-between gap-3 py-2 text-sm"><span>{t.subject??t.category??"Müraciət"}</span><Status value={t.status??"pending"}/></div>)}</div>:<Empty/>}</Section><Section title={`Daxili qeydlər (${notes.length})`}>{notes.length?<div className="space-y-2">{notes.slice(0,8).map((n:any,i:number)=><div key={n.id??i} className="rounded-xl bg-secondary/50 p-3 text-sm"><p>{n.note??n.text??"—"}</p>{n.created_at&&<span className="mt-1 block text-xs text-muted-foreground">{formatDate(n.created_at)}</span>}</div>)}</div>:<Empty/>}</Section></div>{profile.id&&<button onClick={()=>void addNote(profile.id)} className={primaryButton}>Daxili qeyd əlavə et</button>}</div></div></div>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-2xl border bg-secondary/20 p-4"><div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-2 break-words font-black">{value}</div></div>}
function Section({title,children}:{title:string;children:ReactNode}){return <section className="rounded-2xl border p-4"><h3 className="font-black">{title}</h3><div className="mt-3">{children}</div></section>}
function Details({rows}:{rows:[string,unknown][]}){return <dl className="divide-y">{rows.map(([label,value])=><div key={label} className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-semibold">{value==null||value===""?"—":String(value)}</dd></div>)}</dl>}
function Empty(){return <p className="py-4 text-center text-sm text-muted-foreground">Məlumat yoxdur</p>}
