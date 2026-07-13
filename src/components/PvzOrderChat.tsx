import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircle, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export interface PvzMsg {
  id: string;
  order_id: string;
  order_item_id: string | null;
  buyer_id: string;
  pickup_point_id: string;
  sender_role: "buyer" | "pvz" | "system";
  sender_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface BuyerProfile { id: string; full_name: string | null; avatar_url: string | null }

/**
 * Order-scoped PVZ ↔ Buyer chat.
 * - mode="buyer": current user is the buyer; threads grouped per order
 * - mode="pvz":   current user is PVZ staff; threads = all incoming chats
 */
export function PvzOrderChat({ mode, currentUserId }: { mode: "buyer" | "pvz"; currentUserId: string }) {
  const [messages, setMessages] = useState<PvzMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, BuyerProfile>>({});
  const [activeOrder, setActiveOrder] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    let q = supabase.from("pvz_messages").select("*").order("created_at", { ascending: true });
    if (mode === "buyer") q = q.eq("buyer_id", currentUserId);
    const { data, error } = await q;
    if (error) { console.error(error); return; }
    const list = (data ?? []) as PvzMsg[];
    setMessages(list);
    if (mode === "pvz") {
      const ids = Array.from(new Set(list.map((m) => m.buyer_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles_public").select("id,full_name,avatar_url").in("id", ids);
        const map: Record<string, BuyerProfile> = {};
        (ps ?? []).forEach((p) => { map[(p as BuyerProfile).id] = p as BuyerProfile; });
        setProfiles(map);
      }
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`pvz-msgs-${mode}-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pvz_messages" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentUserId]);

  const threads = useMemo(() => {
    const map = new Map<string, { orderId: string; buyerId: string; last: PvzMsg; unread: number }>();
    for (const m of messages) {
      const cur = map.get(m.order_id);
      const isIncomingForMe = mode === "buyer"
        ? (m.sender_role !== "buyer" && !m.read_at)
        : (m.sender_role === "buyer" && !m.read_at);
      const inc = isIncomingForMe ? 1 : 0;
      if (!cur) map.set(m.order_id, { orderId: m.order_id, buyerId: m.buyer_id, last: m, unread: inc });
      else { cur.last = m; cur.unread += inc; }
    }
    return Array.from(map.values()).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages, mode]);

  const filteredThreads = useMemo(() => {
    if (!filter.trim()) return threads;
    const q = filter.toLowerCase();
    return threads.filter((t) => {
      const name = profiles[t.buyerId]?.full_name?.toLowerCase() ?? "";
      return name.includes(q) || t.last.body.toLowerCase().includes(q) || t.orderId.toLowerCase().includes(q);
    });
  }, [threads, filter, profiles]);

  const activeMessages = useMemo(
    () => (activeOrder ? messages.filter((m) => m.order_id === activeOrder) : []),
    [messages, activeOrder]
  );

  useEffect(() => {
    if (!activeOrder && threads.length) setActiveOrder(threads[0].orderId);
  }, [threads, activeOrder]);

  // mark read
  useEffect(() => {
    if (!activeOrder) return;
    const unreadIds = messages
      .filter((m) => m.order_id === activeOrder && !m.read_at && (
        mode === "buyer" ? m.sender_role !== "buyer" : m.sender_role === "buyer"
      ))
      .map((m) => m.id);
    if (!unreadIds.length) return;
    supabase.from("pvz_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {
      setMessages((prev) => prev.map((m) => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    });
  }, [activeOrder, messages, mode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMessages.length, activeOrder]);

  const send = async () => {
    if (!activeOrder) return;
    const body = reply.trim().slice(0, 2000);
    if (!body) return;
    const thread = threads.find((t) => t.orderId === activeOrder);
    if (!thread) return;
    setSending(true);
    const { error } = await supabase.from("pvz_messages").insert({
      order_id: activeOrder,
      buyer_id: thread.buyerId,
      pickup_point_id: messages.find((m) => m.order_id === activeOrder)?.pickup_point_id ?? "",
      sender_role: mode === "buyer" ? "buyer" : "pvz",
      sender_id: currentUserId,
      body,
    } as never);
    setSending(false);
    if (error) toast.error("Mesaj göndərilmədi");
    else { setReply(""); load(); }
  };

  if (threads.length === 0) {
    return (
      <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        {mode === "buyer"
          ? "PVZ ilə hələ yazışmanız yoxdur. Sifarişiniz qəbul edildikdə avtomatik bildiriş gələcək."
          : "Hələ müştəri mesajı yoxdur."}
      </div>
    );
  }

  const titleFor = (t: typeof threads[number]) =>
    mode === "pvz"
      ? (profiles[t.buyerId]?.full_name ?? "Müştəri")
      : `Sifariş #${t.orderId.slice(0, 8).toUpperCase()}`;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh]">
      <div className="border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={mode === "pvz" ? "Müştəri / sifariş axtar..." : "Sifariş axtar..."}
              className="w-full pl-8 pr-3 h-9 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filteredThreads.map((t) => {
            const isActive = activeOrder === t.orderId;
            const p = profiles[t.buyerId];
            return (
              <button
                key={t.orderId}
                onClick={() => setActiveOrder(t.orderId)}
                className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition flex gap-3 ${isActive ? "bg-secondary" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-soft text-primary flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {mode === "pvz" && p?.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <Package className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm line-clamp-1">{titleFor(t)}</span>
                    {t.unread > 0 && (
                      <span className="text-[10px] bg-discount text-discount-foreground rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {t.last.sender_role === (mode === "buyer" ? "buyer" : "pvz") && "Siz: "}{t.last.body}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">#{t.orderId.slice(0, 8).toUpperCase()}</div>
                </div>
              </button>
            );
          })}
          {filteredThreads.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Tapılmadı</div>
          )}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        {activeOrder ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-soft text-primary flex items-center justify-center font-bold">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm">
                  {mode === "pvz"
                    ? (profiles[threads.find(t=>t.orderId===activeOrder)?.buyerId ?? ""]?.full_name ?? "Müştəri")
                    : "PVZ nöqtəsi"}
                </div>
                <div className="text-xs text-muted-foreground">Sifariş #{activeOrder.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-secondary/20">
              {activeMessages.map((m) => {
                if (m.sender_role === "system") {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] bg-primary/10 border border-primary/20 text-primary-foreground/90 rounded-xl px-3 py-2 text-xs text-center">
                        <div className="text-foreground/90 whitespace-pre-wrap">{m.body}</div>
                        <div className="text-[10px] mt-1 opacity-60">
                          {formatDateTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                }
                const mine = (mode === "buyer" && m.sender_role === "buyer") || (mode === "pvz" && m.sender_role === "pvz");
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                      <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`text-[10px] mt-1 opacity-70 ${mine ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        {formatDateTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={mode === "buyer" ? "PVZ-yə mesaj yazın..." : "Müştəriyə cavab yazın..."}
                maxLength={2000}
                rows={1}
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background resize-none max-h-32 text-sm"
              />
              <button
                onClick={send}
                disabled={sending || reply.trim().length === 0}
                className="bg-primary text-primary-foreground px-4 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-60 inline-flex items-center gap-1"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Söhbət seçin</div>
        )}
      </div>
    </div>
  );
}
