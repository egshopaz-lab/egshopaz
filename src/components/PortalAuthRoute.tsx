import { ShieldCheck } from "lucide-react";
import { PortalAuthForm, type AuthMode } from "@/routes/auth";
import { PORTAL_CONFIG, portalUrl, usePortal, usePortalReady } from "@/lib/portals";

export function PortalAuthRoute({ mode, referralCode }: { mode: AuthMode; referralCode?: string }) {
  const portal = usePortal();
  const ready = usePortalReady();

  if (!ready) return <div className="min-h-[420px]" />;

  const config = PORTAL_CONFIG[portal];
  if (portal === "admin" && mode === "signup") {
    return (
      <div className="container mx-auto max-w-lg px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Admin qeydiyyatÄ±</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            TÉ™hlĂĽkÉ™sizlik sÉ™bÉ™bilÉ™ aĂ§Ä±q admin qeydiyyatÄ± yoxdur. Admin hesabÄ± yalnÄ±z mĂ¶vcud sistem
            sahibi tÉ™rÉ™findÉ™n dÉ™vÉ™t vÉ™ rol tÉ™sdiqi ilÉ™ yaradÄ±lÄ±r.
          </p>
          <a
            href={portalUrl("admin", "/login")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-bold text-primary-foreground"
          >
            Admin giriĹźinÉ™ keĂ§
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
        {mode === "login" ? "HesabÄ±nÄ±z yoxdur? " : "ArtÄ±q hesabÄ±nÄ±z var? "}
        <a
          href={portalUrl(portal, mode === "login" ? "/register" : "/login")}
          className="font-semibold text-primary hover:underline"
        >
          {mode === "login" ? "Qeydiyyatdan keĂ§in" : "Daxil olun"}
        </a>
      </div>
    </div>
  );
}

