
import { useCallback, useEffect, useState } from "react";
import { Activity, CreditCard, FileText, RefreshCw, RotateCcw, Save, Search, ShieldCheck, Split } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { toast } from "sonner";

type Operation = {
  id: string;
  kind: string;
  status: string;
  amount: number | null;
  currency: string;
  payment_intent_id: string | null;
  provider_transaction_id: string | null;
  error_message: string | null;
  created_at: string;
};

type SavedCard = {
  id: string;
  user_id: string;
  card_mask: string | null;
  card_name: string | null;
  purpose: string;
  status: string;
  created_at: string;
};

const db = supabase as any;

export function AdminEpointOperations() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [heartbeat, setHeartbeat] = useState<{ ok: boolean; latency_ms?: number; checked_at?: string } | null>(null);
  const [splitUser, setSplitUser] = useState("");
  const [splitPercent, setSplitPercent] = useState("0");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [reverseAmount, setReverseAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [opsResult, cardsResult, settingsResult] = await Promise.all([
      db.from("epoint_api_operations").select("id,kind,status,amount,currency,payment_intent_id,provider_transaction_id,error_message,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("epoint_saved_cards").select("id,user_id,card_mask,card_name,purpose,status,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("system_settings").select("epoint_split_user,epoint_split_percent").limit(1).maybeSingle(),
    ]);
    if (opsResult.error || cardsResult.error || settingsResult.error) {
      toast.error(opsResult.error?.message || cardsResult.error?.message || settingsResult.error?.message || "Epoint məlumatları alınmadı");
    } else {
      setOperations((opsResult.data ?? []) as Operation[]);
      setCards((cardsResult.data ?? []) as SavedCard[]);
      setSplitUser(settingsResult.data?.epoint_split_user ?? "");
      setSplitPercent(String(settingsResult.data?.epoint_split_percent ?? 0));
    }
    setLoading(false);
  }, []);

  const checkHeartbeat = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("epoint-heartbeat", { method: "GET" });
    if (error) setHeartbeat({ ok: false });
    else setHeartbeat(data as { ok: boolean; latency_ms?: number; checked_at?: string });
  }, []);

  useEffect(() => { void load(); void checkHeartbeat(); }, [load, checkHeartbeat]);

  const invoke = async (body: Record<string, unknown>, success: string) => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("epoint-operations", { body });
    setWorking(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Epoint əməliyyatı alınmadı");
      return null;
    }
    toast.success(success);
    await load();
    return data;
  };

  const saveSplit = async () => {
    const percent = Number(splitPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return toast.error("Faiz 0-100 aralığında olmalıdır");
    const current = await db.from("system_settings").select("id").limit(1).single();
    if (current.error) return toast.error(current.error.message);
    const { error } = await db.from("system_settings").update({
      epoint_split_user: splitUser.trim() || null,
      epoint_split_percent: percent,
      updated_at: new Date().toISOString(),
    }).eq("id", current.data.id);
    if (error) toast.error(error.message); else toast.success("Split ayarları saxlanıldı");
  };

  const visible = operations.filter((item) => {
    const query = filter.trim().toLowerCase();
    return !query || `${item.kind} ${item.status} ${item.payment_intent_id ?? ""} ${item.provider_transaction_id ?? ""}`.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Epoint idarəetməsi</h2>
          <p className="text-sm text-muted-foreground">Kart tokenləri, ödəniş statusları, qaytarmalar və audit</p>
        </div>
        <button type="button" onClick={() => { void load(); void checkHeartbeat(); }} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted" title="Yenilə">
          <RefreshCw className="h-4 w-4" /> Yenilə
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Activity} label="Epoint xidməti" value={heartbeat?.ok ? `Aktiv${heartbeat.latency_ms ? ` · ${heartbeat.latency_ms} ms` : ""}` : "Əlçatan deyil"} good={Boolean(heartbeat?.ok)} />
        <Metric icon={CreditCard} label="Aktiv saxlanmış kart" value={String(cards.filter((card) => card.status === "active").length)} good />
        <Metric icon={ShieldCheck} label="Son 100 əməliyyat" value={String(operations.length)} good />
      </div>

      <section className="border-y border-border py-5">
        <div className="mb-4 flex items-center gap-2"><Split className="h-5 w-5 text-primary" /><h3 className="font-semibold">Split ödəniş ayarları</h3></div>
        <div className="grid max-w-3xl gap-3 sm:grid-cols-[1fr_160px_auto]">
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">İkinci Epoint istifadəçisi</span><input value={splitUser} onChange={(event) => setSplitUser(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3" placeholder="i000000002" /></label>
          <label className="text-sm"><span className="mb-1 block text-muted-foreground">Pay faizi</span><input type="number" min="0" max="100" step="0.01" value={splitPercent} onChange={(event) => setSplitPercent(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3" /></label>
          <button type="button" onClick={() => void saveSplit()} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Saxla</button>
        </div>
      </section>

      <section className="border-b border-border pb-5">
        <h3 className="mb-4 font-semibold">Maliyyə əməliyyatları</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Payment intent ID</span><input value={paymentIntentId} onChange={(event) => setPaymentIntentId(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-xs" /></label>
            <div className="flex flex-wrap gap-2">
              <button disabled={working || !paymentIntentId} type="button" onClick={() => void invoke({ action: "get_status", payment_intent_id: paymentIntentId }, "Status Epoint-dən yeniləndi")} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium disabled:opacity-50"><Search className="h-4 w-4" /> Statusu yoxla</button>
              <input aria-label="Qaytarma məbləği" value={reverseAmount} onChange={(event) => setReverseAmount(event.target.value)} className="h-10 w-32 rounded-md border border-border bg-background px-3" placeholder="Tam məbləğ" />
              <button disabled={working || !paymentIntentId} type="button" onClick={() => void invoke({ action: "reverse", payment_intent_id: paymentIntentId, ...(reverseAmount ? { amount: Number(reverseAmount) } : {}) }, "Qaytarma sorğusu icra edildi")} className="inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"><RotateCcw className="h-4 w-4" /> Geri qaytar</button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm"><span className="mb-1 block text-muted-foreground">Hesab-faktura ID</span><input value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3" /></label>
            <button disabled={working || !invoiceId} type="button" onClick={() => void invoke({ action: "invoice_view", invoice: { id: Number(invoiceId) } }, "Hesab-faktura məlumatı alındı")} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium disabled:opacity-50"><FileText className="h-4 w-4" /> Fakturaya bax</button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Əməliyyat jurnalı</h3>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm" placeholder="Əməliyyat axtar" /></div>
        </div>
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-3 py-2">Növ</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Məbləğ</th><th className="px-3 py-2">Payment ID</th><th className="px-3 py-2">Tarix</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Yüklənir...</td></tr> : visible.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Əməliyyat yoxdur</td></tr> : visible.map((item) => (
              <tr key={item.id} className="border-t border-border"><td className="px-3 py-2 font-medium">{item.kind}</td><td className="px-3 py-2"><Status value={item.status} /></td><td className="px-3 py-2">{item.amount == null ? "—" : formatAZN(item.amount)}</td><td className="max-w-52 truncate px-3 py-2 font-mono text-xs" title={item.payment_intent_id ?? ""}>{item.payment_intent_id ?? "—"}</td><td className="px-3 py-2 text-xs">{formatDate(item.created_at)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, good }: { icon: typeof Activity; label: string; value: string; good: boolean }) {
  return <div className="border-l-2 border-primary bg-muted/30 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><div className={`mt-2 font-semibold ${good ? "text-foreground" : "text-destructive"}`}>{value}</div></div>;
}

function Status({ value }: { value: string }) {
  const good = value === "success";
  const pending = value === "new" || value === "processing";
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${good ? "bg-emerald-100 text-emerald-800" : pending ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{value}</span>;
}
