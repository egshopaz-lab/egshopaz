import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";

interface Follower {
  id: string;
  user_id: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function SellerFollowers({ sellerId }: { sellerId: string }) {
  const [items, setItems] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("shop_followers")
        .select("id, user_id, created_at")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      const ids = (rows ?? []).map((r) => r.user_id);
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles_public")
          .select("id, full_name, avatar_url")
          .in("id", ids);
        profilesMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      setItems(
        (rows ?? []).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          created_at: r.created_at,
          full_name: profilesMap[r.user_id]?.full_name ?? null,
          avatar_url: profilesMap[r.user_id]?.avatar_url ?? null,
        }))
      );
      setLoading(false);
    })();
  }, [sellerId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Users className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">İzləyicilər</h2>
          <p className="text-sm text-muted-foreground">
            Mağazanızı izləyən müştərilər ({items.length})
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Yüklənir...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Hələ izləyiciniz yoxdur.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              {f.avatar_url ? (
                <img src={f.avatar_url} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground">
                  {(f.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{f.full_name ?? "İstifadəçi"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(f.created_at)} tarixindən izləyir
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
