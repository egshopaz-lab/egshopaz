import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export interface DisputeMsg {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_role: "buyer" | "seller" | "admin" | "system";
  body: string;
  created_at: string;
}

export interface DisputeRow {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  decided_for: string | null;
  compensation: number | null;
  created_at: string;
  buyer_id: string;
  seller_id: string | null;
  order_id: string | null;
}

export function DisputeChat({
  dispute,
  currentUserId,
  role,
}: {
  dispute: DisputeRow;
  currentUserId: string;
  role: "buyer" | "seller" | "admin";
}) {
  const [messages, setMessages] = useState<DisputeMsg[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase.from("dispute_messages")
      .select("*").eq("dispute_id", dispute.id).order("created_at", { ascending: true });
    setMessages((data ?? []) as DisputeMsg[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`dispute-${dispute.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispute_messages", filter: `dispute_id=eq.${dispute.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [dispute.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = reply.trim().slice(0, 2000);
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("dispute_messages").insert({
      dispute_id: dispute.id, sender_id: currentUserId, sender_role: role, body,
    } as never);
    setSending(false);
    if (error) toast.error("Mesaj göndərilmədi");
    else { setReply(""); load(); }
  };

  const statusColor = useMemo(() => {
    if (dispute.status === "resolved") return "bg-emerald-100 text-emerald-700";
    if (dispute.status === "rejected") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  }, [dispute.status]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-[60vh]">
      <div className="p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-sm">{dispute.reason}</span>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColor}`}>
            {dispute.status === "resolved" ? "Həll edilib" : dispute.status === "rejected" ? "Rədd edildi" : "Açıq"}
          </span>
        </div>
        {dispute.description && <p className="text-xs text-muted-foreground mt-1">{dispute.description}</p>}
        {dispute.resolution && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            <b>Qərar:</b> {dispute.resolution}
            {dispute.compensation ? <span> • Kompensasiya: {dispute.compensation} ₼</span> : null}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-secondary/10">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Mesajlaşma boşdur — söhbətə başlayın</div>
        )}
        {messages.map((m) => {
          if (m.sender_role === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="bg-primary/10 text-foreground/80 rounded-xl px-3 py-1.5 text-xs">{m.body}</div>
              </div>
            );
          }
          if (m.sender_role === "admin") {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-xs max-w-[85%]">
                  <div className="flex items-center gap-1 font-bold mb-1"><Shield className="h-3 w-3" /> Admin</div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            );
          }
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                <div className="text-[10px] font-bold opacity-70 mb-0.5">
                  {m.sender_role === "buyer" ? "Müştəri" : "Satıcı"}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[10px] mt-1 opacity-70 ${mine ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  {formatDateTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dispute.status !== "resolved" && dispute.status !== "rejected" && (
        <div className="p-3 border-t border-border flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Mesaj yazın..."
            maxLength={2000}
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background resize-none max-h-32 text-sm"
          />
          <button onClick={send} disabled={sending || reply.trim().length === 0}
            className="bg-primary text-primary-foreground px-4 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1">
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
