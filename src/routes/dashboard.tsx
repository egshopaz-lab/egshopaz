import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { usePortal } from "@/lib/portals";

const AdminPanel = lazy(() => import("@/components/AdminPanel").then((module) => ({ default: module.AdminPanel })));
const SellerPanel = lazy(() => import("@/components/SellerPanel").then((module) => ({ default: module.SellerPanel })));
const PvzPanel = lazy(() => import("@/components/PvzPanel").then((module) => ({ default: module.PvzPanel })));

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "İdarə paneli — EG Shop" }] }),
  component: PortalDashboard,
});

function PortalDashboard() {
  const portal = usePortal();
  const panel = portal === "admin" ? <AdminPanel /> : portal === "seller" ? <SellerPanel /> : portal === "pvz" ? <PvzPanel /> : null;
  if (panel) {
    return (
      <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-muted/20" aria-label="Panel yüklənir" />}>
        {panel}
      </Suspense>
    );
  }
  return <Navigate to="/" replace />;
}
