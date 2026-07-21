import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, RefreshCw, Search, Store, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Period = "7d" | "30d" | "90d" | "all";
type Row = Record<string, any>;
const sinceFor = (p: Period) => p === "all" ? null : new Date(Date.now() - Number(p.slice(0, -1)) * 86_400_000).toISOString();
const inPeriod = (date: string | null | undefined, since: string | null) => !since || (!!date && date >= since);
const orderPaid = (x: Row) => x.payment_status === "paid" || ["paid", "delivered", "completed"].includes(x.status);
const paymentPaid = (x: Row) => ["success", "paid", "completed"].includes(x.status);
const money = (rows: Row[], field = "amount") => rows.reduce((sum, x) => sum + Number(x[field] || 0), 0);

function Card({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "good" | "warn" }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`mt-2 text-2xl font-extrabold ${tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
  </div>;
}

export function AdminFinanceCenter({ commissionPercent = 10 }: { commissionPercent?: number }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ orders: [] as Row[], items: [] as Row[], treasury: [] as Row[], balances: [] as Row[], payouts: [] as Row[], epoint: [] as Row[], applications: [] as Row[], subscriptions: [] as Row[], trends: [] as Row[], returns: [] as Row[], profiles: [] as Row[] });

  const load = useCallback(async () => {
    setLoading(true);
    const db = supabase as any;
    const results = await Promise.all([
      db.from("orders").select("id,total,status,payment_status,payment_method,paid_at,created_at").order("created_at", { ascending: false }).limit(2000),
      db.from("order_items").select("id,order_id,seller_id,title,price,quantity,status,payout_status,payout_at").limit(5000),
      db.from("treasury_transactions").select("*").order("created_at", { ascending: false }).limit(3000),
      db.from("seller_balances").select("seller_id,available,pending,total_earned,updated_at"),
      db.from("payout_requests").select("id,seller_id,amount,status,method,created_at,paid_at,admin_note").order("created_at", { ascending: false }).limit(2000),
      db.from("epoint_payment_transactions").select("id,merchant_order_id,amount,currency,status,message,paid_at,returned_at,created_at").order("created_at", { ascending: false }).limit(3000),
      db.from("seller_applications").select("id,user_id,shop_name,registration_fee,payment_status,status,paid_at,created_at").limit(2000),
      db.from("seller_subscriptions").select("id,seller_id,amount,payment_status,is_active,created_at").limit(2000),
      db.from("eg_trends_payments").select("id,seller_id,merchant_order_id,amount,status,paid_at,created_at").limit(2000),
      db.from("returns").select("id,order_id,seller_id,refund_amount,status,created_at,resolved_at").limit(2000),
      db.from("profiles").select("id,shop_name,full_name"),
    ]);
    const failed = results.filter((r) => r.error).map((r) => r.error.message);
    if (failed.length) toast.warning(`Bəzi maliyyə mənbələri oxunmadı: ${failed.join("; ")}`);
    setData({ orders: results[0].data ?? [], items: results[1].data ?? [], treasury: results[2].data ?? [], balances: results[3].data ?? [], payouts: results[4].data ?? [], epoint: results[5].data ?? [], applications: results[6].data ?? [], subscriptions: results[7].data ?? [], trends: results[8].data ?? [], returns: results[9].data ?? [], profiles: results[10].data ?? [] });
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const report = useMemo(() => {
    const since = sinceFor(period);
    const orders = data.orders.filter((x) => inPeriod(x.created_at, since));
    const paidOrders = orders.filter(orderPaid);
    const paidIds = new Set(paidOrders.map((x) => x.id));
    const items = data.items.filter((x) => paidIds.has(x.order_id));
    const gross = money(paidOrders, "total");
    const itemGross = items.reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 0), 0);
    const marketplace = (itemGross || gross) * commissionPercent / 100;
    const registration = money(data.applications.filter((x) => inPeriod(x.paid_at ?? x.created_at, since) && ["paid", "success"].includes(x.payment_status)), "registration_fee");
    const advertising = money(data.subscriptions.filter((x) => inPeriod(x.created_at, since) && ["paid", "success"].includes(x.payment_status)));
    const trends = money(data.trends.filter((x) => inPeriod(x.paid_at ?? x.created_at, since) && paymentPaid(x)));
    const refunds = money(data.returns.filter((x) => inPeriod(x.resolved_at ?? x.created_at, since) && !["rejected", "cancelled"].includes(x.status)), "refund_amount");
    const treasury = data.treasury.filter((x) => inPeriod(x.created_at, since));
    const cashIn = money(treasury.filter((x) => x.direction === "in"));
    const cashOut = money(treasury.filter((x) => x.direction === "out"));
    const paidPayouts = data.payouts.filter((x) => x.status === "paid" && inPeriod(x.paid_at ?? x.created_at, since));
    const pendingPayouts = data.payouts.filter((x) => x.status === "pending" && inPeriod(x.created_at, since));
    const payoutTotal = money(paidPayouts);
    const liability = data.balances.reduce((s, x) => s + Number(x.available || 0) + Number(x.pending || 0), 0);
    const epoint = data.epoint.filter((x) => inPeriod(x.created_at, since));
    const success = epoint.filter(paymentPaid), failed = epoint.filter((x) => ["error", "server_error", "failed"].includes(x.status));
    const epointCollected = money(success);
    const unpaidOrders = orders.filter((x) => !orderPaid(x) && !["cancelled", "returned"].includes(x.status));
    const expectedCollected = gross + registration + advertising + trends;
    return { since, orders, paidOrders, unpaidOrders, pendingPayouts, gross, marketplace, registration, advertising, trends, refunds, treasury, cashIn, cashOut, payoutTotal, liability, epoint, success, failed, epointCollected, expectedCollected, discrepancy: epointCollected - expectedCollected, income: marketplace + registration + advertising + trends };
  }, [commissionPercent, data, period]);

  const profileMap = useMemo(() => Object.fromEntries(data.profiles.map((p) => [p.id, p.shop_name || p.full_name || p.id.slice(0, 8)])), [data.profiles]);
  const sellers = useMemo(() => {
    const map = new Map<string, Row>(); const orderIds = new Set(report.paidOrders.map((x) => x.id));
    const row = (id: string) => map.get(id) ?? { sellerId: id, gross: 0, count: 0, paid: 0, available: 0, pending: 0 };
    data.items.filter((x) => orderIds.has(x.order_id)).forEach((x) => { const r = row(x.seller_id); r.gross += Number(x.price || 0) * Number(x.quantity || 0); r.count += Number(x.quantity || 0); map.set(x.seller_id, r); });
    data.balances.forEach((x) => { const r = row(x.seller_id); r.available = Number(x.available || 0); r.pending = Number(x.pending || 0); map.set(x.seller_id, r); });
    data.payouts.filter((x) => x.status === "paid" && inPeriod(x.paid_at ?? x.created_at, report.since)).forEach((x) => { const r = row(x.seller_id); r.paid += Number(x.amount || 0); map.set(x.seller_id, r); });
    const q = search.trim().toLocaleLowerCase("az");
    return [...map.values()].filter((x) => !q || String(profileMap[x.sellerId] ?? x.sellerId).toLocaleLowerCase("az").includes(q)).sort((a, b) => b.gross - a.gross);
  }, [data, profileMap, report.paidOrders, report.since, search]);

  const dailyRows = useMemo(() => {
    const rows = new Map<string, { date: string; orders: number; gross: number; commission: number }>();
    report.paidOrders.forEach((order) => {
      const date = String(order.paid_at || order.created_at).slice(0, 10);
      const row = rows.get(date) ?? { date, orders: 0, gross: 0, commission: 0 };
      row.orders += 1; row.gross += Number(order.total || 0); row.commission += Number(order.total || 0) * commissionPercent / 100; rows.set(date, row);
    });
    return [...rows.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [commissionPercent, report.paidOrders]);

  const orderRows = useMemo<Row[]>(() => report.orders.map((order: Row) => {
    const items = data.items.filter((item) => item.order_id === order.id);
    const sellerGross = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) || Number(order.total || 0);
    const commission = sellerGross * commissionPercent / 100;
    return { ...order, itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), sellerCount: new Set(items.map((item) => item.seller_id)).size, sellerGross, commission, sellerNet: sellerGross - commission } as Row;
  }), [commissionPercent, data.items, report.orders]);

  const sources = [{ label: "Marketplace komissiyası", value: report.marketplace }, { label: "Satıcı qeydiyyatı", value: report.registration }, { label: "Reklam paketləri", value: report.advertising }, { label: "EG Trends", value: report.trends }];
  const maxSource = Math.max(1, ...sources.map((x) => x.value));
  const exportCsv = () => {
    const cell = (x: unknown) => `"${String(x ?? "").replaceAll('"', '""')}"`;
    const rows = [["Satıcı", "Satış", "Təxmini komissiya", "Ödənilib", "Mövcud", "Gözləyir"], ...sellers.map((x) => [profileMap[x.sellerId] ?? x.sellerId, x.gross, x.gross * commissionPercent / 100, x.paid, x.available, x.pending])];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `egshop-maliyye-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">Maliyyə məlumatları yüklənir...</div>;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"><div><h2 className="text-lg font-extrabold">Maliyyə İdarəetmə Mərkəzi</h2><p className="text-xs text-muted-foreground">Sifariş, Epoint, xəzinə, balans və gəlirlər bir ekranda.</p></div><div className="flex flex-wrap gap-2">{(["7d", "30d", "90d", "all"] as Period[]).map((p) => <button key={p} onClick={() => setPeriod(p)} className={`h-9 rounded-lg px-3 text-xs font-bold ${period === p ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{p === "all" ? "Bütün dövr" : p.replace("d", " gün")}</button>)}<button onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border"><RefreshCw className="h-4 w-4" /></button><button onClick={exportCsv} className="flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold"><Download className="h-4 w-4" />CSV</button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Ödənilmiş satış (GMV)" value={formatAZN(report.gross)} hint={`${report.paidOrders.length} ödənilmiş sifariş`} /><Card label="Platforma gəliri" value={formatAZN(report.income)} hint="Komissiya + xidmət gəlirləri" tone="good" /><Card label="Satıcılara borc" value={formatAZN(report.liability)} hint="Mövcud və gözləyən balans" tone={report.liability ? "warn" : undefined} /><Card label="Geri ödənişlər" value={formatAZN(report.refunds)} hint="Qəbul edilən qaytarmalar" tone={report.refunds ? "warn" : undefined} /><Card label="Xəzinəyə daxilolma" value={formatAZN(report.cashIn)} hint="Real xəzinə hərəkətləri" tone="good" /><Card label="Xəzinədən çıxış" value={formatAZN(report.cashOut)} hint={`Net ${formatAZN(report.cashIn - report.cashOut)}`} /><Card label="Satıcı payout" value={formatAZN(report.payoutTotal)} hint="Ödənilmiş çıxarışlar" /><Card label="Epoint uğuru" value={`${report.epoint.length ? (report.success.length / report.epoint.length * 100).toFixed(1) : "0.0"}%`} hint={`${report.success.length} uğurlu · ${report.failed.length} xətalı`} tone={report.failed.length ? "warn" : "good"} /></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-card p-5"><h3 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp className="h-5 w-5 text-primary" />Gəlir mənbələri</h3><div className="space-y-4">{sources.map((x) => <div key={x.label}><div className="mb-1 flex justify-between text-sm"><span>{x.label}</span><b>{formatAZN(x.value)}</b></div><div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(x.value ? 3 : 0, x.value / maxSource * 100)}%` }} /></div></div>)}</div><div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300"><AlertTriangle className="mr-1 inline h-4 w-4" />Komissiya cari {commissionPercent}% parametrinə əsaslanan idarəetmə təxminidir; rəsmi vergi hesabatı deyil.</div></section>
    <section className="rounded-2xl border border-border bg-card p-5"><h3 className="mb-3 font-bold">Epoint əməliyyat nəzarəti</h3><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-secondary p-3"><small>Cəmi</small><b className="block text-xl">{report.epoint.length}</b></div><div className="rounded-xl bg-emerald-500/10 p-3"><small>Uğurlu</small><b className="block text-xl text-emerald-600">{report.success.length}</b></div><div className="rounded-xl bg-red-500/10 p-3"><small>Xətalı</small><b className="block text-xl text-red-600">{report.failed.length}</b></div></div><div className="mt-2 max-h-52 divide-y overflow-auto">{report.epoint.slice(0, 8).map((x) => <div key={x.id} className="flex justify-between gap-3 py-2 text-xs"><div className="min-w-0"><div className="truncate font-mono">{x.merchant_order_id}</div><div className="truncate text-muted-foreground">{x.message || formatDateTime(x.created_at)}</div></div><div className="text-right"><b>{formatAZN(x.amount)}</b><div>{x.status}</div></div></div>)}</div></section></div>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 font-bold">Maliyyə tutuşdurması və nəzarət</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-secondary/50 p-3"><div className="text-xs text-muted-foreground">Epoint-dən daxil olub</div><b className="text-xl">{formatAZN(report.epointCollected)}</b></div>
        <div className="rounded-xl bg-secondary/50 p-3"><div className="text-xs text-muted-foreground">Sistem üzrə gözlənilən</div><b className="text-xl">{formatAZN(report.expectedCollected)}</b></div>
        <div className={`rounded-xl p-3 ${Math.abs(report.discrepancy) > 0.01 ? "bg-red-500/10" : "bg-emerald-500/10"}`}><div className="text-xs text-muted-foreground">Uyğunsuzluq</div><b className={`text-xl ${Math.abs(report.discrepancy) > 0.01 ? "text-red-600" : "text-emerald-600"}`}>{formatAZN(report.discrepancy)}</b></div>
        <div className="rounded-xl bg-amber-500/10 p-3"><div className="text-xs text-muted-foreground">Gözləyən payout</div><b className="text-xl text-amber-600">{formatAZN(money(report.pendingPayouts))}</b><div className="text-xs text-muted-foreground">{report.pendingPayouts.length} tələb</div></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Uyğunsuzluq Epoint uğurlu əməliyyatlarının cəmi ilə sifariş və xidmət ödənişlərinin sistem cəmi arasındakı nəzarət fərqidir.</p>
    </section>

    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 font-bold">Gündəlik maliyyə dinamikası</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Tarix</th><th>Sifariş sayı</th><th>Satış dövriyyəsi</th><th>Komissiya</th><th>Satıcı neti</th></tr></thead><tbody>{dailyRows.length ? dailyRows.slice(0, 90).map((row) => <tr key={row.date} className="border-b"><td className="py-2 font-semibold">{row.date}</td><td>{row.orders}</td><td>{formatAZN(row.gross)}</td><td className="text-primary">{formatAZN(row.commission)}</td><td>{formatAZN(row.gross - row.commission)}</td></tr>) : <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Bu dövrdə ödənilmiş sifariş yoxdur</td></tr>}</tbody></table></div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Sifariş üzrə maliyyə bölgüsü</h3><span className="text-xs text-muted-foreground">{report.unpaidOrders.length} ödənilməmiş aktiv sifariş</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Sifariş</th><th>Tarix</th><th>Ödəniş</th><th>Status</th><th>Məhsul / satıcı</th><th>Brüt</th><th>Komissiya</th><th>Satıcı neti</th></tr></thead><tbody>{orderRows.slice(0, 300).map((row) => <tr key={row.id} className="border-b"><td className="py-3 font-mono text-xs">{row.id.slice(0, 8)}</td><td className="text-xs">{formatDateTime(row.created_at)}</td><td><span className={`rounded-full px-2 py-1 text-xs ${orderPaid(row) ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{row.payment_status}</span><div className="mt-1 text-[10px] text-muted-foreground">{row.payment_method}</div></td><td className="text-xs">{row.status}</td><td>{row.itemCount} / {row.sellerCount}</td><td className="font-semibold">{formatAZN(row.sellerGross)}</td><td className="text-primary">{formatAZN(row.commission)}</td><td>{formatAZN(row.sellerNet)}</td></tr>)}</tbody></table></div>
    </section>

    <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-bold"><Store className="h-5 w-5 text-primary" />Satıcı maliyyə profilləri</h3><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mağaza axtar..." className="h-9 rounded-lg border bg-background pl-9 pr-3 text-sm" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Mağaza</th><th>Satış</th><th>Məhsul</th><th>Komissiya</th><th>Ödənilib</th><th>Mövcud</th><th>Gözləyir</th></tr></thead><tbody>{sellers.length ? sellers.slice(0, 100).map((x) => <tr key={x.sellerId} className="border-b"><td className="py-3 font-semibold">{profileMap[x.sellerId] ?? x.sellerId.slice(0, 8)}</td><td>{formatAZN(x.gross)}</td><td>{x.count}</td><td>{formatAZN(x.gross * commissionPercent / 100)}</td><td>{formatAZN(x.paid)}</td><td className="text-emerald-600">{formatAZN(x.available)}</td><td className="text-amber-600">{formatAZN(x.pending)}</td></tr>) : <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Maliyyə hərəkəti yoxdur</td></tr>}</tbody></table></div></section>
    <section className="rounded-2xl border border-border bg-card p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><Wallet className="h-5 w-5 text-primary" />Son xəzinə hərəkətləri</h3><div className="max-h-72 divide-y overflow-auto">{report.treasury.slice(0, 30).map((x) => <div key={x.id} className="flex justify-between gap-3 py-2 text-sm"><div className="min-w-0"><b>{x.kind}</b><div className="truncate text-xs text-muted-foreground">{x.note || "Qeyd yoxdur"} · {formatDateTime(x.created_at)}</div></div><b className={x.direction === "in" ? "text-emerald-600" : "text-red-600"}>{x.direction === "in" ? "+" : "−"}{formatAZN(x.amount)}</b></div>)}</div></section>
  </div>;
}

