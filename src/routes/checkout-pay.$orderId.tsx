import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Lock, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout-pay/$orderId")({
  head: () => ({ meta: [{ title: "Ödəniş — EG Shop" }] }),
  component: CheckoutPayPage,
});

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  holder: string;
  is_default: boolean;
}

function detectBrand(num: string) {
  if (num.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(num)) return "MasterCard";
  if (/^3[47]/.test(num)) return "Amex";
  return "Card";
}

function CheckoutPayPage() {
  const { orderId } = useParams({ from: "/checkout-pay/$orderId" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<{ id: string; total: number; payment_status: string } | null>(null);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [form, setForm] = useState({ number: "", exp: "", cvv: "", holder: "", save: true });
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: o }, { data: c }] = await Promise.all([
        supabase.from("orders").select("id,total,payment_status").eq("id", orderId).maybeSingle(),
        supabase.from("customer_cards" as never).select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      setOrder(o as never);
      const list = (c as unknown as SavedCard[]) ?? [];
      setCards(list);
      if (list.length > 0) setSelectedCardId(list[0].id);
      else setUseNewCard(true);
      setLoading(false);
    })();
  }, [user, orderId]);

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      let payload: { _order_id: string; _card_id?: string; _new_card?: unknown } = { _order_id: orderId };
      if (!useNewCard && selectedCardId) {
        payload._card_id = selectedCardId;
      } else {
        const num = form.number.replace(/\s/g, "");
        if (num.length < 13 || num.length > 19) throw new Error("Kart nömrəsi yanlışdır");
        if (!/^\d{2}\/\d{2}$/.test(form.exp)) throw new Error("Etibar tarixi MM/YY formatında olmalıdır");
        if (form.cvv.length < 3) throw new Error("CVV yanlışdır");
        if (!form.holder.trim()) throw new Error("Kart sahibinin adını daxil edin");
        const [mm, yy] = form.exp.split("/");
        payload._new_card = {
          brand: detectBrand(num),
          last4: num.slice(-4),
          exp_month: parseInt(mm, 10),
          exp_year: 2000 + parseInt(yy, 10),
          holder: form.holder.toUpperCase().slice(0, 50),
          save: form.save,
        };
      }
      const { error } = await supabase.rpc("process_card_payment" as never, payload as never);
      if (error) throw error;
      toast.success("✅ Ödəniş uğurla tamamlandı");
      navigate({ to: "/orders" });
    } catch (e) {
      toast.error((e as Error).message ?? "Ödəniş alınmadı");
    } finally {
      setPaying(false);
    }
  };

  if (!user || loading) {
    return <div className="container mx-auto p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
  }
  if (!order) {
    return <div className="container mx-auto p-8 text-center">Sifariş tapılmadı.</div>;
  }
  if (order.payment_status === "paid") {
    return (
      <div className="container mx-auto p-8 max-w-md text-center">
        <ShieldCheck className="h-16 w-16 text-green-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Bu sifariş artıq ödənilib</h1>
        <Link to="/orders" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold">Sifarişlərə qayıt</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <div className="bg-gradient-brand text-primary-foreground rounded-2xl p-6 mb-4 shadow-elegant">
        <div className="text-sm opacity-80">Ödəniləcək məbləğ</div>
        <div className="text-4xl font-extrabold mt-1">{order.total.toFixed(2)} AZN</div>
        <div className="text-xs opacity-80 mt-2 flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Test rejim — kart məlumatınız təhlükəsizdir
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-bold mb-3 flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Kart seçin</h2>

        {cards.length > 0 && (
          <div className="space-y-2 mb-3">
            {cards.map((c) => (
              <label key={c.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer ${selectedCardId === c.id && !useNewCard ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" checked={selectedCardId === c.id && !useNewCard} onChange={() => { setSelectedCardId(c.id); setUseNewCard(false); }} />
                  <div>
                    <div className="font-bold text-sm">{c.brand} •• {c.last4}</div>
                    <div className="text-xs text-muted-foreground">{c.holder} · {String(c.exp_month).padStart(2,"0")}/{String(c.exp_year).slice(-2)}</div>
                  </div>
                </div>
                {c.is_default && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>}
              </label>
            ))}
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${useNewCard ? "border-primary bg-primary/5" : "border-border"}`}>
              <input type="radio" checked={useNewCard} onChange={() => setUseNewCard(true)} />
              <Plus className="h-4 w-4" /> <span className="font-semibold text-sm">Yeni kart ilə ödə</span>
            </label>
          </div>
        )}

        {useNewCard && (
          <div className="space-y-3 mt-3 pt-3 border-t">
            <input placeholder="Kart nömrəsi" value={form.number} maxLength={23}
              onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim() })}
              className="w-full h-11 px-3 rounded-lg border border-input bg-background tracking-widest" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="MM/YY" value={form.exp} maxLength={5}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                  setForm({ ...form, exp: v });
                }}
                className="h-11 px-3 rounded-lg border border-input bg-background" />
              <input placeholder="CVV" value={form.cvv} maxLength={4} type="password"
                onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "") })}
                className="h-11 px-3 rounded-lg border border-input bg-background" />
            </div>
            <input placeholder="Kart sahibinin adı" value={form.holder}
              onChange={(e) => setForm({ ...form, holder: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border border-input bg-background uppercase" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.save} onChange={(e) => setForm({ ...form, save: e.target.checked })} />
              Növbəti dəfə üçün bu kartı yadda saxla
            </label>
          </div>
        )}

        <button disabled={paying} onClick={pay}
          className="w-full mt-4 h-12 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2">
          {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Ödənilir...</> : <><Lock className="h-4 w-4" /> {order.total.toFixed(2)} AZN ödə</>}
        </button>

        <div className="text-[11px] text-muted-foreground text-center mt-3">
          🔒 SSL şifrələnməsi · Kart məlumatı yalnız ödəniş üçün istifadə olunur · Tam nömrə və CVV heç vaxt saxlanmır
        </div>
      </div>
    </div>
  );
}
