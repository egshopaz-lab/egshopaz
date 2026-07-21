
import { useEffect, useMemo, useState } from "react";
import { Flag, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MessageAttachment, type MessageAttachmentData } from "@/components/MessageAttachment";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface Report {
  id: string; reporter_id: string; reported_user_id: string; message_id: string;
  buyer_id: string; seller_id: string; reason: string; details: string | null;
  status: string; resolution: string | null; created_at: string;
}
interface AdminMessage extends MessageAttachmentData {
  id: string; buyer_id: string; seller_id: string; sender_role: "buyer" | "seller";
  body: string; created_at: string;
}

export function AdminMessageReports() {
  const db = supabase as any;
  const [reports, setReports] = useState<Report[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [selected, setSelected] = useState<Report | null>(null);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.from("shop_message_reports").select("*").order("created_at", { ascending: false }).limit(300);
    setLoading(false);
    if (error) return toast.error(error.message);
    setReports((data ?? []) as Report[]);
  };
  useEffect(() => { void load(); }, []);

  const openReport = async (report: Report) => {
    setSelected(report);
    const { data, error } = await db.from("shop_messages").select("*")
      .eq("buyer_id", report.buyer_id).eq("seller_id", report.seller_id)
      .order("created_at", { ascending: true }).limit(500);
    if (error) return toast.error(error.message);
    setMessages((data ?? []) as AdminMessage[]);
  };

  const update = async (status: "reviewing" | "resolved" | "rejected") => {
    if (!selected) return;
    const resolution = status === "reviewing" ? null : window.prompt("Qərar və görülən tədbir:", selected.resolution ?? "");
    if (status !== "reviewing" && !resolution) return;
    const { error } = await db.from("shop_message_reports").update({
      status, resolution, reviewed_at: status === "reviewing" ? null : new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Şikayət yeniləndi");
    setSelected(null); setMessages([]); await load();
  };

  const visible = useMemo(() => reports.filter((report) => !filter || report.status === filter), [reports, filter]);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
      <ShieldAlert className="h-6 w-6 text-primary" /><div className="mr-auto"><h2 className="font-black">Mesaj şikayətləri</h2><p className="text-xs text-muted-foreground">Admin yalnız şikayət edilmiş söhbətləri görə bilər.</p></div>
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">
        <option value="">Bütün statuslar</option><option value="open">Yeni</option><option value="reviewing">Araşdırılır</option><option value="resolved">Həll edilib</option><option value="rejected">Rədd edilib</option>
      </select>
      <button onClick={() => void load()} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button>
    </div>
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="max-h-[70vh] overflow-y-auto rounded-2xl border bg-card">
        {loading ? <div className="p-6">Yüklənir...</div> : visible.length === 0 ? <div className="p-8 text-center text-muted-foreground">Şikayət yoxdur</div> : visible.map((report) =>
          <button key={report.id} onClick={() => void openReport(report)} className={`w-full border-b p-4 text-left hover:bg-secondary/50 ${selected?.id === report.id ? "bg-secondary" : ""}`}>
            <div className="flex items-center gap-2"><Flag className="h-4 w-4 text-destructive" /><b>{report.reason}</b><span className="ml-auto text-xs">{report.status}</span></div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{report.details || "Əlavə izah yoxdur"}</p><p className="mt-2 text-[11px]">{formatDateTime(report.created_at)}</p>
          </button>)}
      </div>
      <div className="rounded-2xl border bg-card p-4">
        {!selected ? <div className="grid min-h-80 place-items-center text-muted-foreground">Araşdırmaq üçün şikayət seçin</div> : <>
          <div className="mb-4 flex flex-wrap gap-2 border-b pb-4"><div className="mr-auto"><b>Səbəb: {selected.reason}</b><p className="text-sm">{selected.details}</p></div>
            <button onClick={() => void update("reviewing")} className="rounded-lg border px-3 py-2 text-sm font-bold">Araşdır</button>
            <button onClick={() => void update("rejected")} className="rounded-lg border px-3 py-2 text-sm font-bold">Rədd et</button>
            <button onClick={() => void update("resolved")} className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Həll et</button></div>
          <div className="max-h-[58vh] space-y-2 overflow-y-auto rounded-xl bg-secondary/20 p-3">{messages.map((message) => <div key={message.id} className={`flex ${message.sender_role === "buyer" ? "justify-start" : "justify-end"}`}><div className="max-w-[80%] rounded-xl border bg-card p-3"><div className="text-xs font-bold">{message.sender_role === "buyer" ? "Müştəri" : "Satıcı"}</div><p className="whitespace-pre-wrap text-sm">{message.body}</p><MessageAttachment message={message} /><div className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(message.created_at)}</div></div></div>)}</div>
        </>}
      </div>
    </div>
  </div>;
}

