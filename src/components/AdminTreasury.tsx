import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, CheckCircle2 } from "lucide-react";

interface Tx {
  id: string;
  kind: string;
  direction: "in" | "out";
  amount: number;
  order_id: string | null;
  seller_id: string | null;
  pickup_point_id: string | null;
  note: string | null;
  created_at: string;
}

interface UnpaidOrder {
  id: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  recipient_name: string | null;
  recipient_phone: string | null;
}

const KIND_LABEL: Record<string, string> = {
  cash_in_pvz: "PVZ-də nağd",
  transfer_in: "Bank köçürmə",
  online_in: "Onlayn ödəniş",
  manual_in: "Əl ilə gəlir",
  payout_out: "Satıcıya ödəniş",
  refund_out: "Geri qaytarma",
  manual_out: "Əl ilə xərc",
};

export function AdminTreasury() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidOrder[]>([]);
  const [sellerOwed, setSellerOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = range === "all" ? null : new Date(Date.now() - (range === "7d" ? 7 : 30) * 86400000).toISOString();
    const txQ = supabase.from("treasury_transactions").select("*").order("created_at", { ascending: false }).limit(500);
    if (since) txQ.gte("created_at", since);
    const [t, u, sb] = await Promise.all([
      txQ,
      supabase.from("orders").select("id,total,payment_method,payment_status,created_at,recipient_name,recipient_phone")
        .eq("payment_status", "unpaid").order("created_at", { ascending: false }).limit(100),
      supabase.from("seller_balances").select("available, pending"),
    ]);
    setTxs((t.data ?? []) as Tx[]);
    setUnpaid((u.data ?? []) as UnpaidOrder[]);
    setSellerOwed((sb.data ?? []).reduce((s: number, r: any) => s + Number(r.available || 0) + Number(r.pending || 0), 0));
    setLoading(false);
  };

  useEffect(() => { void load(); }, [range]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    const byKind: Record<string, number> = {};
    txs.forEach((t) => {
      if (t.direction === "in") income += Number(t.amount);
      else expense += Number(t.amount);
      byKind[t.kind] = (byKind[t.kind] ?? 0) + Number(t.amount);
    });
    return { income, expense, net: income - expense, byKind };
  }, [txs]);

  const markPaid = async (orderId: string) => {
    const method = prompt("Ödəniş üsulu: 'transfer' (köçürmə) və ya 'online' (kart). Default: transfer", "transfer") ?? "transfer";
    const note = prompt("Qeyd (məs. bank ref):") ?? null;
    setBusy(true);
    const { error } = await supabase.rpc("mark_order_paid", { _order_id: orderId, _method: method, _note: note ?? undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ödənildi olaraq qeyd edildi");
    void load();
  };

  const addManual = async (direction: "in" | "out") => {
    const amtStr = prompt(direction === "in" ? "Gəlir məbləği (AZN):" : "Xərc məbləği (AZN):");
    const amt = Number(amtStr);
    if (!amt || amt <= 0) return;
    const note = prompt("Qeyd:") ?? "";
    setBusy(true);
    const { error } = await supabase.rpc("add_manual_treasury", { _direction: direction, _amount: amt, _note: note });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Əlavə edildi");
    void load();
  };

  const filteredTx = filter === "all" ? txs : txs.filter((t) => t.direction === filter);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground uppercase">Gəlir</div>
          <div className="text-2xl font-extrabold text-green-600">{formatAZN(totals.income)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{range === "7d" ? "Son 7 gün" : range === "30d" ? "Son 30 gün" : "Bütün dövr"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground uppercase">Xərc / Ödəniş</div>
          <div className="text-2xl font-extrabold text-destructive">{formatAZN(totals.expense)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Satıcılara + əl ilə</div>
        </div>
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
          <div className="text-xs text-muted-foreground uppercase">Xalis (Net)</div>
          <div className={`text-2xl font-extrabold ${totals.net >= 0 ? "text-primary" : "text-destructive"}`}>{formatAZN(totals.net)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Kassa nəticəsi</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground uppercase">Satıcılara borc</div>
          <div className="text-2xl font-extrabold text-yellow-600">{formatAZN(sellerOwed)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Bütün satıcı balansları (mövcud + gözləyən)</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Kassa hərəkətləri</h3>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["7d", "30d", "all"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${range === r ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {r === "7d" ? "7 gün" : r === "30d" ? "30 gün" : "Hamısı"}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["all", "in", "out"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {f === "all" ? "Hamısı" : f === "in" ? "Gəlir" : "Xərc"}
                </button>
              ))}
            </div>
            <button onClick={() => addManual("in")} disabled={busy}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-green-600 text-white flex items-center gap-1">
              <Plus className="h-3 w-3" /> Gəlir
            </button>
            <button onClick={() => addManual("out")} disabled={busy}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-destructive text-destructive-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" /> Xərc
            </button>
          </div>
        </div>

        {loading ? <div className="py-8 text-center text-muted-foreground text-sm">Yüklənir...</div> :
         filteredTx.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">Hərəkət yoxdur</div> :
          <div className="divide-y divide-border">
            {filteredTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  {t.direction === "in" ? <ArrowDownLeft className="h-4 w-4 text-green-600 shrink-0" /> : <ArrowUpRight className="h-4 w-4 text-destructive shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{KIND_LABEL[t.kind] ?? t.kind}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.note || "—"} · {formatDateTime(t.created_at)}</div>
                  </div>
                </div>
                <div className={`font-extrabold shrink-0 ${t.direction === "in" ? "text-green-600" : "text-destructive"}`}>
                  {t.direction === "in" ? "+" : "−"}{formatAZN(t.amount)}
                </div>
              </div>
            ))}
          </div>}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3">Ödənilməmiş sifarişlər ({unpaid.length})</h3>
        {unpaid.length === 0 ? <div className="py-6 text-center text-muted-foreground text-sm">Bütün sifarişlər ödənilib 🎉</div> :
          <div className="divide-y divide-border">
            {unpaid.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold">{formatAZN(o.total)} <span className="text-xs text-muted-foreground uppercase ml-1">({o.payment_method})</span></div>
                  <div className="text-xs text-muted-foreground truncate">{o.recipient_name || "—"} · {o.recipient_phone || "—"} · {formatDateTime(o.created_at)}</div>
                </div>
                <button onClick={() => markPaid(o.id)} disabled={busy}
                  className="h-9 px-3 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Ödənildi qeyd et
                </button>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
