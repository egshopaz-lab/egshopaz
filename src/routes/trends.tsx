import { createFileRoute } from "@tanstack/react-router";
import { TrendsFeed } from "@/components/TrendsFeed";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "EG Trends — mağazalardan yeniliklər" },
      { name: "description", content: "EG Shop satıcılarının yenilikləri, kampaniyaları və seçilmiş paylaşımları." },
    ],
  }),
  component: () => <TrendsFeed />,
});

