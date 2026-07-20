import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PortalAuthForm, type AuthMode } from "@/routes/auth";
import { PORTAL_CONFIG, portalUrl, usePortal } from "@/lib/portals";
import { useMojibakeRepair } from "@/hooks/useMojibakeRepair";

export function PortalAuthRoute({ mode, referralCode }: { mode: AuthMode; referralCode?: string }) {
  const portal = usePortal();
  const [ready, setReady] = useState(false);
  useMojibakeRepair(ready);
  useEffect(() => setReady(true), []);

  if (!ready) return <div className="min-h-[420px]" />;

  const config = PORTAL_CONFIG[portal];
  if (portal === "admin" && mode === "signup") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Admin qeydiyyatı</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Təhlükəsizlik səbəbilə açıq admin qeydiyyatı yoxdur. Admin hesabı yalnız mövcud sistem
            sahibi tərəfindən dəvət və rol təsdiqi ilə yaradılır.
          </p>
          <a
            href={portalUrl("admin", "/login")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-bold text-primary-foreground"
          >
            Admin girişinə keç
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      <PortalAuthForm
        fixedRole={config.role}
        fixedMode={mode}
        referralCode={referralCode}
        portalLabel={config.label}
      />
      <div className="-mt-6 pb-10 text-center text-sm text-muted-foreground">
        {mode === "login" ? "Hesabınız yoxdur? " : "Artıq hesabınız var? "}
        <a
          href={portalUrl(portal, mode === "login" ? "/register" : "/login")}
          className="font-semibold text-primary hover:underline"
        >
          {mode === "login" ? "Qeydiyyatdan keçin" : "Daxil olun"}
        </a>
      </div>
    </div>
  );
}
