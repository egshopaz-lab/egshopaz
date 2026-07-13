import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

interface Msg {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  order_id: string | null;
  sender_role: "buyer" | "seller";
  body: string;
  read_at: string | null;
  created_at: string;
}
interface BuyerProfile { id: string; full_name: string | null; avatar_url: string | null }

export function SellerMessages({ sellerId }: { sellerId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, BuyerProfile>>({});
  const [activeBuyer, setActiveBuyer] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("shop_messages")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Msg[];
    setMessages(list);
    const buyerIds = Array.from(new Set(list.map((m) => m.buyer_id)));
    if (buyerIds.length) {
      const { data: ps } = await supabase
        .from("profiles_public")
        .select("id,full_name,avatar_url")
        .in("id", buyerIds);
      const map: Record<string, BuyerProfile> = {};
      (ps ?? []).forEach((p) => { map[(p as BuyerProfile).id] = p as BuyerProfile; });
      setProfiles(map);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`seller-msgs-${sellerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_messages", filter: `seller_id=eq.${sellerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const threads = useMemo(() => {
    const map = new Map<string, { buyerId: string; last: Msg; unread: number }>();
    for (const m of messages) {
      const cur = map.get(m.buyer_id);
      const unreadInc = m.sender_role === "buyer" && !m.read_at ? 1 : 0;
      if (!cur) map.set(m.buyer_id, { buyerId: m.buyer_id, last: m, unread: unreadInc });
      else {
        cur.last = m;
        cur.unread += unreadInc;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages]);

  const filteredThreads = useMemo(() => {
    if (!filter.trim()) return threads;
    const q = filter.toLowerCase();
    return threads.filter((t) => {
      const name = profiles[t.buyerId]?.full_name?.toLowerCase() ?? "";
      return name.includes(q) || t.last.body.toLowerCase().includes(q);
    });
  }, [threads, profiles, filter]);

  const activeMessages = useMemo(
    () => (activeBuyer ? messages.filter((m) => m.buyer_id === activeBuyer) : []),
    [messages, activeBuyer]
  );

  // Auto-select first thread
  useEffect(() => {
    if (!activeBuyer && threads.length) setActiveBuyer(threads[0].buyerId);
  }, [threads, activeBuyer]);

  // Mark active thread as read
  useEffect(() => {
    if (!activeBuyer) return;
    const unreadIds = messages
      .filter((m) => m.buyer_id === activeBuyer && m.sender_role === "buyer" && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase.from("shop_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {
      setMessages((prev) => prev.map((m) => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    });
  }, [activeBuyer, messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeMessages.length, activeBuyer]);

  const send = async () => {
    if (!activeBuyer) return;
    const body = reply.trim().slice(0, 2000);
    if (body.length < 1) return;
    setSending(true);
    const { error } = await supabase.from("shop_messages").insert({
      buyer_id: activeBuyer,
      seller_id: sellerId,
      sender_role: "seller",
      body,
    });
    setSending(false);
    if (error) toast.error("Mesaj göndərilmədi");
    else { setReply(""); load(); }
  };

  if (threads.length === 0) {
    return (
      <div className="bg-secondary/40 rounded-2xl p-12 text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
        Hələ mesaj yoxdur. Müştərilər məhsul səhifəsindən sizə mesaj yaza bilər.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden grid md:grid-cols-[280px_1fr] h-[70vh]">
      {/* Thread list */}
      <div className="border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Müştəri axtar..."
              className="w-full pl-8 pr-3 h-9 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {filteredThreads.map((t) => {
            const p = profiles[t.buyerId];
            const isActive = activeBuyer === t.buyerId;
            return (
              <button
                key={t.buyerId}
                onClick={() => setActiveBuyer(t.buyerId)}
                className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition flex gap-3 ${isActive ? "bg-secondary" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-soft text-primary flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p?.full_name?.[0]?.toUpperCase() ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm line-clamp-1">{p?.full_name ?? "Müştəri"}</span>
                    {t.unread > 0 && (
                      <span className="text-[10px] bg-discount text-discount-foreground rounded-full px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {t.last.sender_role === "seller" && "Siz: "}{t.last.body}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredThreads.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Tapılmadı</div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col min-h-0">
        {activeBuyer ? (
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-soft text-primary flex items-center justify-center font-bold overflow-hidden">
                {profiles[activeBuyer]?.avatar_url
                  ? <img src={profiles[activeBuyer].avatar_url!} alt="" className="w-full h-full object-cover" />
                  : (profiles[activeBuyer]?.full_name?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="font-bold">{profiles[activeBuyer]?.full_name ?? "Müştəri"}</div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-secondary/20">
              {activeMessages.map((m) => {
                const mine = m.sender_role === "seller";
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
                placeholder="Cavabınızı yazın..."
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
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Söhbət seçin
          </div>
        )}
      </div>
    </div>
  );
}
