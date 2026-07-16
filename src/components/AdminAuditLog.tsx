import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

interface AuditRow {
  id:string; admin_id:string|null; admin_email:string|null; action:string; entity_type:string;
  entity_id:string|null; target_user_id:string|null; reason:string|null; old_data:unknown;
  new_data:unknown; metadata:unknown; created_at:string;
}
export function AdminAuditLog(){
  const [rows,setRows]=useState<AuditRow[]>([]); const [search,setSearch]=useState(""); const [action,setAction]=useState("");
  const load=useCallback(async()=>{let query=supabase.from("admin_audit_logs" as never).select("*").order("created_at",{ascending:false}).limit(300);if(action)query=query.eq("action",action);const{data}=await query;setRows((data??[]) as unknown as AuditRow[]);},[action]);
  useEffect(()=>{void load();},[load]);
  const actions=useMemo(()=>[...new Set(rows.map(row=>row.action))].sort(),[rows]);
  const visible=rows.filter(row=>!search.trim()||JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4">
    <div className="rounded-2xl border border-border bg-card p-4"><div className="font-black">Dəyişməz Audit Log</div><p className="text-sm text-muted-foreground mt-1">Admin əməliyyatları, əvvəlki və yeni dəyərlər, vaxt və hədəf hesab burada saxlanılır.</p></div>
    <div className="flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Admin, əməliyyat, obyekt və ya səbəb..." className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-background"/></div><select value={action} onChange={e=>setAction(e.target.value)} className="h-11 px-3 rounded-lg border border-input bg-background"><option value="">Bütün əməliyyatlar</option>{actions.map(item=><option key={item} value={item}>{item}</option>)}</select></div>
    <div className="rounded-2xl border border-border bg-card overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead className="bg-secondary/50 text-left"><tr>{["Tarix","Admin","Əməliyyat","Obyekt","Səbəb","Dəyişiklik"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{visible.length===0?<tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Audit qeydi yoxdur</td></tr>:visible.map(row=><tr key={row.id} className="border-t border-border align-top"><td className="p-3 text-xs">{formatDate(row.created_at)}</td><td className="p-3"><b>{row.admin_email??"Sistem"}</b><div className="text-xs text-muted-foreground">{row.admin_id??"—"}</div></td><td className="p-3 font-bold">{row.action}</td><td className="p-3">{row.entity_type}<div className="text-xs text-muted-foreground">{row.entity_id??row.target_user_id??"—"}</div></td><td className="p-3 max-w-[220px]">{row.reason??"—"}</td><td className="p-3"><details><summary className="cursor-pointer text-primary font-semibold">Detallar</summary><pre className="mt-2 max-w-[420px] max-h-64 overflow-auto text-[11px] whitespace-pre-wrap bg-secondary/50 p-2 rounded">{JSON.stringify({old:row.old_data,new:row.new_data,metadata:row.metadata},null,2)}</pre></details></td></tr>)}</tbody></table></div>
  </div>;
}
