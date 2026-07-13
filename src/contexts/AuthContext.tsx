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
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data?.map((r) => r.role as Role)) ?? []);
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
