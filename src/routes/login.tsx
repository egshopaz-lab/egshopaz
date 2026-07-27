import { createFileRoute } from "@tanstack/react-router";
import { PortalAuthRoute } from "@/components/PortalAuthRoute";
import { SellerLanding } from "@/components/SellerLanding";
import { usePortal, usePortalReady } from "@/lib/portals";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    form: z.enum(["1"]).optional(),
  }),
  head: () => ({
    meta: [{ title: "Giriş — EG Shop" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { form } = Route.useSearch();
  const portal = usePortal();
  const portalReady = usePortalReady();

  if (!portalReady) {
    return <div className="min-h-screen bg-white" />;
  }

  if (portal === "seller" && !form) {
    return <SellerLanding />;
  }

  return <PortalAuthRoute mode="login" />;
}

