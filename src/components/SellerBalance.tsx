import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Wallet,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  ReceiptText,
  Percent,
  TrendingUp,
} from "lucide-react";

interface Props { sellerId: string }

interface Balance { available: number; pending: number; total_earned: number }
interface Payout { id: string; order_item_id: string; amount: number; commission: number; net_amount: number; created_at: string; status: string }
interface Request { id: string; amount: number; method: string; status: string; admin_note: string | null; created_at: string; paid_at: string | null }

export function SellerBalance({ sellerId }: Props) {
  const [bal, setBal] = useState<Balance>({ available: 0, pending: 0, total_earned: 0 });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [minPayout, setMinPayout] = useState(50);
  const [commission, setCommission] = useState(10);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPayoutInfo, setHasPayoutInfo] = useState(false);
  const [period, setPeriod] = useState<"30" | "90" | "all">("30");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const [b, p, r, s, prof] = await Promise.all([
      supabase.from("seller_balances").select("available, pending, total_earned").eq("seller_id", sellerId).maybeSingle(),
      supabase.from("payouts").select("id, order_item_id, amount, commission, net_amount, created_at, status").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(500),
      supabase.from("payout_requests").select("id, amount, method, status, admin_note, created_at, paid_at").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(200),
      supabase.from("system_settings").select("min_payout, commission_percent").limit(1).maybeSingle(),
      supabase.from("profiles").select("payout_method, iban, card_number").eq("id", sellerId).maybeSingle(),
    ]);
    const error = b.error ?? p.error ?? r.error ?? s.error ?? prof.error;
    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }
    setBal({
      available: Number(b.data?.available ?? 0),
      pending: Number(b.data?.pending ?? 0),
      total_earned: Number(b.data?.total_earned ?? 0),
    });
    setPayouts((p.data ?? []) as Payout[]);
    setRequests((r.data ?? []) as Request[]);
    setMinPayout(Number(s.data?.min_payout ?? 50));
    setCommission(Number(s.data?.commission_percent ?? 10));
    const m = (prof.data as any)?.payout_method ?? "iban";
    const ok = m === "iban" ? !!(prof.data as any)?.iban : !!(prof.data as any)?.card_number;
    setHasPayoutInfo(ok);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [sellerId]);

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Məbləğ daxil edin");
    if (n < minPayout) return toast.error(`Minimum çıxarış: ${minPayout} AZN`);
    if (n > bal.available) return toast.error("Balans kifayət deyil");
    if (!hasPayoutInfo) return toast.error("Profildə IBAN/kart məlumatlarını doldurun");
    setBusy(true);
    const { error } = await supabase.rpc("request_payout", { _amount: n });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Çıxarış tələbi göndərildi");
    setAmount("");
    void load();
  };

  const statusBadge = (s: string) => {
    if (s === "pending") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-700"><Clock className="h-3 w-3" />Gözləyir</span>;
    if (s === "paid" || s === "completed") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-700"><CheckCircle2 className="h-3 w-3" />Ödənilib</span>;
    if (s === "rejected") return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-destructive/15 text-destructive"><XCircle className="h-3 w-3" />Rədd</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-secondary">{s}</span>;
  };

  const filteredPayouts = useMemo(() => {
    if (period === "all") return payouts;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - Number(period));
    return payouts.filter((payout) => new Date(payout.created_at).getTime() >= threshold.getTime());
  }, [payouts, period]);

  const accounting = useMemo(
    () =>
      filteredPayouts.reduce(
        (totals, payout) => ({
          gross: totals.gross + Number(payout.amount),
          commission: totals.commission + Number(payout.commission),
          net: totals.net + Number(payout.net_amount),
        }),
        { gross: 0, commission: 0, net: 0 },
      ),
    [filteredPayouts],
  );

  const exportStatement = () => {
    const header = ["Tarix", "Əməliyyat ID", "Sifariş sətri", "Brüt", "Komissiya", "Xalis", "Status"];
    const rows = filteredPayouts.map((payout) => [
      new Date(payout.created_at).toLocaleString("az-AZ"),
      payout.id,
      payout.order_item_id,
      Number(payout.amount).toFixed(2),
      Number(payout.commission).toFixed(2),
      Number(payout.net_amount).toFixed(2),
      payout.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `egshop-maliyye-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Maliyyə məlumatları yüklənir">
        <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <div className="font-black text-destructive">Maliyyə məlumatları yüklənmədi</div>
        <div className="mt-1 text-sm text-muted-foreground">{loadError}</div>
        <button onClick={() => void load()} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          Yenidən yoxla
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Maliyyə və hesablaşmalar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Satış dövriyyəsi, komissiyalar, xalis gəlir və çıxarışları mühasibat prinsipi ilə izləyin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-bold"
          >
            <option value="30">Son 30 gün</option>
            <option value="90">Son 90 gün</option>
            <option value="all">Bütün dövr</option>
          </select>
          <button
            onClick={exportStatement}
            disabled={filteredPayouts.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV çıxarış
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Wallet className="h-4 w-4" /> Mövcud balans</div>
          <div className="text-3xl font-extrabold text-primary">{formatAZN(bal.available)}</div>
          <div className="text-xs text-muted-foreground mt-1">Çıxarışa hazır</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock className="h-4 w-4" /> Gözləmədə</div>
          <div className="text-3xl font-extrabold">{formatAZN(bal.pending)}</div>
          <div className="text-xs text-muted-foreground mt-1">Çıxarış tələbi və ya 3 gün gözləyir</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><CheckCircle2 className="h-4 w-4" /> Ümumi qazanc</div>
          <div className="text-3xl font-extrabold">{formatAZN(bal.total_earned)}</div>
          <div className="text-xs text-muted-foreground mt-1">Komissiya: {commission}%</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Brüt satış", value: accounting.gross, icon: ReceiptText, tone: "text-foreground" },
          { label: "Platforma komissiyası", value: accounting.commission, icon: Percent, tone: "text-destructive" },
          { label: "Xalis gəlir", value: accounting.net, icon: TrendingUp, tone: "text-emerald-700" },
          {
            label: "Effektiv komissiya",
            value: accounting.gross > 0 ? (accounting.commission / accounting.gross) * 100 : 0,
            icon: Percent,
            tone: "text-primary",
            percent: true,
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border bg-card p-4">
            <metric.icon className={`h-5 w-5 ${metric.tone}`} />
            <div className="mt-3 text-xs text-muted-foreground">{metric.label}</div>
            <div className={`mt-1 text-xl font-black ${metric.tone}`}>
              {metric.percent ? `${metric.value.toFixed(2)}%` : formatAZN(metric.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-primary" /> Pul çıxarış tələbi</h3>
        {!hasPayoutInfo && (
          <div className="text-sm rounded-md p-3 bg-yellow-500/10 text-yellow-800 mb-3">
            Çıxarış üçün əvvəlcə <b>Mağaza ayarları → Ödəniş hesabı</b> bölməsində IBAN və ya kart məlumatlarınızı daxil edin.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min={minPayout}
            max={bal.available}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min ${minPayout} AZN`}
            className="flex-1 h-11 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy || bal.available < minPayout}
            className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-bold disabled:opacity-50"
          >
            {busy ? "Göndərilir..." : "Tələb göndər"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Sifariş təhvil verildikdən 3 gün sonra pul avtomatik balansa keçir. Çıxarış tələbi admin tərəfindən təsdiqləndikdən sonra bank hesabınıza köçürülür (1-3 iş günü).
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3">Çıxarış tələbləri</h3>
        {requests.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Hələ tələb yoxdur</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 pb-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="font-bold">{formatAZN(r.amount)} <span className="text-xs text-muted-foreground uppercase">({r.method})</span></div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}{r.admin_note ? ` — ${r.admin_note}` : ""}</div>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-5">
          <div>
            <h3 className="font-bold">Maliyyə əməliyyatları</h3>
            <p className="text-xs text-muted-foreground">Sifarişlər üzrə brüt, komissiya və xalis məbləğ</p>
          </div>
          <div className="text-xs font-bold text-muted-foreground">{filteredPayouts.length} əməliyyat</div>
        </div>
        {filteredPayouts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Hələ ödəniş yoxdur</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Tarix</th>
                  <th className="p-3">Əməliyyat</th>
                  <th className="p-3 text-right">Brüt</th>
                  <th className="p-3 text-right">Komissiya</th>
                  <th className="p-3 text-right">Xalis</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="border-t border-border">
                    <td className="p-3">{formatDateTime(payout.created_at)}</td>
                    <td className="p-3">
                      <div className="font-mono text-xs">#{payout.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Sifariş sətri: {payout.order_item_id.slice(0, 8).toUpperCase()}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold">{formatAZN(payout.amount)}</td>
                    <td className="p-3 text-right font-bold text-destructive">
                      -{formatAZN(payout.commission)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      +{formatAZN(payout.net_amount)}
                    </td>
                    <td className="p-3 text-right">{statusBadge(payout.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
