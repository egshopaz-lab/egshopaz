
import { useEffect, useState } from "react";
import { Ban, Flag, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const reasons = [
  ["spam", "Spam"], ["harassment", "Təhqir və təzyiq"], ["fraud", "Dələduzluq"],
  ["prohibited_content", "Qadağan olunmuş məzmun"], ["other", "Digər"],
] as const;

export function ConversationSafetyActions({ currentUserId, otherUserId, latestMessageId }: {
  currentUserId: string;
  otherUserId: string;
  latestMessageId: string | null;
}) {
  const db = supabase as any;
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void db.from("shop_message_blocks").select("id").eq("blocker_id", currentUserId)
      .eq("blocked_id", otherUserId).maybeSingle().then(({ data }: any) => setBlocked(Boolean(data)));
  }, [currentUserId, otherUserId]);

  const toggleBlock = async () => {
    setBusy(true);
    const result = blocked
      ? await db.from("shop_message_blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", otherUserId)
      : await db.from("shop_message_blocks").insert({ blocker_id: currentUserId, blocked_id: otherUserId, reason: "user_action" });
    setBusy(false);
    if (result.error) return toast.error(result.error.message);
    setBlocked(!blocked);
    toast.success(blocked ? "İstifadəçinin bloku açıldı" : "İstifadəçi bloklandı");
  };

  const report = async () => {
    if (!latestMessageId) return toast.error("Şikayət üçün mesaj tapılmadı");
    const choice = window.prompt(`Şikayət səbəbini seçin:\n${reasons.map(([key, label]) => `${key}: ${label}`).join("\n")}`, "spam");
    if (!choice) return;
    const reason = reasons.some(([key]) => key === choice) ? choice : "other";
    const details = window.prompt("Əlavə izah (məcburi deyil):", "") ?? "";
    setBusy(true);
    const { error } = await db.from("shop_message_reports").insert({
      reporter_id: currentUserId,
      reported_user_id: otherUserId,
      message_id: latestMessageId,
      buyer_id: currentUserId,
      seller_id: otherUserId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "Bu mesaj artıq şikayət edilib" : error.message);
    toast.success("Şikayət təhlükəsizlik komandasına göndərildi");
  };

  return <div className="ml-auto flex items-center gap-1">
    <button type="button" disabled={busy || !latestMessageId} onClick={() => void report()}
      title="Şikayət et" className="rounded-lg border p-2 text-muted-foreground hover:text-destructive disabled:opacity-50">
      <Flag className="h-4 w-4" />
    </button>
    <button type="button" disabled={busy} onClick={() => void toggleBlock()}
      title={blocked ? "Bloku aç" : "Blokla"}
      className={`rounded-lg border p-2 ${blocked ? "border-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
      {blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
    </button>
  </div>;
}


