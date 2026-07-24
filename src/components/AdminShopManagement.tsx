import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, Edit3, ExternalLink, Eye, PackageCheck, PackageX, Power, RotateCcw, Search, ShieldAlert, Store, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";

type ShopRow = {
  seller_id: string; email: string; full_name: string | null; phone: string | null;
  shop_name: string | null; shop_city: string | null; shop_logo_url: string | null;
  account_status: string; seller_status: string | null; payment_status: string | null;
  registration_fee: number | null; paid_at: string | null; product_access_override: boolean;
  created_at: string; last_active_at: string | null; products_total: number; products_active: number;
  products_pending: number; orders_total: number; revenue: number; rating: number;
  reviews_total: number; disputes_open: number; tickets_open: number;
};

type ShopDetail = {
  profile: Record<string, unknown> & { email?: string; shop_name?: string; full_name?: string; phone?: string; shop_city?: string; shop_address?: string; shop_email?: string; shop_description?: string; shop_logo_url?: string; shop_banner_url?: string; voen?: string; account_status?: string };
  seller_application: Record<string, unknown> | null;
  products: Array<{ id: string; title: string; price: number; stock: number; image_url: string | null; is_active: boolean; moderation_status: string; moderation_reason: string | null; created_at: string }>;
  orders: Array<{ id: string; status: string; total: number; item_count: number; created_at: string }>;
  reviews: Array<{ id: string; rating: number; comment: string | null; product_title: string; created_at: string }>;
  disputes: Array<{ id: string; status: string; reason: string; description?: string; created_at: string }>;
  tickets: Array<{ id: string; status: string; subject: string; message: string; created_at: string }>;
  notes: Array<{ id: string; note: string; created_at: string }>;
  audit: Array<{ id: string; action: string; reason: string | null; created_at: string }>;
};

const paid = (status: string | null) => status === "success" || status === "migrated";
const accountLabel: Record<string, string> = { active: "Aktiv", inactive: "Passiv", temporary_blocked: "Müvəqqəti blok", permanent_blocked: "Daimi blok" };
const tabLabels = { overview: "Ümumi", products: "Məhsullar", orders: "Sifarişlər", support: "Şikayət və dəstək", audit: "Qeydlər və audit" } as const;
type DetailTab = keyof typeof tabLabels;

export function AdminShopManagement() {
  const [rows, setRows] = useState<ShopRow[]>([]);
  const [search, setSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [sellerStatus, setSellerStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShopRow | null>(null);
  const [detail, setDetail] = useState<ShopDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_shops" as never, {
      _search: search.trim() || null, _account_status: accountStatus || null,
      _seller_status: sellerStatus || null, _payment_status: paymentStatus || null, _limit: 300,
    } as never);
    if (error) toast.error(error.message);
    const nextRows = (data ?? []) as unknown as ShopRow[];
    setRows(nextRows);
    setSelected((current) => current ? (nextRows.find((row) => row.seller_id === current.seller_id) ?? current) : null);
    setLoading(false);
  }, [accountStatus, paymentStatus, search, sellerStatus]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const { data, error } = await supabase.rpc("admin_shop_360" as never, { _seller_id: id } as never);
    if (error) toast.error(error.message);
    setDetail((data ?? null) as unknown as ShopDetail | null);
    setDetailLoading(false);
  }, []);

  const openDetail = (row: ShopRow) => {
    setSelected(row); setDetail(null); setDetailTab("overview"); void loadDetail(row.seller_id);
  };

  const invokeAccountAction = async (action: string, reason?: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: { target_user_id: selected.seller_id, action, reason: reason || null, ...extra },
    });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error ?? error?.message ?? "Əməliyyat alınmadı"); return; }
    toast.success("Dəyişiklik tətbiq edildi və Audit Log-a yazıldı");
    if (action === "hard_delete") { setSelected(null); setDetail(null); await load(); return; }
    await Promise.all([load(), loadDetail(selected.seller_id)]);
  };

  const askReason = (action: string, message: string, defaultValue = "", extra: Record<string, unknown> = {}) => {
    const reason = window.prompt(message, defaultValue); if (reason === null) return; void invokeAccountAction(action, reason, extra);
  };

  const toggleProductAccess = async () => {
    if (!selected) return;
    const granting = !selected.product_access_override;
    const reason = window.prompt(granting ? "Xüsusi məhsul icazəsinin səbəbi:" : "İcazənin ləğv səbəbi:", granting ? "Admin tərəfindən xüsusi icazə" : "");
    if (reason === null) return;
    setBusy("product_access");
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData.user?.id;
    if (!adminId) {
      setBusy(null);
      toast.error("Admin sessiyası tapılmadı");
      return;
    }
    const { error } = await supabase.rpc("admin_set_seller_product_access" as never, {
      _admin_id: adminId,
      _target_id: selected.seller_id,
      _allowed: granting,
      _reason: reason,
      _admin_email: authData.user?.email ?? null,
      _ip_address: null,
      _user_agent: navigator.userAgent,
    } as never);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(granting ? "Məhsul yerləşdirmə icazəsi verildi" : "Məhsul yerləşdirmə icazəsi ləğv edildi");
    await Promise.all([load(), loadDetail(selected.seller_id)]);
  };

  const editShop = async () => {
    if (!selected || !detail) return;
    const p = detail.profile;
    const fields: Array<[string, string, string]> = [
      ["shop_name", "Mağaza adı", String(p.shop_name ?? "")], ["full_name", "Sahibin adı", String(p.full_name ?? "")],
      ["phone", "Telefon", String(p.phone ?? "")], ["shop_email", "Mağaza e-poçtu", String(p.shop_email ?? "")],
      ["shop_city", "Şəhər", String(p.shop_city ?? "")], ["shop_address", "Ünvan", String(p.shop_address ?? "")],
      ["voen", "VÖEN", String(p.voen ?? "")], ["shop_description", "Təsvir", String(p.shop_description ?? "")],
      ["shop_logo_url", "Loqo URL", String(p.shop_logo_url ?? "")], ["shop_banner_url", "Banner URL", String(p.shop_banner_url ?? "")],
    ];
    const patch: Record<string, string> = {};
    for (const [key, label, value] of fields) { const next = window.prompt(`${label}:`, value); if (next === null) return; patch[key] = next; }
    const reason = window.prompt("Dəyişiklik səbəbi:", "Mağaza məlumatları yeniləndi"); if (reason === null) return;
    setBusy("edit");
    const { data, error } = await supabase.rpc("admin_update_shop" as never, { _seller_id: selected.seller_id, _patch: patch, _reason: reason } as never);
    setBusy(null);
    if (error || !(data as { ok?: boolean } | null)?.ok) { toast.error(error?.message ?? "Yenilənmə alınmadı"); return; }
    toast.success("Mağaza məlumatları yeniləndi"); await Promise.all([load(), loadDetail(selected.seller_id)]);
  };

  const moderateProduct = async (productId: string, action: "approve" | "reject" | "deactivate") => {
    const reason = action === "reject" ? window.prompt("Rədd səbəbi:", "Tələblərə uyğun deyil") : null;
    if (action === "reject" && reason === null) return;
    setBusy(productId);
    const { error } = await supabase.rpc("admin_bulk_operational_action" as never, { _entity: "product", _ids: [productId], _action: action, _reason: reason } as never);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Məhsul statusu yeniləndi"); if (selected) await Promise.all([load(), loadDetail(selected.seller_id)]);
  };

  const addNote = async () => {
    if (!selected || note.trim().length < 2) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Admin sessiyası tapılmadı");
    setBusy("note");
    const { error } = await (supabase as any).from("admin_internal_notes").insert({ target_user_id: selected.seller_id, admin_id: auth.user.id, note: note.trim() });
    setBusy(null);
    if (error) return toast.error(error.message);
    setNote(""); toast.success("Daxili qeyd əlavə edildi"); await loadDetail(selected.seller_id);
  };

  const field = (label: string, value: unknown) => <div className="rounded-xl border border-border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold break-words">{String(value || "—")}</div></div>;
  const button = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary disabled:opacity-50";

  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_180px_180px]">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mağaza, sahib, telefon, e-poçt və ya şəhər..." className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3" /></div>
      <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3"><option value="">Bütün hesablar</option><option value="active">Aktiv</option><option value="inactive">Passiv</option><option value="temporary_blocked">Müvəqqəti blok</option><option value="permanent_blocked">Daimi blok</option></select>
      <select value={sellerStatus} onChange={(e) => setSellerStatus(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3"><option value="">Bütün satıcı statusları</option><option value="active">Aktiv</option><option value="pending_payment">Ödəniş gözləyir</option><option value="suspended">Dayandırılıb</option></select>
      <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-11 rounded-lg border border-input bg-background px-3"><option value="">Bütün ödənişlər</option><option value="paid">Ödəniş edilib</option><option value="unpaid">Ödəniş edilməyib</option></select>
    </div>
    <div className="text-sm text-muted-foreground">{rows.length} mağaza · Sətirə və ya mağaza adına vuraraq detalları açın</div>
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[1180px] text-sm"><thead className="bg-secondary/50 text-left"><tr><th className="p-3">Mağaza</th><th className="p-3">Hesab</th><th className="p-3">Ödəniş</th><th className="p-3">Məhsullar</th><th className="p-3">Sifariş / dövriyyə</th><th className="p-3">Reytinq</th><th className="p-3">Risklər</th><th className="p-3">Əməliyyat</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Mağazalar yüklənir...</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Mağaza tapılmadı</td></tr> : rows.map((row) => <tr key={row.seller_id} onClick={() => openDetail(row)} className="cursor-pointer border-t border-border align-top hover:bg-secondary/30">
          <td className="p-3"><div className="flex items-center gap-3">{row.shop_logo_url ? <img src={row.shop_logo_url} alt="" className="h-11 w-11 rounded-xl border object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></span>}<div><button className="font-bold text-primary hover:underline">{row.shop_name ?? "Adsız mağaza"}</button><div className="text-xs text-muted-foreground">{row.shop_city ?? "Şəhər qeyd edilməyib"}</div></div></div></td>
          <td className="p-3"><b>{row.full_name ?? "—"}</b><div className="text-xs text-muted-foreground">{row.email}<br />{row.phone ?? "—"}</div><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${row.account_status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{accountLabel[row.account_status] ?? row.account_status}</span></td>
          <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${paid(row.payment_status) ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{paid(row.payment_status) ? "Ödənilib" : "Ödənilməyib"}</span><div className="mt-2 text-xs">{formatAZN(Number(row.registration_fee ?? 0))}</div>{row.product_access_override && <div className="mt-1 text-xs font-bold text-primary">Xüsusi məhsul icazəsi</div>}</td>
          <td className="p-3"><b>{row.products_total}</b> ümumi<div className="text-xs text-muted-foreground">{row.products_active} aktiv · {row.products_pending} gözləyir</div></td>
          <td className="p-3"><b>{row.orders_total}</b> sifariş<div className="text-xs font-semibold text-success">{formatAZN(Number(row.revenue))}</div></td>
          <td className="p-3"><b>★ {Number(row.rating).toFixed(1)}</b><div className="text-xs text-muted-foreground">{row.reviews_total} rəy</div></td>
          <td className="p-3"><div className={row.disputes_open ? "font-bold text-destructive" : "text-muted-foreground"}>{row.disputes_open} açıq mübahisə</div><div className={row.tickets_open ? "font-bold text-warning" : "text-muted-foreground"}>{row.tickets_open} açıq müraciət</div></td>
          <td className="p-3"><button onClick={(e) => { e.stopPropagation(); openDetail(row); }} className={button}><Eye className="h-3.5 w-3.5" /> Detallı bax</button></td>
        </tr>)}</tbody>
      </table>
    </div>

    {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <header className="flex items-start gap-3 border-b border-border p-4 sm:p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-black">{selected.shop_name ?? "Adsız mağaza"}</h2><p className="text-sm text-muted-foreground">{selected.full_name ?? "—"} · {selected.email}</p></div><a href={`https://egshop.az/shop/${selected.seller_id}`} target="_blank" rel="noreferrer" className={button}><ExternalLink className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Saytda aç</span></a><button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-secondary"><X className="h-5 w-5" /></button></header>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-3">{(Object.keys(tabLabels) as DetailTab[]).map((key) => <button key={key} onClick={() => setDetailTab(key)} className={`whitespace-nowrap rounded-t-xl px-4 py-2 text-sm font-bold ${detailTab === key ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>{tabLabels[key]}</button>)}</div>
        <div className="overflow-y-auto p-4 sm:p-5">{detailLoading || !detail ? <div className="p-12 text-center text-muted-foreground">Detallar yüklənir...</div> : <>
          {detailTab === "overview" && <div className="space-y-5"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{field("Hesab statusu", accountLabel[String(detail.profile.account_status)] ?? detail.profile.account_status)}{field("Satıcı statusu", selected.seller_status)}{field("Ödəniş", paid(selected.payment_status) ? "Ödənilib" : "Ödənilməyib")}{field("Qeydiyyat", formatDate(selected.created_at))}{field("Telefon", detail.profile.phone)}{field("E-poçt", detail.profile.shop_email || detail.profile.email)}{field("Şəhər", detail.profile.shop_city)}{field("Ünvan", detail.profile.shop_address)}{field("VÖEN", detail.profile.voen)}{field("Son aktivlik", selected.last_active_at ? formatDate(selected.last_active_at) : "—")}{field("Məhsullar", selected.products_total)}{field("Dövriyyə", formatAZN(Number(selected.revenue)))}</div>{detail.profile.shop_description && <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Mağaza haqqında</div><p className="mt-2 whitespace-pre-wrap text-sm">{String(detail.profile.shop_description)}</p></div>}<div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={() => void editShop()} className={button}><Edit3 className="h-3.5 w-3.5" /> Məlumatları redaktə et</button>{selected.account_status === "active" ? <button disabled={!!busy} onClick={() => askReason("deactivate", "Passiv etmə səbəbi:")} className={button}><Power className="h-3.5 w-3.5" /> Passiv et</button> : <button disabled={!!busy} onClick={() => void invokeAccountAction("restore", "Admin tərəfindən bərpa edildi")} className={button}><RotateCcw className="h-3.5 w-3.5" /> Aktiv et / bərpa et</button>}<button disabled={!!busy} onClick={() => askReason("temporary_block", "Blok səbəbi:", "Qayda yoxlaması", { block_minutes: 1440 })} className={button}><Ban className="h-3.5 w-3.5" /> 24 saat blokla</button><button disabled={!!busy} onClick={() => askReason("permanent_block", "Daimi blok səbəbi:")} className={`${button} text-destructive`}><ShieldAlert className="h-3.5 w-3.5" /> Daimi blokla</button><button disabled={!!busy || paid(selected.payment_status)} onClick={() => void toggleProductAccess()} className={button}>{selected.product_access_override ? <PackageX className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}{selected.product_access_override ? "Xüsusi icazəni ləğv et" : "Ödənişsiz məhsul icazəsi ver"}</button><button disabled={!!busy} onClick={() => { if (confirm("Bu mağaza və istifadəçi hesabı bütün əlaqəli məlumatlarla tam silinəcək. Davam edilsin?")) askReason("hard_delete", "Tam silinmə səbəbi:"); }} className={`${button} border-destructive/30 text-destructive`}><Trash2 className="h-3.5 w-3.5" /> Tam sil</button></div></div>}
          {detailTab === "products" && <DataTable empty="Bu mağazada məhsul yoxdur" headers={["Məhsul", "Qiymət / stok", "Status", "Tarix", "Nəzarət"]}>{detail.products.map((p) => <tr key={p.id} className="border-t border-border"><td className="p-3"><b>{p.title}</b>{p.moderation_reason && <div className="text-xs text-destructive">{p.moderation_reason}</div>}</td><td className="p-3">{formatAZN(Number(p.price))}<div className="text-xs text-muted-foreground">{p.stock} ədəd</div></td><td className="p-3"><b>{p.moderation_status}</b><div className="text-xs">{p.is_active ? "Aktiv" : "Passiv"}</div></td><td className="p-3 text-xs">{formatDate(p.created_at)}</td><td className="p-3"><div className="flex gap-1"><button disabled={busy === p.id} onClick={() => void moderateProduct(p.id,"approve")} className={button}><CheckCircle2 className="h-3.5 w-3.5" /> Təsdiq</button><button disabled={busy === p.id} onClick={() => void moderateProduct(p.id,"reject")} className={`${button} text-destructive`}>Rədd</button><button disabled={busy === p.id} onClick={() => void moderateProduct(p.id,"deactivate")} className={button}>Passiv</button></div></td></tr>)}</DataTable>}
          {detailTab === "orders" && <DataTable empty="Bu mağazaya aid sifariş yoxdur" headers={["Sifariş", "Status", "Məhsul sayı", "Məbləğ", "Tarix"]}>{detail.orders.map((o) => <tr key={o.id} className="border-t border-border"><td className="p-3 font-mono text-xs">{o.id}</td><td className="p-3 font-bold">{o.status}</td><td className="p-3">{o.item_count}</td><td className="p-3 font-bold">{formatAZN(Number(o.total))}</td><td className="p-3 text-xs">{formatDate(o.created_at)}</td></tr>)}</DataTable>}
          {detailTab === "support" && <div className="grid gap-4 lg:grid-cols-2"><ListCard title={`Mübahisələr (${detail.disputes.length})`} empty="Mübahisə yoxdur">{detail.disputes.map((d) => <div key={d.id} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-2"><b>{d.reason}</b><span className="text-xs font-bold">{d.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{d.description || "Əlavə təsvir yoxdur"}</p><div className="mt-2 text-xs">{formatDate(d.created_at)}</div></div>)}</ListCard><ListCard title={`Dəstək müraciətləri (${detail.tickets.length})`} empty="Müraciət yoxdur">{detail.tickets.map((t) => <div key={t.id} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-2"><b>{t.subject}</b><span className="text-xs font-bold">{t.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{t.message}</p><div className="mt-2 text-xs">{formatDate(t.created_at)}</div></div>)}</ListCard></div>}
          {detailTab === "audit" && <div className="grid gap-4 lg:grid-cols-2"><ListCard title="Daxili admin qeydləri" empty="Daxili qeyd yoxdur"><div className="flex gap-2"><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yalnız adminlərin görə biləcəyi qeyd..." className="min-h-20 flex-1 rounded-xl border border-input bg-background p-3 text-sm" /><button disabled={busy === "note" || note.trim().length < 2} onClick={() => void addNote()} className={button}>Əlavə et</button></div>{detail.notes.map((n) => <div key={n.id} className="rounded-xl border border-border p-3"><p className="text-sm">{n.note}</p><div className="mt-2 text-xs text-muted-foreground">{formatDate(n.created_at)}</div></div>)}</ListCard><ListCard title="Audit tarixçəsi" empty="Audit qeydi yoxdur">{detail.audit.map((a) => <div key={a.id} className="rounded-xl border border-border p-3"><b>{a.action}</b>{a.reason && <p className="mt-1 text-sm text-muted-foreground">{a.reason}</p>}<div className="mt-2 text-xs">{formatDate(a.created_at)}</div></div>)}</ListCard></div>}
        </>}</div>
      </section>
    </div>}
  </div>;
}

function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode[]; empty: string }) {
  return <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[800px] text-sm"><thead className="bg-secondary/50 text-left"><tr>{headers.map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{children.length ? children : <tr><td colSpan={headers.length} className="p-10 text-center text-muted-foreground">{empty}</td></tr>}</tbody></table></div>;
}

function ListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] | React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return <section className="space-y-3 rounded-2xl border border-border p-4"><h3 className="font-black">{title}</h3>{items.length ? items : <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>}</section>;
}
