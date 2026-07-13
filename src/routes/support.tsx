import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { MessageCircle, Plus, Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { AISupportChat } from "@/components/AISupportChat";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Dəstək — EG Shop" }] }),
  component: SupportPage,
});

interface Ticket {
  id: string; subject: string; category: string; message: string;
  admin_reply: string | null; status: string; created_at: string;
}

const categoryLabel: Record<string, string> = {
  general: "Ümumi sual", order: "Sifarişlə bağlı", refund: "Geri qaytarma",
  complaint: "Şikayət", payment: "Ödəniş", delivery: "Çatdırılma",
};
const statusLabel: Record<string, string> = {
  open: "Açıq", in_progress: "İşlənir", closed: "Bağlandı",
};

function SupportPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"ai" | "tickets">("ai");
  const [form, setForm] = useState({ subject: "", category: "general", message: "" });

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  const load = () => {
    if (!user) return;
    supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data ?? []) as Ticket[]));
  };
  useEffect(load, [user]);

  const submit = async () => {
    if (!user) return;
    if (form.subject.trim().length < 3 || form.message.trim().length < 5) {
      toast.error("Mövzu və mesaj kifayət qədər uzun olmalıdır"); return;
    }
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: form.subject.trim().slice(0, 200),
      category: form.category,
      message: form.message.trim().slice(0, 2000),
    });
    if (error) toast.error("Göndərilmədi");
    else { toast.success("Müraciətiniz qəbul edildi"); setForm({ subject: "", category: "general", message: "" }); setCreating(false); load(); }
  };

  if (!user) return null;

  return (
    <PanelLayout title="Müştərinin şəxsi kabineti" subtitle={user.email ?? undefined} items={items}>
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Dəstək xidməti</h1>
          {tab === "tickets" && (
            <button onClick={() => setCreating(!creating)} className="bg-primary text-primary-foreground px-4 h-10 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Yeni müraciət
            </button>
          )}
        </div>

        <div className="panel-scroll-row mb-4 border-b border-border">
          <button onClick={() => setTab("ai")}
            className={`px-4 h-10 font-semibold inline-flex items-center gap-2 border-b-2 -mb-px ${tab === "ai" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Bot className="h-4 w-4" /> AI Asistent
          </button>
          <button onClick={() => setTab("tickets")}
            className={`px-4 h-10 font-semibold inline-flex items-center gap-2 border-b-2 -mb-px ${tab === "tickets" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <MessageCircle className="h-4 w-4" /> Müraciətlərim
          </button>
        </div>

        {tab === "ai" && <AISupportChat userId={user.id} />}

        {tab === "tickets" && (
          <>
            {creating && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full h-11 px-3 rounded-lg border border-input bg-background">
                  {Object.entries(categoryLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input placeholder="Mövzu" value={form.subject} maxLength={200}
                       onChange={(e) => setForm({ ...form, subject: e.target.value })}
                       className="w-full h-11 px-3 rounded-lg border border-input bg-background" />
                <textarea placeholder="Mesajınızı ətraflı yazın..." value={form.message} maxLength={2000} rows={5}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background resize-none" />
                <button onClick={submit} className="bg-primary text-primary-foreground px-5 h-10 rounded-lg font-bold hover:bg-primary/90 inline-flex items-center gap-2">
                  <Send className="h-4 w-4" /> Göndər
                </button>
              </div>
            )}

            {tickets.length === 0 && !creating ? (
              <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
                Hələ müraciət yoxdur. Sual və ya şikayətiniz olduqda yeni müraciət yarada bilərsiniz.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="font-bold">{t.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {categoryLabel[t.category] ?? t.category} · {formatDateTime(t.created_at)}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        t.status === "open" ? "bg-yellow-100 text-yellow-800" :
                        t.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      }`}>{statusLabel[t.status] ?? t.status}</span>
                    </div>
                    <p className="text-sm text-foreground/80">{t.message}</p>
                    {t.admin_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-primary bg-primary/5 p-3 rounded">
                        <div className="text-xs font-bold text-primary mb-1">DƏSTƏK CAVABI</div>
                        <p className="text-sm">{t.admin_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  );
}
