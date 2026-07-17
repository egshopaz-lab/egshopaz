import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, CreditCard, Edit3, Eye, EyeOff, Image, Megaphone, Plus, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAZN, formatDate } from "@/lib/format";
import { getFunctionErrorMessage } from "@/lib/functionError";
import { toast } from "sonner";

type LooseClient = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };
const db = supabase as unknown as LooseClient;

interface Plan { id: string; name: string; description: string | null; price: number; duration_days: number; campaign_price: number | null; campaign_starts_at: string | null; campaign_ends_at: string | null }
interface Subscription { id: string; plan_id: string; status: "active" | "passive" | "blocked"; status_reason: string; access_type: "paid" | "free"; starts_at: string | null; ends_at: string | null; next_payment_at: string | null; admin_note: string | null }
interface TrendPost { id: string; title: string; body: string; media_url: string | null; link_url: string | null; status: "visible" | "hidden" | "passive"; created_at: string; updated_at: string }
interface HistoryRow { id: string; event_type: string; amount: number | null; starts_at: string | null; ends_at: string | null; note: string | null; created_at: string }
interface PaymentRow { id: string; amount: number; currency: string; status: string; paid_at: string | null; created_at: string }

const inputClass = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
const eventLabels: Record<string, string> = {
  activated: "Aktivləşdirildi", renewed: "Yeniləndi", extended: "Uzadıldı", stopped: "Dayandırıldı",
  blocked: "Bloklandı", restored: "Bərpa edildi", expired: "Müddəti bitdi", free_granted: "Free giriş verildi",
  payment_created: "Ödəniş yaradıldı", payment_success: "Ödəniş təsdiqləndi", payment_failed: "Ödəniş alınmadı",
};

function effectivePrice(plan: Plan) {
  const now = Date.now();
  const campaign = plan.campaign_price !== null
    && (!plan.campaign_starts_at || new Date(plan.campaign_starts_at).getTime() <= now)
    && (!plan.campaign_ends_at || new Date(plan.campaign_ends_at).getTime() > now);
  return campaign ? Number(plan.campaign_price) : Number(plan.price);
}

export function SellerTrends({ sellerId }: { sellerId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [posts, setPosts] = useState<TrendPost[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [planRows, subRow, postRows, historyRows, paymentRows] = await Promise.all([
      db.from("eg_trends_plans").select("*").eq("is_active", true).order("sort_order"),
      db.from("eg_trends_subscriptions").select("*").eq("seller_id", sellerId).maybeSingle(),
      db.from("eg_trends_posts").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }),
      db.from("eg_trends_subscription_history").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100),
      db.from("eg_trends_payments").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100),
    ]);
    const error = planRows.error || subRow.error || postRows.error || historyRows.error || paymentRows.error;
    if (error) toast.error(error.message);
    setPlans((planRows.data ?? []) as Plan[]);
    setSubscription((subRow.data ?? null) as Subscription | null);
    setPosts((postRows.data ?? []) as TrendPost[]);
    setHistory((historyRows.data ?? []) as HistoryRow[]);
    setPayments((paymentRows.data ?? []) as PaymentRow[]);
    setLoading(false);
  }, [sellerId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`seller-eg-trends-${sellerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_subscriptions", filter: `seller_id=eq.${sellerId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_posts", filter: `seller_id=eq.${sellerId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "eg_trends_payments", filter: `seller_id=eq.${sellerId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, sellerId]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("trends_payment");
    if (result === "success") toast.success("Ödəniş nəticəsi yoxlanılır. Epoint təsdiqindən sonra giriş avtomatik açılacaq.");
    if (result === "error") toast.error("Ödəniş tamamlanmadı");
    if (!result) return;
    const interval = window.setInterval(() => void load(), 2500);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 60_000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [load]);

  const active = Boolean(subscription?.status === "active" && subscription.ends_at && new Date(subscription.ends_at) > new Date());
  const stats = useMemo(() => ({
    total: posts.length,
    visible: posts.filter((post) => post.status === "visible").length,
    hidden: posts.filter((post) => post.status !== "visible").length,
  }), [posts]);

  const startPayment = async (plan: Plan) => {
    if (subscription?.status === "blocked") { toast.error("EG Trends girişiniz admin tərəfindən bloklanıb"); return; }
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("trends-payment-init", {
      body: { plan_id: plan.id, language: "az" },
    });
    if (error || !data?.redirect_url) {
      const message = data?.error === "access_blocked"
        ? "EG Trends girişiniz bloklanıb"
        : error
          ? await getFunctionErrorMessage(error, "Ödəniş səhifəsi açıla bilmədi")
          : typeof data?.error === "string" ? data.error : "Ödəniş səhifəsi açıla bilmədi";
      toast.error(message);
      setPaying(false);
      return;
    }
    window.location.assign(data.redirect_url as string);
  };

  const resetForm = () => { setEditingId(null); setTitle(""); setBody(""); setMediaUrl(""); setLinkUrl(""); };
  const editPost = (post: TrendPost) => { setEditingId(post.id); setTitle(post.title); setBody(post.body); setMediaUrl(post.media_url ?? ""); setLinkUrl(post.link_url ?? ""); };

  const uploadImage = async (file: File) => {
    if (!active) return;
    if (!file.type.startsWith("image/") || file.size > 6 * 1024 * 1024) { toast.error("6 MB-dan kiçik şəkil seçin"); return; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${sellerId}/trends-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setMediaUrl(data.publicUrl);
  };

  const savePost = async () => {
    if (!active) { toast.error("Aktiv EG Trends abunəliyi tələb olunur"); return; }
    if (title.trim().length < 3 || body.trim().length < 3) { toast.error("Başlıq və mətn daxil edin"); return; }
    setSaving(true);
    const payload = { seller_id: sellerId, title: title.trim(), body: body.trim(), media_url: mediaUrl.trim() || null, link_url: linkUrl.trim() || null };
    const query = editingId ? db.from("eg_trends_posts").update(payload).eq("id", editingId) : db.from("eg_trends_posts").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Paylaşım yeniləndi" : "Paylaşım yayımlandı");
    resetForm();
    await load();
  };

  const deletePost = async (post: TrendPost) => {
    if (!confirm("Bu paylaşım silinsin?")) return;
    const { error } = await db.from("eg_trends_posts").delete().eq("id", post.id);
    if (error) toast.error(error.message); else { toast.success("Paylaşım silindi"); await load(); }
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">EG Trends yüklənir...</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> EG Trends</h1><p className="text-sm text-muted-foreground mt-1">Mağazanızın yeniliklərini EG Shop auditoriyası ilə paylaşın.</p></div>
      <span className={`px-3 py-1.5 rounded-full text-xs font-black ${active ? "bg-success/10 text-success" : subscription?.status === "blocked" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
        {active ? "Aktiv" : subscription?.status === "blocked" ? "Bloklanıb" : "Passiv"}
      </span>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Stat label="Status" value={active ? "Aktiv" : "Passiv"} icon={Check} />
      <Stat label="Bitmə tarixi" value={subscription?.ends_at ? formatDate(subscription.ends_at) : "—"} icon={CalendarDays} />
      <Stat label="Növbəti ödəniş" value={subscription?.next_payment_at ? formatDate(subscription.next_payment_at) : "—"} icon={CreditCard} />
      <Stat label="Görünən" value={String(stats.visible)} icon={Eye} />
      <Stat label="Gizli / passiv" value={String(stats.hidden)} icon={EyeOff} />
    </div>

    {!active ? <div className="border border-border rounded-lg bg-card p-5 space-y-4">
      <div><h2 className="font-black text-lg">Aylıq abunə</h2><p className="text-sm text-muted-foreground">Paylaşımlarınız silinməyib. Abunəni yenilədikdə hamısı avtomatik görünəcək.</p></div>
      {subscription?.status === "blocked" && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive font-semibold">EG Trends girişiniz admin tərəfindən bloklanıb. Dəstək ilə əlaqə saxlayın.</div>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{plans.map((plan) => <div key={plan.id} className="border border-border rounded-lg p-4">
        <div className="font-black">{plan.name}</div><p className="text-xs text-muted-foreground mt-1 min-h-8">{plan.description}</p>
        <div className="text-2xl font-black mt-3">{formatAZN(effectivePrice(plan))}<span className="text-xs font-normal text-muted-foreground"> / {plan.duration_days} gün</span></div>
        {plan.campaign_price !== null && effectivePrice(plan) === Number(plan.campaign_price) && <div className="text-xs text-success font-bold mt-1">Kampaniya qiyməti</div>}
        <button disabled={paying || subscription?.status === "blocked"} onClick={() => void startPayment(plan)} className="mt-4 h-10 w-full rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50">{paying ? "Yönləndirilir..." : active ? "Uzat" : "Abunə ol"}</button>
      </div>)}</div>
    </div> : <div className="border border-border rounded-lg bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-lg">{editingId ? "Paylaşımı redaktə et" : "Yeni paylaşım"}</h2><p className="text-xs text-muted-foreground">Paylaşım əsas lentdə və EG Trends səhifəsində görünəcək.</p></div>{editingId && <button onClick={resetForm} className="h-9 w-9 rounded-md border border-border inline-flex items-center justify-center"><X className="h-4 w-4" /></button>}</div>
      <div className="grid md:grid-cols-2 gap-3"><label className="block"><span className="text-xs font-bold">Başlıq</span><input maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></label><label className="block"><span className="text-xs font-bold">Keçid linki</span><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={inputClass} placeholder="https://..." /></label></div>
      <label className="block"><span className="text-xs font-bold">Mətn</span><textarea rows={5} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} className="w-full p-3 rounded-md border border-input bg-background text-sm" /></label>
      <div className="flex flex-wrap items-center gap-3"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); }} /><button onClick={() => fileRef.current?.click()} className="h-10 px-3 rounded-md border border-border font-bold inline-flex items-center gap-2"><Image className="h-4 w-4" /> Şəkil seç</button>{mediaUrl && <span className="text-xs text-success font-bold">Şəkil hazırdır</span>}<button disabled={saving} onClick={() => void savePost()} className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 ml-auto"><Megaphone className="h-4 w-4" /> {saving ? "Saxlanılır..." : editingId ? "Yenilə" : "Paylaş"}</button></div>
    </div>}

    {active && <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-black">Paylaşımlarım</h2><span className="text-xs text-muted-foreground">{stats.total} paylaşım</span></div>{posts.length === 0 ? <div className="border border-dashed border-border rounded-lg p-10 text-center text-muted-foreground">Hələ paylaşım yoxdur</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{posts.map((post) => <div key={post.id} className="border border-border rounded-lg bg-card overflow-hidden">{post.media_url && <img src={post.media_url} alt="" className="w-full aspect-video object-cover" />}<div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-black">{post.title}</h3><Status status={post.status} /></div><p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.body}</p><div className="text-xs text-muted-foreground mt-3">{formatDate(post.created_at)}</div></div><div className="border-t border-border p-3 flex gap-2"><button onClick={() => editPost(post)} className="h-9 flex-1 rounded-md border border-border font-bold inline-flex items-center justify-center gap-1"><Edit3 className="h-4 w-4" /> Redaktə</button><button onClick={() => void deletePost(post)} className="h-9 w-9 rounded-md border border-destructive/30 text-destructive inline-flex items-center justify-center"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</div>}

    <div className="grid xl:grid-cols-2 gap-4"><HistoryTable rows={history} /><PaymentTable rows={payments} /></div>
  </div>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) { return <div className="border border-border rounded-lg bg-card p-3 min-w-0"><Icon className="h-4 w-4 text-primary mb-2" /><div className="text-xs text-muted-foreground">{label}</div><div className="font-black truncate">{value}</div></div>; }
function Status({ status }: { status: TrendPost["status"] }) { const label = status === "visible" ? "Visible" : status === "hidden" ? "Hidden" : "Passive"; return <span className={`text-[10px] px-2 py-1 rounded-full font-black ${status === "visible" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{label}</span>; }
function HistoryTable({ rows }: { rows: HistoryRow[] }) { return <div className="border border-border rounded-lg bg-card overflow-hidden"><div className="p-4 font-black">Abunə tarixçəsi</div><div className="max-h-72 overflow-auto"><table className="w-full text-sm"><tbody>{rows.length === 0 ? <tr><td className="p-6 text-center text-muted-foreground">Tarixçə yoxdur</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3"><div className="font-semibold">{eventLabels[row.event_type] ?? row.event_type}</div><div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div></td><td className="p-3 text-right">{row.amount !== null ? formatAZN(row.amount) : row.ends_at ? `→ ${formatDate(row.ends_at)}` : "—"}</td></tr>)}</tbody></table></div></div>; }
function PaymentTable({ rows }: { rows: PaymentRow[] }) { return <div className="border border-border rounded-lg bg-card overflow-hidden"><div className="p-4 font-black">Ödənişlər</div><div className="max-h-72 overflow-auto"><table className="w-full text-sm"><tbody>{rows.length === 0 ? <tr><td className="p-6 text-center text-muted-foreground">Ödəniş yoxdur</td></tr> : rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3"><div className="font-semibold">{formatAZN(row.amount)}</div><div className="text-xs text-muted-foreground">{formatDate(row.created_at)}</div></td><td className="p-3 text-right"><span className={`text-xs font-bold ${row.status === "success" ? "text-success" : "text-muted-foreground"}`}>{row.status}</span></td></tr>)}</tbody></table></div></div>; }

