import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PanelLayout } from "@/components/PanelLayout";
import { useBuyerNav } from "@/hooks/useBuyerNav";
import { PvzOrderChat } from "@/components/PvzOrderChat";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/messages-pvz")({
  head: () => ({ meta: [{ title: "PVZ ilə əlaqə — EG Shop" }] }),
  component: MessagesPvzPage,
});

function MessagesPvzPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { items } = useBuyerNav();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  if (!user) return null;

  return (
    <PanelLayout title="Müştərinin şəxsi kabineti" subtitle={user.email ?? undefined} items={items}>
      <div>
        <h1 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" /> PVZ ilə əlaqə
        </h1>
        <PvzOrderChat mode="buyer" currentUserId={user.id} />
      </div>
    </PanelLayout>
  );
}
