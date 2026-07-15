import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PortalAuthRoute } from "@/components/PortalAuthRoute";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ ref: z.string().optional() }),
  head: () => ({
    meta: [{ title: "Qeydiyyat — EG Shop" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { ref } = Route.useSearch();
  return <PortalAuthRoute mode="signup" referralCode={ref} />;
}
