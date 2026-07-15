import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CalendarPlus, Check, Edit3, Eye, EyeOff, Gift, History, Layers3, Plus, Power, RotateCcw, Sparkles, StopCircle, Trash2, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { toast } from "sonner";

type LooseClient = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };
const db = supabase as unknown as LooseClient;
type View = "subscriptions" | "plans" | "posts" | "history";

interface Plan { id: string; slug: string; name: string; description: string | null; price: number; duration_days: number; campaign_price: number | null; campaign_starts_at: string | null; campaign_ends_at: string | null; is_active: boolean; is_default: boolean; sort_order: number }
interface Seller { id: string; full_name: string | null; shop_name: string | null }
interface Subscription { id: string; seller_id: string; plan_id: string; status: "active" | "passive" | "blocked"; status_reason: string; access_type: "paid" | "free"; starts_at: string | null; ends_at: string | null; admin_note: string | null }
interface Post { id: string; seller_id: string; title: string; body: string; media_url: string | null; status: "visible" | "hidden" | "passive"; created_at: string }
interface HistoryRow { id: string; seller_id: string; plan_id: string | null; event_type: string; access_type: string | null; amount: number | null; note: string | null; created_at: string }
interface PriceRow { id: string; plan_id: string; old_price: number | null; new_price: number; old_campaign_price: number | null; new_campaign_price: number | null; created_at: string }
interface PaymentRow { id: string; seller_id: string; amount: number; status: string; paid_at: string | null; created_at: string }

const inputClass = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
const emptyPlan: Plan = { id: "", slug: "", name: "", description: "", price: 5, duration_days: 30, campaign_price: null, campaign_starts_at: null, campaign_ends_at: null, is_active: true, is_default: false, sort_order: 0 };

export function AdminTrends() {
  const [view, setView] = useState<View>("subscriptions");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDraft, setPlanDraft] = useState<Plan | null>(null);
  const [sellerId, setSellerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [planRows, profileRows, roleRows, subRows, postRows, historyRows, priceRows, paymentRows] = await Promise.all([
      db.from("eg_trends_plans").select("*").order("sort_order"),
      supabase.from("profiles").select("id,full_name,shop_name").order("shop_name"),
      supabase.from("user_roles").select("user_id").eq("role", "seller"),
      db.from("eg_trends_subscriptions").select("*").order("updated_at", { ascending: false }),
      db.from("eg_trends_posts").select("*").order("created_at", { ascending: false }),
      db.from("eg_trends_subscription_history").select("*").order("created_at", { ascending: false }).limit(300),
      db.from("eg_trends_price_history").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("eg_trends_payments").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    const error = planRows.error || profileRows.error || roleRows.error || subRows.error || postRows.error || historyRows.error || priceRows.error || paymentRows.error;
    if (error) toast.error(error.message);
    const sellerIds = new Set((roleRows.data ?? []).map((row: { user_id: string }) => row.user_id));
    setPlans((planRows.data ?? []) as Plan[]);
    setSellers(((profileRows.data ?? []) as Seller[]).filter((row) => sellerIds.has(row.id)));
    setSubscriptions((subRows.data ?? []) as Subscription[]);
    setPosts((postRows.data ?? []) as Post[]);
    setHistory((historyRows.data ?? []) as HistoryRow[]);
    setPrices((priceRows.data ?? []) as PriceRow[]);
    setPayments((paymentRows.data ?? []) as PaymentRow[]);
    if (!planId && planRows.data?.[0]) { setPlanId(planRows.data[0].id); setDays(planRows.data[0].duration_days); }
    setLoading(false);
  }, [planId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel("admin-eg-trends")
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_plans" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_subscriptions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_posts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_payments" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const sellerMap = useMemo(() => new Map(sellers.map((seller) => [seller.id, seller])), [sellers]);
  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const activeCount = subscriptions.filter((row) => row.status === "active" && row.ends_at && new Date(row.ends_at) > new Date()).length;

  const savePlan = async (draft: Plan) => {
    const { data: authData } = await supabase.auth.getUser();
    const payload = {
      slug: draft.slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"), name: draft.name.trim(), description: draft.description?.trim() || null,
      price: Number(draft.price), duration_days: Number(draft.duration_days), campaign_price: draft.campaign_price === null ? null : Number(draft.campaign_price),
      campaign_starts_at: draft.campaign_starts_at || null, campaign_ends_at: draft.campaign_ends_at || null,
      is_active: draft.is_active, is_default: draft.is_default, sort_order: Number(draft.sort_order), updated_by: authData.user?.id ?? null,
    };
    if (!payload.slug || !payload.name) { toast.error("Paket adı və kodu vacibdir"); return; }
    const query = draft.id ? db.from("eg_trends_plans").update(payload).eq("id", draft.id) : db.from("eg_trends_plans").insert(payload);
    const { error } = await query;
    if (error) { toast.error(error.message); return; }
    toast.success(draft.id ? "Paket yeniləndi" : "Paket yaradıldı"); setPlanDraft(null); await load();
  };

  const togglePlan = async (plan: Plan) => { const { error } = await db.from("eg_trends_plans").update({ is_active: !plan.is_active }).eq("id", plan.id); if (error) toast.error(error.message); };
  const deletePlan = async (plan: Plan) => { if (!confirm(`${plan.name} silinsin?`)) return; const { error } = await db.from("eg_trends_plans").delete().eq("id", plan.id); if (error) toast.error(error.message); else toast.success("Paket silindi"); };

  const manage = async (targetSeller: string, action: string, targetPlan = planId, actionDays = days, actionNote = note) => {
    const { error } = await db.rpc("admin_manage_eg_trends_subscription", {
      _seller_id: targetSeller, _action: action, _plan_id: targetPlan || null, _days: actionDays || null, _note: actionNote.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("EG Trends abunəliyi yeniləndi"); setNote(""); await load();
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">EG Trends idarəetməsi yüklənir...</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Reklam / EG Trends</h1><p className="text-sm text-muted-foreground mt-1">Abunə, qiymət, kampaniya, giriş və paylaşımları bir yerdən idarə edin.</p></div><div className="inline-flex p-1 border border-border rounded-md bg-card"><Tab active={view === "subscriptions"} label="Abunələr" icon={Users} onClick={() => setView("subscriptions")} /><Tab active={view === "plans"} label="Paketlər" icon={Layers3} onClick={() => setView("plans")} /><Tab active={view === "posts"} label="Paylaşımlar" icon={Eye} onClick={() => setView("posts")} /><Tab active={view === "history"} label="Tarixçə" icon={History} onClick={() => setView("history")} /></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric label="Aktiv abunə" value={activeCount} /><Metric label="Passiv / blok" value={subscriptions.length - activeCount} /><Metric label="Visible paylaşım" value={posts.filter((post) => post.status === "visible").length} /><Metric label="Hidden / Passive" value={posts.filter((post) => post.status !== "visible").length} /></div>

    {view === "subscriptions" && <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card p-4"><div className="font-black mb-3">Satıcıya giriş təyin et</div><div className="grid md:grid-cols-[1.3fr_1fr_110px_1fr_auto_auto] gap-3 items-end"><Field label="Satıcı"><select className={inputClass} value={sellerId} onChange={(e) => setSellerId(e.target.value)}><option value="">Satıcı seçin</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.shop_name || seller.full_name || seller.id}</option>)}</select></Field><Field label="Paket"><select className={inputClass} value={planId} onChange={(e) => { setPlanId(e.target.value); const p = planMap.get(e.target.value); if (p) setDays(p.duration_days); }}><option value="">Paket seçin</option>{plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></Field><Field label="Gün"><input className={inputClass} type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field><Field label="Admin qeydi"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></Field><button disabled={!sellerId} onClick={() => void manage(sellerId, "activate")} className="h-10 px-3 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50">Aktiv et</button><button disabled={!sellerId} onClick={() => void manage(sellerId, "free")} className="h-10 px-3 rounded-md border border-border font-bold inline-flex items-center gap-1 disabled:opacity-50"><Gift className="h-4 w-4" /> Free</button></div></div>
      <div className="border border-border rounded-lg bg-card overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-secondary/50 text-left"><tr><th className="p-3">Satıcı</th><th className="p-3">Paket</th><th className="p-3">Giriş</th><th className="p-3">Bitmə</th><th className="p-3">Status</th><th className="p-3 text-right">İdarəetmə</th></tr></thead><tbody>{subscriptions.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Abunə yoxdur</td></tr> : subscriptions.map((sub) => { const seller = sellerMap.get(sub.seller_id); const isActive = sub.status === "active" && sub.ends_at && new Date(sub.ends_at) > new Date(); return <tr key={sub.id} className="border-t border-border"><td className="p-3"><div className="font-bold">{seller?.shop_name || seller?.full_name || "Satıcı"}</div><div className="text-xs text-muted-foreground">{sub.status_reason}</div></td><td className="p-3">{planMap.get(sub.plan_id)?.name ?? "—"}</td><td className="p-3">{sub.access_type === "free" ? "Free" : "Paid"}</td><td className="p-3">{sub.ends_at ? formatDate(sub.ends_at) : "—"}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded-full font-bold ${isActive ? "bg-success/10 text-success" : sub.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{isActive ? "Aktiv" : sub.status === "blocked" ? "Blok" : "Passiv"}</span></td><td className="p-3"><div className="flex justify-end gap-2"><IconButton title="30 gün uzat" icon={CalendarPlus} onClick={() => void manage(sub.seller_id, "extend", sub.plan_id, 30)} />{sub.status === "blocked" ? <IconButton title="Girişi bərpa et" icon={RotateCcw} onClick={() => void manage(sub.seller_id, "restore", sub.plan_id, 0)} /> : <><IconButton title="Dayandır" icon={StopCircle} onClick={() => void manage(sub.seller_id, "stop", sub.plan_id, 0)} /><IconButton title="Blokla" icon={Ban} danger onClick={() => void manage(sub.seller_id, "block", sub.plan_id, 0)} /></>}</div></td></tr>; })}</tbody></table></div>
    </div>}

    {view === "plans" && <div className="space-y-4"><div className="flex justify-end"><button onClick={() => setPlanDraft({ ...emptyPlan, sort_order: plans.length })} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Yeni paket</button></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{plans.map((plan) => <div key={plan.id} className="border border-border rounded-lg bg-card p-4"><div className="flex items-start justify-between"><div><h3 className="font-black text-lg">{plan.name}</h3><code className="text-xs text-muted-foreground">{plan.slug}</code></div><span className={`text-xs font-bold ${plan.is_active ? "text-success" : "text-muted-foreground"}`}>{plan.is_active ? "Aktiv" : "Deaktiv"}</span></div><div className="text-2xl font-black mt-4">{formatAZN(plan.campaign_price ?? plan.price)}<span className="text-xs font-normal text-muted-foreground"> / {plan.duration_days} gün</span></div>{plan.campaign_price !== null && <div className="text-xs mt-1"><span className="line-through text-muted-foreground">{formatAZN(plan.price)}</span> <b className="text-success">kampaniya</b></div>}<div className="flex gap-2 mt-4"><button onClick={() => setPlanDraft(plan)} className="h-9 flex-1 rounded-md border border-border font-bold inline-flex items-center justify-center gap-1"><Edit3 className="h-4 w-4" /> Redaktə</button><IconButton title="Aktiv/deaktiv" icon={Power} onClick={() => void togglePlan(plan)} /><IconButton title="Sil" icon={Trash2} danger onClick={() => void deletePlan(plan)} /></div></div>)}</div><PriceHistory rows={prices} planMap={planMap} /></div>}

    {view === "posts" && <div className="border border-border rounded-lg bg-card overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-secondary/50 text-left"><tr><th className="p-3">Paylaşım</th><th className="p-3">Satıcı</th><th className="p-3">Tarix</th><th className="p-3">Status</th></tr></thead><tbody>{posts.map((post) => <tr key={post.id} className="border-t border-border"><td className="p-3"><div className="flex items-center gap-3">{post.media_url && <img src={post.media_url} alt="" className="h-12 w-16 rounded object-cover" />}<div><div className="font-bold">{post.title}</div><div className="text-xs text-muted-foreground line-clamp-1 max-w-xl">{post.body}</div></div></div></td><td className="p-3">{sellerMap.get(post.seller_id)?.shop_name || "Satıcı"}</td><td className="p-3">{formatDate(post.created_at)}</td><td className="p-3"><span className={`text-xs px-2 py-1 rounded-full font-bold ${post.status === "visible" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{post.status === "visible" ? "Visible" : post.status === "hidden" ? "Hidden" : "Passive"}</span></td></tr>)}</tbody></table></div>}

    {view === "history" && <div className="grid xl:grid-cols-2 gap-4"><HistoryTable rows={history} sellerMap={sellerMap} /><PaymentsTable rows={payments} sellerMap={sellerMap} /></div>}
    {planDraft && <PlanModal plan={planDraft} onClose={() => setPlanDraft(null)} onSave={savePlan} />}
  </div>;
}

function Tab({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Users; onClick: () => void }) { return <button onClick={onClick} className={`h-9 px-3 rounded-md text-sm font-bold inline-flex items-center gap-2 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Icon className="h-4 w-4" />{label}</button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-black mt-1">{value}</div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="block text-xs font-bold text-muted-foreground mb-1">{label}</span>{children}</label>; }
function IconButton({ title, icon: Icon, onClick, danger = false }: { title: string; icon: typeof Check; onClick: () => void; danger?: boolean }) { return <button title={title} onClick={onClick} className={`h-9 w-9 rounded-md border inline-flex items-center justify-center ${danger ? "border-destructive/30 text-destructive" : "border-border"}`}><Icon className="h-4 w-4" /></button>; }

function PlanModal({ plan, onClose, onSave }: { plan: Plan; onClose: () => void; onSave: (plan: Plan) => Promise<void> }) {
  const [draft, setDraft] = useState(plan);
  const dateValue = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
  return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onMouseDown={onClose}><div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-lg bg-card border border-border" onMouseDown={(e) => e.stopPropagation()}><div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between"><h3 className="text-xl font-black">{plan.id ? "EG Trends paketini redaktə et" : "Yeni EG Trends paketi"}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="p-5 space-y-4"><div className="grid sm:grid-cols-2 gap-3"><Field label="Paket adı"><input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Sistem kodu"><input disabled={Boolean(plan.id)} className={inputClass} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field></div><Field label="Təsvir"><textarea className="w-full p-3 rounded-md border border-input bg-background text-sm" rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field><div className="grid sm:grid-cols-3 gap-3"><Field label="Aylıq qiymət (₼)"><input type="number" min={0} step="0.01" className={inputClass} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field><Field label="Müddət (gün)"><input type="number" min={1} className={inputClass} value={draft.duration_days} onChange={(e) => setDraft({ ...draft, duration_days: Number(e.target.value) })} /></Field><Field label="Kampaniya qiyməti"><input type="number" min={0} step="0.01" className={inputClass} value={draft.campaign_price ?? ""} onChange={(e) => setDraft({ ...draft, campaign_price: e.target.value === "" ? null : Number(e.target.value) })} /></Field></div><div className="grid sm:grid-cols-2 gap-3"><Field label="Kampaniya başlanğıcı"><input type="datetime-local" className={inputClass} value={dateValue(draft.campaign_starts_at)} onChange={(e) => setDraft({ ...draft, campaign_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field><Field label="Kampaniya sonu"><input type="datetime-local" className={inputClass} value={dateValue(draft.campaign_ends_at)} onChange={(e) => setDraft({ ...draft, campaign_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field></div><div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Aktivdir</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.is_default} onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })} /> Standart paket</label></div><div className="flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-md border border-border font-bold">Ləğv et</button><button onClick={() => void onSave(draft)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold">Yadda saxla</button></div></div></div></div>;
}

function PriceHistory({ rows, planMap }: { rows: PriceRow[]; planMap: Map<string, Plan> }) { return <div className="border border-border rounded-lg bg-card overflow-hidden"><div className="p-4 font-black">Qiymət dəyişiklikləri</div><div className="max-h-72 overflow-auto"><table className="w-full text-sm"><tbody>{rows.length === 0 ? <tr><td className="p-6 text-center text-muted-foreground">Dəyişiklik yoxdur</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3"><b>{planMap.get(row.plan_id)?.name ?? "Paket"}</b><div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div></td><td className="p-3 text-right">{row.old_price !== null ? formatAZN(row.old_price) : "—"} → <b>{formatAZN(row.new_price)}</b>{row.new_campaign_price !== null && <div className="text-xs text-success">Kampaniya: {formatAZN(row.new_campaign_price)}</div>}</td></tr>)}</tbody></table></div></div>; }
function HistoryTable({ rows, sellerMap }: { rows: HistoryRow[]; sellerMap: Map<string, Seller> }) { return <div className="border border-border rounded-lg bg-card overflow-hidden"><div className="p-4 font-black">Abunə tarixçəsi</div><div className="max-h-[520px] overflow-auto"><table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3"><b>{sellerMap.get(row.seller_id)?.shop_name || "Satıcı"}</b><div className="text-xs text-muted-foreground">{row.event_type} · {formatDate(row.created_at)}</div></td><td className="p-3 text-right">{row.amount !== null ? formatAZN(row.amount) : row.access_type ?? "—"}</td></tr>)}</tbody></table></div></div>; }
function PaymentsTable({ rows, sellerMap }: { rows: PaymentRow[]; sellerMap: Map<string, Seller> }) { return <div className="border border-border rounded-lg bg-card overflow-hidden"><div className="p-4 font-black">Ödənişlər</div><div className="max-h-[520px] overflow-auto"><table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3"><b>{sellerMap.get(row.seller_id)?.shop_name || "Satıcı"}</b><div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div></td><td className="p-3">{formatAZN(row.amount)}</td><td className={`p-3 text-right font-bold ${row.status === "success" ? "text-success" : "text-muted-foreground"}`}>{row.status}</td></tr>)}</tbody></table></div></div>; }

