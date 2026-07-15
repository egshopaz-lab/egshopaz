import { createFileRoute } from "@tanstack/react-router";
import { PortalAuthRoute } from "@/components/PortalAuthRoute";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Giriş — EG Shop" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => <PortalAuthRoute mode="login" />,
});
