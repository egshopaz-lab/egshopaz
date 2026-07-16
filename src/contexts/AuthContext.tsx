import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "seller" | "buyer" | "pvz";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isPvz: boolean;
  accountStatus: string;
  blockedUntil: string | null;
  blockReason: string | null;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accountStatus, setAccountStatus] = useState("active");
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string) => {
    const [{ data: roleData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("account_status,blocked_until,block_reason").eq("id", uid).maybeSingle(),
    ]);
    const profile = profileData as { account_status?: string; blocked_until?: string | null; block_reason?: string | null } | null;
    const temporaryExpired = profile?.account_status === "temporary_blocked" && profile.blocked_until
      ? new Date(profile.blocked_until) <= new Date()
      : false;
    const effectiveStatus = temporaryExpired ? "active" : (profile?.account_status ?? "active");
    setAccountStatus(effectiveStatus);
    setBlockedUntil(profile?.blocked_until ?? null);
    setBlockReason(profile?.block_reason ?? null);
    setRoles(effectiveStatus === "active" ? (roleData?.map((r) => r.role as Role) ?? []) : []);
    if (effectiveStatus === "active") {
      void supabase.from("profiles").update({ last_active_at: new Date().toISOString() } as never).eq("id", uid);
    }
  };

  useEffect(() => {
    let lastUserId: string | null = null;
    const applySession = async (s: Session | null, force = false) => {
      const newUid = s?.user?.id ?? null;
      if (!force && newUid === lastUserId) {
        // Same user — just refresh session/user refs, no role refetch, no loading flicker
        setSession(s);
        setUser(s?.user ?? null);
        return;
      }
      lastUserId = newUid;
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchRoles(s.user.id);
      } else {
        setRoles([]);
        setAccountStatus("active");
        setBlockedUntil(null);
        setBlockReason(null);
      }
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { void applySession(s); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void applySession(s, true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (user) await fetchRoles(user.id);
  };

  return (
    <Ctx.Provider value={{
      session, user, roles, loading,
      isSeller: roles.includes("seller"),
      isAdmin: roles.includes("admin"),
      isPvz: roles.includes("pvz"),
      accountStatus, blockedUntil, blockReason,
      signOut, refreshRoles,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
};
