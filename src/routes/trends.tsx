import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { SellerTrends } from "@/components/SellerTrends";
import { TrendsFeed } from "@/components/TrendsFeed";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/lib/portals";

function TrendsRoute() {
  const portal = usePortal();
  const navigate = useNavigate();
  const { user, isSeller, loading } = useAuth();

  useEffect(() => {
    if (portal !== "seller" || loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!isSeller) navigate({ to: "/become-seller", replace: true });
  }, [isSeller, loading, navigate, portal, user]);

  if (portal !== "seller") return <TrendsFeed />;

  if (loading || !user || !isSeller) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 text-sm text-muted-foreground">
        Satıcı hesabı yoxlanılır…
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <Button asChild variant="ghost" className="mb-4 -ml-3">
        <Link to="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Satıcı panelinə qayıt
        </Link>
      </Button>
      <SellerTrends sellerId={user.id} />
    </div>
  );
}

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "EG Trends — mağazalardan yeniliklər" },
      {
        name: "description",
        content: "EG Shop satıcılarının yenilikləri, kampaniyaları və seçilmiş paylaşımları.",
      },
    ],
  }),
  component: TrendsRoute,
});
