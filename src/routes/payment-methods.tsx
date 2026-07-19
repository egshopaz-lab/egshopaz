
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CreditCard, Lock, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/payment-methods")({
  head: () => ({ meta: [{ title: "Ã–dÉ™niÅŸ Ã¼sullarÄ± â€” EG Shop" }] }),
  component: PaymentMethodsPage,
});

type SavedCard = {
  id: string;
  card_mask: string | null;
  card_name: string | null;
  purpose: "payment" | "payout" | "both";
  status: "pending" | "active" | "blocked" | "deleted";
  is_default: boolean;
  created_at: string;
};

const db = supabase as any;

function PaymentMethodsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await db.from("epoint_saved_cards")
      .select("id,card_mask,card_name,purpose,status,is_default,created_at")
      .neq("status", "deleted")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCards((data ?? []) as SavedCard[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const register = async () => {
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("epoint-operations", {
      body: { action: "card_registration", purpose: "payment", language: "az" },
    });
    setWorking(false);
    if (error || data?.error || !data?.redirect_url) {
      toast.error(data?.error || error?.message || "Kart qeydiyyatÄ± baÅŸladÄ±lmadÄ±");
      return;
    }
    window.location.assign(data.redirect_url);
  };

  const remove = async (id: string) => {
    if (!confirm("Bu kartÄ± hesabdan silmÉ™k istÉ™yirsiniz?")) return;
    const { error } = await db.from("epoint_saved_cards").update({ status: "deleted", is_default: false }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Kart silindi"); await load(); }
  };

  const makeDefault = async (id: string) => {
    const { error } = await db.rpc("set_default_epoint_card", { _card_id: id });
    if (error) toast.error(error.message); else { toast.success("Æsas kart yenilÉ™ndi"); await load(); }
  };

  if (!user) return null;

  return (
    <PanelLayout title="MÃ¼ÅŸtÉ™ri paneli" subtitle={user.email ?? undefined} items={items}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold"><CreditCard className="h-5 w-5 text-primary" /> KartlarÄ±m</h1>
            <p className="mt-1 text-sm text-muted-foreground">Kart mÉ™lumatlarÄ± Epoint tÉ™rÉ™findÉ™n qorunur.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border" title="YenilÉ™"><RefreshCw className="h-4 w-4" /></button>
            <button type="button" disabled={working} onClick={() => void register()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" /> Kart É™lavÉ™ et</button>
          </div>
        </div>

        <div className="flex items-start gap-3 border-y border-border bg-muted/30 px-1 py-4 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>EG Shop kart nÃ¶mrÉ™sini vÉ™ CVV-ni gÃ¶rmÃ¼r vÉ™ saxlamÄ±r. MÉ™lumatlar yalnÄ±z Epoint-in tÉ™hlÃ¼kÉ™siz Ã¶dÉ™niÅŸ sÉ™hifÉ™sindÉ™ daxil edilir.</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">YÃ¼klÉ™nir...</div>
        ) : cards.length === 0 ? (
          <div className="border-y border-dashed border-border py-16 text-center">
            <CreditCard className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 font-medium">SaxlanmÄ±ÅŸ kart yoxdur</p>
            <p className="mt-1 text-sm text-muted-foreground">Ä°lk kartÄ±nÄ±zÄ± Epoint Ã¼zÉ™rindÉ™n tÉ™hlÃ¼kÉ™siz É™lavÉ™ edin.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((card) => (
              <article key={card.id} className="border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-primary" /> {card.card_mask || "Qorunan kart"}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{card.card_name || "Kart sahibi"}</p>
                  </div>
                  <CardStatus value={card.status} />
                </div>
                <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-3">
                  {card.is_default ? <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Star className="h-3.5 w-3.5 fill-current" /> Æsas kart</span> : card.status === "active" ? <button type="button" onClick={() => void makeDefault(card.id)} className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Star className="h-3.5 w-3.5" /> Æsas et</button> : <span className="text-xs text-muted-foreground">TÉ™sdiq gÃ¶zlÉ™nilir</span>}
                  <button type="button" onClick={() => void remove(card.id)} className="inline-flex h-8 w-8 items-center justify-center text-destructive" title="KartÄ± sil"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}

function CardStatus({ value }: { value: SavedCard["status"] }) {
  const labels = { active: "Aktiv", pending: "GÃ¶zlÉ™yir", blocked: "BloklanÄ±b", deleted: "Silinib" };
  const classes = value === "active" ? "bg-emerald-100 text-emerald-800" : value === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <span className={`px-2 py-1 text-xs font-medium ${classes}`}>{labels[value]}</span>;
}

