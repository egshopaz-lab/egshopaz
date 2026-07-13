import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notif {
  id: string; title: string; body: string; type: string; link: string | null;
  is_read: boolean; created_at: string; pickup_code: string | null;
}

function playNotifSound() {
  try {
    const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    // Two-tone "ding-dong"
    [
      { f: 880, t: now },
      { f: 1320, t: now + 0.16 },
    ].forEach(({ f, t }) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.3);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* ignore */ }
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) { setItems([]); return; }
    let active = true;
    const load = () => {
      supabase.from("notifications").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => { if (active) setItems((data ?? []) as Notif[]); });
    };
    load();
    const ch = supabase.channel("notif-bell")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          playNotifSound();
          const n = payload.new as Notif;
          if (active) setItems((prev) => [n, ...prev].slice(0, 20));
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const markAll = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex flex-col items-center text-xs px-2 sm:px-3 py-1.5 hover:text-white/80 sm:hover:text-primary transition outline-none text-white sm:text-inherit min-w-0">
        <Bell className="h-5 w-5 mb-0.5" />
        {unread > 0 && (
          <span className="absolute top-0 right-1 bg-discount text-discount-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <span>{t("notifications.one")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-bold text-sm">{t("notifications.title")}</div>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">{t("notifications.empty")}</div>
          ) : items.map((n) => (
            <Link
              key={n.id}
              to={(n.link as "/orders" | "/my-reviews" | undefined) ?? "/notifications"}
              onClick={() => !n.is_read && markOne(n.id)}
              className={`block p-3 border-b last:border-0 hover:bg-secondary/50 transition ${!n.is_read ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                  {n.pickup_code && (
                    <div className="mt-1 inline-block font-mono text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {n.pickup_code}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link to="/notifications" className="p-2 text-center text-xs font-semibold text-primary hover:bg-secondary/50 border-t">
          {t("notifications.viewAll")}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
