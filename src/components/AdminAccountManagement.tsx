import { useCallback, useEffect, useState } from "react";
import { Ban, Edit3, RotateCcw, Search, ShieldCheck, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { ACQUISITION_SOURCES, acquisitionSourceLabel } from "@/lib/acquisitionSources";

interface AccountRow {
  user_id: string; email: string; full_name: string | null; phone: string | null; shop_name: string | null;
  roles: string[]; account_status: "active" | "inactive" | "temporary_blocked" | "permanent_blocked";
  blocked_until: string | null; block_reason: string | null; acquisition_source: string | null;
  acquisition_detail: string | null; created_at: string; last_active_at: string;
}
const statusLabels: Record<string, string> = { active: "Aktiv", inactive: "Passiv", temporary_blocked: "Müvəqqəti blok", permanent_blocked: "Daimi blok" };

export function AdminAccountManagement({ initialRole }: { initialRole: "buyer" | "seller" | "pvz" }) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_accounts" as never, { _search: search.trim() || null, _role: initialRole, _status: status || null, _source: source || null, _limit: 300 } as never);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as AccountRow[]);
    setLoading(false);
  }, [initialRole, search, source, status]);
  useEffect(() => { const timeout = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timeout); }, [load]);

  const invokeAction = async (row: AccountRow, action: string, options: Record<string, unknown> = {}) => {
    setBusyId(row.user_id);
    const { data, error } = await supabase.functions.invoke("admin-user-management", { body: { target_user_id: row.user_id, action, ...options } });
    setBusyId(null);
    if (error || !data?.ok) { toast.error(data?.error ?? error?.message ?? "Əməliyyat alınmadı"); return; }
    toast.success("Əməliyyat tamamlandı və Audit Log-a yazıldı");
    await load();
  };
  const edit = async (row: AccountRow) => {
    const full_name=prompt("Ad Soyad:",row.full_name??""); if(full_name===null)return;
    const phone=prompt("Telefon:",row.phone??""); if(phone===null)return;
    const email=prompt("E-poçt:",row.email); if(email===null)return;
    const shop_name=prompt("Mağaza adı:",row.shop_name??""); if(shop_name===null)return;
    const acquisition_source=prompt(`Mənbə kodu (${ACQUISITION_SOURCES.map(x=>x.value).join(", ")}):`,row.acquisition_source??""); if(acquisition_source===null)return;
    const acquisition_detail=prompt("Cəlb edən şəxs/mənbə detalı:",row.acquisition_detail??""); if(acquisition_detail===null)return;
    await invokeAction(row,"edit",{profile_patch:{full_name,phone,email,shop_name,acquisition_source:acquisition_source||null,acquisition_detail}});
  };
  const actionCls="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50";
  return <div className="space-y-4">
    <div className="flex flex-col xl:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ad, e-poçt, telefon, mağaza və ya cəlb edən şəxs..." className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-background"/></div>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="h-11 px-3 rounded-lg border border-input bg-background"><option value="">Bütün statuslar</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select value={source} onChange={e=>setSource(e.target.value)} className="h-11 px-3 rounded-lg border border-input bg-background"><option value="">Bütün mənbələr</option>{ACQUISITION_SOURCES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
    </div>
    <div className="text-sm text-muted-foreground">{rows.length} nəticə</div>
    <div className="rounded-2xl border border-border bg-card overflow-x-auto"><table className="w-full text-sm min-w-[1180px]"><thead className="bg-secondary/50 text-left"><tr>{["Hesab","Rol","Mənbə / cəlb edən","Qeydiyyat","Son aktivlik","Status","Əməliyyatlar"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
      {loading?<tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Yüklənir...</td></tr>:rows.length===0?<tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nəticə yoxdur</td></tr>:rows.map(row=><tr key={row.user_id} className="border-t border-border align-top">
        <td className="p-3"><b>{row.full_name??"Adsız"}</b><div className="text-xs">{row.email}</div><div className="text-xs text-muted-foreground">{row.phone??"—"}{row.shop_name?` · ${row.shop_name}`:""}</div></td>
        <td className="p-3"><div className="flex gap-1 flex-wrap">{row.roles.map(role=><span key={role} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{role}</span>)}</div></td>
        <td className="p-3"><b>{acquisitionSourceLabel(row.acquisition_source)}</b><div className="text-xs text-muted-foreground max-w-[220px]">{row.acquisition_detail??"—"}</div></td>
        <td className="p-3 text-xs">{formatDate(row.created_at)}</td><td className="p-3 text-xs">{formatDate(row.last_active_at)}</td>
        <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${row.account_status==='active'?'bg-success/10 text-success':'bg-destructive/10 text-destructive'}`}>{statusLabels[row.account_status]}</span>{row.block_reason&&<div className="text-xs mt-1 max-w-[180px]">{row.block_reason}</div>}</td>
        <td className="p-3"><div className="flex flex-wrap gap-1.5"><button disabled={busyId===row.user_id} onClick={()=>void edit(row)} className={actionCls}><Edit3 className="h-3 w-3"/>Redaktə</button>
          {row.account_status==="active"?<button disabled={busyId===row.user_id} onClick={()=>{const reason=prompt("Passiv etmə səbəbi:")??"";void invokeAction(row,"deactivate",{reason});}} className={actionCls}><UserX className="h-3 w-3"/>Passiv</button>:<button disabled={busyId===row.user_id} onClick={()=>void invokeAction(row,"restore")} className={`${actionCls} text-success`}><RotateCcw className="h-3 w-3"/>Bərpa</button>}
          <button disabled={busyId===row.user_id} onClick={()=>{const hours=Number(prompt("Neçə saat bloklansın?","24")??0);if(hours>0){const reason=prompt("Səbəb:")??"";void invokeAction(row,"temporary_block",{reason,block_minutes:hours*60});}}} className={actionCls}><Ban className="h-3 w-3"/>Müvəqqəti</button>
          <button disabled={busyId===row.user_id} onClick={()=>{const reason=prompt("Daimi blok səbəbi:");if(reason!==null)void invokeAction(row,"permanent_block",{reason});}} className={`${actionCls} text-destructive`}><ShieldCheck className="h-3 w-3"/>Daimi</button>
          <button disabled={busyId===row.user_id} onClick={()=>{const word=prompt("Tam silmək üçün DELETE yazın:");if(word==="DELETE"){const reason=prompt("Silmə səbəbi:")??"";void invokeAction(row,"hard_delete",{reason});}}} className={`${actionCls} text-destructive`}><Trash2 className="h-3 w-3"/>Tam sil</button></div></td>
      </tr>)}</tbody></table></div>
  </div>;
}
