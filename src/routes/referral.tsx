import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Gift, Copy, Users, Award, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatAZN, formatDate } from "@/lib/format";

export const Route = createFileRoute("/referral")({
  head: () => ({ meta: [{ title: "Dostunu dəvət et — EG Shop" }] }),
  component: ReferralPage,
});

interface RefRow { id: string; created_at: string; bonus_awarded: number; referred_id: string; profile?: { full_name: string | null } }

function ReferralPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState<string>("");
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
      setCode(prof?.referral_code ?? "");

      const { data } = await supabase.from("referrals").select("id, created_at, bonus_awarded, referred_id").eq("referrer_id", user.id).order("created_at", { ascending: false });
      const list = (data ?? []) as RefRow[];

      // Fetch names
      const ids = list.map((r) => r.referred_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase.from("profiles_public").select("id, full_name").in("id", ids);
        const map: Record<string, string | null> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name; });
        list.forEach((r) => { r.profile = { full_name: map[r.referred_id] ?? null }; });
      }
      setRefs(list);
      setTotalEarned(list.reduce((s, r) => s + r.bonus_awarded, 0));
    })();
  }, [user]);

  if (!user) return null;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}`;
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Kopyalandı"); };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "EG Shop", text: `Mənim dəvət kodum: ${code}. Qeydiyyatda istifadə et və hər ikimiz 5 AZN bonus alaq!`, url: link }); } catch {}
    } else copy(link);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-pink-500 text-primary-foreground p-6 mb-6">
        <Gift className="h-10 w-10 mb-3" />
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Dostunu dəvət et, 5 AZN qazan!</h1>
        <p className="opacity-95">Hər qeydiyyatdan keçən dost üçün siz 500 bonus (5 AZN), dostunuz da 500 bonus alır.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-5 w-5 text-primary mb-2" />
          <div className="text-2xl font-extrabold">{refs.length}</div>
          <div className="text-xs text-muted-foreground">Dəvət edilmiş dost</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Award className="h-5 w-5 text-primary mb-2" />
          <div className="text-2xl font-extrabold">{totalEarned}</div>
          <div className="text-xs text-muted-foreground">Qazanılmış bonus</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Gift className="h-5 w-5 text-primary mb-2" />
          <div className="text-2xl font-extrabold">{formatAZN(totalEarned * 0.01)}</div>
          <div className="text-xs text-muted-foreground">AZN dəyər</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <h2 className="font-bold mb-3">Sizin dəvət kodunuz</h2>
        <div className="flex gap-2 mb-4">
          <div className="flex-1 px-4 py-3 rounded-lg bg-secondary font-mono text-lg font-bold tracking-wider text-center">{code || "—"}</div>
          <button onClick={() => copy(code)} className="px-4 rounded-lg border border-border hover:bg-secondary"><Copy className="h-4 w-4" /></button>
        </div>

        <h3 className="font-bold mb-2 text-sm">Və ya birbaşa link:</h3>
        <div className="flex gap-2">
          <input readOnly value={link} className="flex-1 px-3 py-2 rounded-lg border border-input bg-secondary text-sm" />
          <button onClick={() => copy(link)} className="px-4 rounded-lg border border-border hover:bg-secondary"><Copy className="h-4 w-4" /></button>
          <button onClick={share} className="px-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 text-sm">
            <Share2 className="h-4 w-4" /> Paylaş
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold mb-4">Dəvət edilmiş dostlar</h2>
        {refs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Hələ heç kim qeydiyyatdan keçməyib. Kodunuzu paylaşın!</p>
        ) : (
          <div className="space-y-2">
            {refs.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border last:border-0 pb-2">
                <div>
                  <div className="font-medium">{r.profile?.full_name ?? "Anonim istifadəçi"}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
                </div>
                <div className="text-success font-bold">+{r.bonus_awarded} bonus</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
