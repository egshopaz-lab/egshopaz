import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Row = Record<string, any>;
type View = "trial" | "journal" | "accounts" | "periods";

export function AdminAccountingLedger() {
  const [view, setView] = useState<View>("trial");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [trial, setTrial] = useState<Row[]>([]);
  const [entries, setEntries] = useState<Row[]>([]);
  const [periods, setPeriods] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true); const db = supabase as any;
    const [a, t, e, p] = await Promise.all([
      db.from("accounting_accounts").select("*").order("code"),
      db.rpc("accounting_trial_balance", { _from: null, _to: null }),
      db.from("accounting_journal_entries").select("id,entry_number,entry_date,description,status,source_table,source_id,posted_at,created_at,accounting_journal_lines(debit,credit)").order("entry_date", { ascending: false }).order("entry_number", { ascending: false }).limit(500),
      db.from("accounting_periods").select("*").order("starts_on", { ascending: false }),
    ]);
    const error = a.error || t.error || e.error || p.error;
    if (error) toast.error(`Mühasibat registri oxunmadı: ${error.message}`);
    setAccounts(a.data ?? []); setTrial(t.data ?? []); setEntries(e.data ?? []); setPeriods(p.data ?? []); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({ debit: trial.reduce((s, x) => s + Number(x.total_debit || 0), 0), credit: trial.reduce((s, x) => s + Number(x.total_credit || 0), 0) }), [trial]);

  const createPeriod = async () => {
    const starts_on = prompt("Dövrün başlanğıcı (YYYY-MM-DD):", new Date().toISOString().slice(0, 8) + "01"); if (!starts_on) return;
    const ends_on = prompt("Dövrün sonu (YYYY-MM-DD):"); if (!ends_on) return;
    const name = prompt("Dövrün adı:", starts_on.slice(0, 7)) || starts_on.slice(0, 7);
    const { error } = await (supabase as any).from("accounting_periods").insert({ name, starts_on, ends_on });
    if (error) toast.error(error.message); else { toast.success("Mühasibat dövrü açıldı"); void load(); }
  };

  const createEntry = async () => {
    const entry_date = prompt("Yazılış tarixi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10)); if (!entry_date) return;
    const description = prompt("Əməliyyatın məzmunu:"); if (!description) return;
    const debitCode = prompt("Debet hesab kodu (məsələn 223-1):"); if (!debitCode) return;
    const creditCode = prompt("Kredit hesab kodu (məsələn 601-1):"); if (!creditCode) return;
    const amount = Number(prompt("Məbləğ (AZN):")); if (!Number.isFinite(amount) || amount <= 0) return toast.error("Məbləğ düzgün deyil");
    const debit = accounts.find((x) => x.code === debitCode), credit = accounts.find((x) => x.code === creditCode);
    if (!debit || !credit) return toast.error("Hesab kodu tapılmadı");
    const db = supabase as any;
    const { data: entry, error } = await db.from("accounting_journal_entries").insert({ entry_date, description }).select("id").single();
    if (error) return toast.error(error.message);
    const { error: lineError } = await db.from("accounting_journal_lines").insert([
      { entry_id: entry.id, account_id: debit.id, debit: amount, credit: 0, memo: description },
      { entry_id: entry.id, account_id: credit.id, debit: 0, credit: amount, memo: description },
    ]);
    if (lineError) return toast.error(lineError.message);
    toast.success("Balanslı jurnal qaralaması yaradıldı"); void load();
  };

  const postEntry = async (id: string) => {
    if (!confirm("Debet və kredit yoxlanaraq jurnal yazılışı təsdiqlənsin? Təsdiqdən sonra məzmun dəyişdirilə bilməz.")) return;
    const { error } = await (supabase as any).rpc("accounting_post_entry", { _entry_id: id });
    if (error) toast.error(error.message); else { toast.success("Jurnal yazılışı təsdiqləndi"); void load(); }
  };

  const closePeriod = async (id: string) => {
    if (!confirm("Bu dövr bağlansın? Bağlandıqdan sonra həmin tarixlərə yeni yazılış qəbul edilməyəcək.")) return;
    const { error } = await (supabase as any).rpc("accounting_close_period", { _period_id: id });
    if (error) toast.error(error.message); else { toast.success("Dövr bağlandı"); void load(); }
  };

  const label: Record<View, string> = { trial: "Sınaq balansı", journal: "Əməliyyat jurnalı", accounts: "Hesablar planı", periods: "Uçot dövrləri" };
  return <section className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-extrabold"><BookOpen className="h-5 w-5 text-primary" /> Mühasibat uçotu registri</h3><p className="mt-1 text-xs text-muted-foreground">İkitərəfli yazılış · ilkin sənəd · dəyişməz jurnal · dövr nəzarəti</p></div><button onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border"><RefreshCw className="h-4 w-4" /></button></div>
    <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(label) as View[]).map((key) => <button key={key} onClick={() => setView(key)} className={`rounded-lg px-3 py-2 text-xs font-bold ${view === key ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{label[key]}</button>)}</div>
    {loading ? <div className="py-10 text-center text-sm text-muted-foreground">Registrlər yüklənir...</div> : <>
      {view === "trial" && <div className="mt-5"><div className="mb-3 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-secondary/50 p-3"><small>Debet dövriyyəsi</small><b className="block text-xl">{formatAZN(totals.debit)}</b></div><div className="rounded-xl bg-secondary/50 p-3"><small>Kredit dövriyyəsi</small><b className="block text-xl">{formatAZN(totals.credit)}</b></div><div className={`rounded-xl p-3 ${Math.abs(totals.debit - totals.credit) < .01 ? "bg-emerald-500/10" : "bg-red-500/10"}`}><small>Balans nəzarəti</small><b className={`block text-xl ${Math.abs(totals.debit - totals.credit) < .01 ? "text-emerald-600" : "text-red-600"}`}>{formatAZN(totals.debit - totals.credit)}</b></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Hesab</th><th>Ad</th><th>Növ</th><th>Debet</th><th>Kredit</th><th>Qalıq</th></tr></thead><tbody>{trial.map((x) => <tr key={x.account_id} className="border-b"><td className="py-2 font-mono font-bold">{x.code}</td><td>{x.name}</td><td>{x.account_type}</td><td>{formatAZN(x.total_debit)}</td><td>{formatAZN(x.total_credit)}</td><td className="font-bold">{formatAZN(x.balance)}</td></tr>)}</tbody></table></div></div>}
      {view === "journal" && <div className="mt-5"><button onClick={createEntry} className="mb-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Yeni jurnal yazılışı</button><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">№</th><th>Tarix</th><th>Məzmun</th><th>Mənbə</th><th>Debet</th><th>Kredit</th><th>Status</th><th></th></tr></thead><tbody>{entries.length ? entries.map((x) => { const lines=x.accounting_journal_lines ?? []; const debit=lines.reduce((s:number,l:Row)=>s+Number(l.debit||0),0),credit=lines.reduce((s:number,l:Row)=>s+Number(l.credit||0),0); return <tr key={x.id} className="border-b"><td className="py-3 font-mono">{x.entry_number}</td><td>{x.entry_date}</td><td>{x.description}</td><td className="text-xs">{x.source_table ? `${x.source_table}:${String(x.source_id).slice(0,8)}` : "manual"}</td><td>{formatAZN(debit)}</td><td>{formatAZN(credit)}</td><td><span className={`rounded-full px-2 py-1 text-xs ${x.status === "posted" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{x.status}</span></td><td>{x.status === "draft" && <button onClick={() => postEntry(x.id)} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">Təsdiqlə</button>}</td></tr>}) : <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Jurnal yazılışı yoxdur</td></tr>}</tbody></table></div></div>}
      {view === "accounts" && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Kod</th><th>Hesabın adı</th><th>Növ</th><th>Normal tərəf</th><th>İzah</th></tr></thead><tbody>{accounts.map((x) => <tr key={x.id} className="border-b"><td className="py-3 font-mono font-bold">{x.code}</td><td>{x.name}</td><td>{x.account_type}</td><td>{x.normal_side}</td><td className="text-xs text-muted-foreground">{x.description}</td></tr>)}</tbody></table></div>}
      {view === "periods" && <div className="mt-5"><button onClick={createPeriod} className="mb-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Yeni dövr</button><div className="space-y-2">{periods.map((x) => <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><b>{x.name}</b><div className="text-xs text-muted-foreground">{x.starts_on} — {x.ends_on}{x.closed_at ? ` · ${formatDateTime(x.closed_at)}` : ""}</div></div><div className="flex items-center gap-2">{x.status === "closed" ? <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Bağlı</span> : <><span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Açıq</span><button onClick={() => closePeriod(x.id)} className="rounded-lg border px-3 py-1 text-xs font-bold">Dövrü bağla</button></>}</div></div>)}</div></div>}
    </>}
  </section>;
}

