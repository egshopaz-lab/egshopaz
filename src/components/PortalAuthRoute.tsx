import { PortalAuthForm, type AuthMode } from "@/routes/auth";
import { SellerRegistrationWizard } from "@/components/SellerRegistrationWizard";
import { PORTAL_CONFIG, portalUrl, usePortal, usePortalReady } from "@/lib/portals";

export function PortalAuthRoute({ mode, referralCode }: { mode: AuthMode; referralCode?: string }) {
  const portal = usePortal();
  const ready = usePortalReady();

  if (!ready) return <div className="min-h-[420px]" />;

  const config = PORTAL_CONFIG[portal];
  if (portal === "seller" && mode === "signup") {
    return <SellerRegistrationWizard referralCode={referralCode} />;
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

