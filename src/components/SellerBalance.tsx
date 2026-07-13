import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, Clock, CheckCircle2, XCircle } from "lucide-react";

interface Props { sellerId: string }

interface Balance { available: number; pending: number; total_earned: number }
interface Payout { id: string; amount: number; commission: number; net_amount: number; created_at: string; status: string }
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

  const load = async () => {
    const [b, p, r, s, prof] = await Promise.all([
      supabase.from("seller_balances").select("available, pending, total_earned").eq("seller_id", sellerId).maybeSingle(),
      supabase.from("payouts").select("id, amount, commission, net_amount, created_at, status").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20),
      supabase.from("payout_requests").select("id, amount, method, status, admin_note, created_at, paid_at").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20),
      supabase.from("system_settings").select("min_payout, commission_percent").limit(1).maybeSingle(),
      supabase.from("profiles").select("payout_method, iban, card_number").eq("id", sellerId).maybeSingle(),
    ]);
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

  return (
    <div className="space-y-6">
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

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3">Avtomatik ödəniş tarixçəsi (sifarişlərdən)</h3>
        {payouts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Hələ ödəniş yoxdur</div>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 pb-2 border-b border-border last:border-0 text-sm">
                <div className="min-w-0">
                  <div>Brüt: <b>{formatAZN(p.amount)}</b> · Komissiya: <span className="text-destructive">-{formatAZN(p.commission)}</span></div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</div>
                </div>
                <div className="font-bold text-primary">+{formatAZN(p.net_amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
