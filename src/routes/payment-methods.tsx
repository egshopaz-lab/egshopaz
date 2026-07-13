import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Plus, Trash2, Lock, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/payment-methods")({
  head: () => ({ meta: [{ title: "Ödəniş üsulları — EG Shop" }] }),
  component: PaymentMethodsPage,
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

function PaymentMethodsPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: "", exp: "", cvv: "", holder: "" });

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("customer_cards" as never).select("*")
      .order("is_default", { ascending: false }).order("created_at", { ascending: false });
    setCards((data as unknown as SavedCard[]) ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addCard = async () => {
    const num = form.number.replace(/\s/g, "");
    if (num.length < 13 || num.length > 19) { toast.error("Kart nömrəsi yanlışdır"); return; }
    if (!/^\d{2}\/\d{2}$/.test(form.exp)) { toast.error("Etibar tarixi MM/YY formatında olmalıdır"); return; }
    if (form.cvv.length < 3) { toast.error("CVV yanlışdır"); return; }
    if (!form.holder.trim()) { toast.error("Kart sahibinin adını daxil edin"); return; }
    const brand = num.startsWith("4") ? "Visa" : /^5[1-5]/.test(num) ? "MasterCard" : "Card";
    const [mm, yy] = form.exp.split("/");
    const { error } = await supabase.from("customer_cards" as never).insert({
      user_id: user!.id,
      brand,
      last4: num.slice(-4),
      exp_month: parseInt(mm, 10),
      exp_year: 2000 + parseInt(yy, 10),
      holder: form.holder.toUpperCase().slice(0, 50),
      is_default: cards.length === 0,
    } as never);
    if (error) { toast.error(error.message); return; }
    setForm({ number: "", exp: "", cvv: "", holder: "" });
    setAdding(false);
    toast.success("Kart əlavə edildi");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Kartı silmək istəyirsiniz?")) return;
    const { error } = await supabase.from("customer_cards" as never).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Silindi");
    load();
  };

  const setDefault = async (id: string) => {
    const { error } = await supabase.rpc("set_default_card" as never, { _card_id: id } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Default kart yeniləndi");
    load();
  };

  if (!user) return null;

  return (
    <PanelLayout title={t("sidebar.buyerPanelTitle")} subtitle={user.email ?? undefined} items={items}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Kartlarım</h1>
          <button onClick={() => setAdding(true)} className="bg-primary text-primary-foreground px-4 h-10 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Yeni kart
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-sm mb-4 flex items-start gap-2">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          <div>Kart məlumatınız təhlükəsiz saxlanır. Yalnız brend, son 4 rəqəm və etibar tarixi yadda qalır — tam nömrə və CVV heç vaxt saxlanmır.</div>
        </div>

        {cards.length === 0 ? (
          <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">Hələ kartınız yoxdur</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {cards.map((c) => (
              <div key={c.id} className="bg-gradient-brand text-primary-foreground rounded-2xl p-5 relative shadow-elegant">
                <div className="absolute top-3 right-3 flex gap-1">
                  {!c.is_default && (
                    <button onClick={() => setDefault(c.id)} title="Default et" className="p-1.5 bg-background/20 rounded-lg hover:bg-background/30">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(c.id)} className="p-1.5 bg-background/20 rounded-lg hover:bg-background/30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs opacity-80 flex items-center gap-2">{c.brand} {c.is_default && <span className="bg-background/30 px-1.5 rounded text-[10px]">DEFAULT</span>}</div>
                <div className="text-2xl font-bold tracking-widest mt-6">•••• •••• •••• {c.last4}</div>
                <div className="flex justify-between mt-4 text-xs">
                  <div><div className="opacity-70">SAHİB</div><div className="font-semibold">{c.holder || "—"}</div></div>
                  <div><div className="opacity-70">ETİBAR</div><div className="font-semibold">{String(c.exp_month).padStart(2,"0")}/{String(c.exp_year).slice(-2)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {adding && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
            <div className="bg-card rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Yeni kart əlavə et</h2>
              <div className="space-y-3">
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
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addCard} className="flex-1 bg-primary text-primary-foreground h-11 rounded-lg font-bold">Əlavə et</button>
                <button onClick={() => setAdding(false)} className="px-4 h-11 rounded-lg border border-border">Ləğv et</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
