import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AIMsg {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export function AISupportChat({ userId, audience = "buyer" }: { userId: string; audience?: "buyer" | "seller" | "pvz" | "all" }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("audience", audience)
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages((data ?? []) as AIMsg[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, sending]);

  const send = async () => {
    const msg = input.trim().slice(0, 2000);
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    // optimistic
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: msg, created_at: new Date().toISOString() }]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-auto-reply", {
        body: { channel: "support", user_id: userId, message: msg, audience },
      });
      if (error) throw error;
      if (data?.reply) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
      } else if (data?.skipped === "ai_disabled" || data?.skipped === "channel_off") {
        toast.info(t("aiSupport.disabled"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("aiSupport.noReply"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-[60vh]">
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-bold flex items-center gap-1.5">
            {t("aiSupport.title")} <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xs text-muted-foreground">{t("aiSupport.subtitle")}</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-secondary/10">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 mx-auto text-primary/50 mb-2" />
            <div className="text-sm text-muted-foreground">{t("aiSupport.emptyTitle")}</div>
            <div className="text-xs text-muted-foreground mt-2">{t("aiSupport.emptyDesc")}</div>
          </div>
        )}
        {messages.filter((m) => m.role !== "system").map((m) => {
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                {!mine && <div className="text-[10px] font-bold text-primary mb-0.5 flex items-center gap-1"><Bot className="h-3 w-3" /> AI</div>}
                <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t("aiSupport.placeholder")}
          maxLength={2000}
          rows={1}
          disabled={sending}
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background resize-none max-h-32 text-sm"
        />
        <button onClick={send} disabled={sending || input.trim().length === 0}
          className="bg-primary text-primary-foreground px-4 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
