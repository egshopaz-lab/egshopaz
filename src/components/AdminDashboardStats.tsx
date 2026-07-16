import { useCallback, useEffect, useState } from "react";
import { Building2, CalendarPlus, Store, UserCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  total_customers: number; total_sellers: number; total_pvz: number;
  active_sellers: number; active_pvz: number; today_customers: number;
  today_sellers: number; today_pvz: number;
}
const emptyStats: DashboardStats = { total_customers: 0, total_sellers: 0, total_pvz: 0, active_sellers: 0, active_pvz: 0, today_customers: 0, today_sellers: 0, today_pvz: 0 };

export function AdminDashboardStats() {
  const [stats, setStats] = useState(emptyStats);
  const [live, setLive] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_dashboard_stats" as never);
    if (!error && data) setStats({ ...emptyStats, ...(data as unknown as DashboardStats) });
  }, []);
  useEffect(() => {
    void load();
    const channel = supabase.channel("admin-live-account-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "pvz_staff" }, () => void load())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [load]);
  const cards = [
    ["Ümumi Müştəri", stats.total_customers, Users], ["Ümumi Satıcı", stats.total_sellers, Store],
    ["Ümumi PVZ", stats.total_pvz, Building2], ["Aktiv Satıcı", stats.active_sellers, UserCheck],
    ["Aktiv PVZ", stats.active_pvz, UserCheck], ["Bu gün Müştəri", stats.today_customers, CalendarPlus],
    ["Bu gün Satıcı", stats.today_sellers, CalendarPlus], ["Bu gün PVZ", stats.today_pvz, CalendarPlus],
  ] as const;
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><h2 className="font-black text-lg">Qeydiyyat statistikası</h2><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${live ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{live ? "● Real-time" : "Yenilənir"}</span></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(([label,value,Icon]) => <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card"><div className="flex items-center justify-between gap-3"><div><div className="text-xs text-muted-foreground font-semibold">{label}</div><div className="text-3xl font-black mt-1">{value}</div></div><Icon className="h-7 w-7 text-primary" /></div></div>)}</div>
  </div>;
}
