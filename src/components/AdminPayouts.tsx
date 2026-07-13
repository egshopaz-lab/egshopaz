import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Wallet, CheckCircle2, XCircle, Clock, Copy } from "lucide-react";

interface RequestRow {
  id: string;
  seller_id: string;
  amount: number;
  method: string;
  iban: string | null;
  card_number: string | null;
  bank_name: string | null;
  account_holder: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  paid_at: string | null;
  shop_name?: string | null;
  full_name?: string | null;
}

interface BalanceRow {
  seller_id: string;
  available: number;
  pending: number;
  total_earned: number;
  shop_name?: string | null;
  full_name?: string | null;
}

export function AdminPayouts() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, b] = await Promise.all([
      supabase.from("payout_requests").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("seller_balances").select("seller_id, available, pending, total_earned").order("available", { ascending: false }),
    ]);
    const sellerIds = new Set<string>();
    (r.data ?? []).forEach((x: any) => sellerIds.add(x.seller_id));
    (b.data ?? []).forEach((x: any) => sellerIds.add(x.seller_id));
    const { data: profs } = sellerIds.size
      ? await supabase.from("profiles").select("id, shop_name, full_name").in("id", Array.from(sellerIds))
      : { data: [] as any };
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p; });

    setRequests((r.data ?? []).map((x: any) => ({ ...x, shop_name: map[x.seller_id]?.shop_name, full_name: map[x.seller_id]?.full_name })));
    setBalances((b.data ?? []).map((x: any) => ({ ...x, shop_name: map[x.seller_id]?.shop_name, full_name: map[x.seller_id]?.full_name })));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    const note = approve
      ? (prompt("Qeyd (məsələn: bank köçürmə referansı)") ?? "")
      : (prompt("Rədd səbəbi:") ?? "");
    if (!approve && !note.trim()) return toast.error("Səbəb daxil edin");
    const { error } = await supabase.rpc("complete_payout_request", { _id: id, _approve: approve, _note: note || undefined });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Ödənildi olaraq qeyd olundu" : "Rədd edildi");
    void load();
  };

  const runAutoPayout = async () => {
    if (!confirm("3 gündən köhnə təhvil verilmiş sifarişləri satıcı balansına köçürək?")) return;
    setRunning(true);
    const { data, error } = await supabase.rpc("auto_payout_after_3_days");
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} sifariş emal edildi`);
    void load();
  };

  const copy = (s: string | null) => {
    if (!s) return;
    navigator.clipboard.writeText(s);
    toast.success("Kopyalandı");
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const totalPending = requests.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
  const totalAvail = balances.reduce((s, b) => s + Number(b.available), 0);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Gözləyən tələblər</div>
          <div className="text-3xl font-extrabold text-yellow-600">{formatAZN(totalPending)}</div>
          <div className="text-xs text-muted-foreground mt-1">{requests.filter((r) => r.status === "pending").length} tələb</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Bütün satıcı balansları</div>
          <div className="text-3xl font-extrabold">{formatAZN(totalAvail)}</div>
          <div className="text-xs text-muted-foreground mt-1">{balances.length} satıcı</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Avtomatik payout</div>
            <div className="text-xs text-muted-foreground mt-1">Hər gün 02:00-da işləyir. Əl ilə də işə sala bilərsən.</div>
          </div>
          <button onClick={runAutoPayout} disabled={running}
            className="mt-3 h-10 rounded-lg bg-primary text-primary-foreground font-bold disabled:opacity-50">
            {running ? "İşləyir..." : "İndi işə sal"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Çıxarış tələbləri</h3>
          <div className="flex gap-1">
            {(["pending", "paid", "rejected", "all"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {s === "pending" ? "Gözləyən" : s === "paid" ? "Ödənilib" : s === "rejected" ? "Rədd" : "Hamısı"}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div className="text-center py-8 text-muted-foreground">Yüklənir...</div> :
         filtered.length === 0 ? <div className="text-center py-8 text-muted-foreground">Tələb yoxdur</div> :
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-bold">{r.shop_name || r.full_name || r.seller_id.slice(0, 8)}</div>
                    <div className="text-2xl font-extrabold text-primary">{formatAZN(r.amount)}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</div>
                  </div>
                  <div className="text-sm">
                    {r.status === "pending" && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/15 text-yellow-700 text-xs"><Clock className="h-3 w-3" />Gözləyir</span>}
                    {r.status === "paid" && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/15 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3" />Ödənilib {r.paid_at ? `· ${formatDateTime(r.paid_at)}` : ""}</span>}
                    {r.status === "rejected" && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/15 text-destructive text-xs"><XCircle className="h-3 w-3" />Rədd</span>}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mt-3 text-sm">
                  <div className="rounded-md bg-secondary/40 p-2">
                    <div className="text-xs text-muted-foreground">Hesab sahibi</div>
                    <div className="font-mono">{r.account_holder || "—"}</div>
                  </div>
                  <div className="rounded-md bg-secondary/40 p-2">
                    <div className="text-xs text-muted-foreground uppercase">{r.method}</div>
                    <div className="font-mono flex items-center gap-2 break-all">
                      {r.method === "iban" ? (r.iban || "—") : (r.card_number || "—")}
                      <button onClick={() => copy(r.method === "iban" ? r.iban : r.card_number)} className="shrink-0 p-1 hover:bg-background rounded">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {r.bank_name && <div className="text-xs text-muted-foreground mt-1">{r.bank_name}</div>}
                  </div>
                </div>
                {r.admin_note && <div className="text-xs mt-2 text-muted-foreground">📝 {r.admin_note}</div>}
                {r.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => decide(r.id, true)} className="flex-1 h-10 rounded-lg bg-green-600 text-white font-bold text-sm">
                      ✅ Ödənildi
                    </button>
                    <button onClick={() => decide(r.id, false)} className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground font-bold text-sm">
                      ❌ Rədd et
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-bold mb-3">Satıcı balansları</h3>
        {balances.length === 0 ? <div className="text-center py-6 text-muted-foreground text-sm">Hələ balans yoxdur</div> :
          <div className="space-y-2">
            {balances.map((b) => (
              <div key={b.seller_id} className="flex items-center justify-between gap-3 pb-2 border-b border-border last:border-0 text-sm">
                <div className="min-w-0 truncate">{b.shop_name || b.full_name || b.seller_id.slice(0, 8)}</div>
                <div className="flex gap-4 shrink-0">
                  <div><span className="text-xs text-muted-foreground">Mövcud:</span> <b className="text-primary">{formatAZN(b.available)}</b></div>
                  <div><span className="text-xs text-muted-foreground">Gözləyir:</span> <b>{formatAZN(b.pending)}</b></div>
                  <div className="hidden sm:block"><span className="text-xs text-muted-foreground">Ümumi:</span> <b>{formatAZN(b.total_earned)}</b></div>
                </div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
