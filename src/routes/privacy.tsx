import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Məxfilik siyasəti — EG Shop" },
      { name: "description", content: "EG Shop məxfilik siyasəti: hansı şəxsi məlumatları toplayırıq, necə istifadə edirik, hara saxlayırıq və üçüncü tərəflərlə paylaşılma qaydaları." },
      { property: "og:title", content: "Məxfilik siyasəti — EG Shop" },
      { property: "og:description", content: "EG Shop məxfilik siyasəti: şəxsi məlumatların toplanması, istifadəsi və qorunması haqqında ətraflı." },
      { property: "og:url", content: absoluteUrl("/privacy") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/privacy") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-3xl font-black mb-6">Məxfilik siyasəti</h1>
      <p className="text-muted-foreground mb-4">Sizin şəxsi məlumatlarınızın qorunması bizim üçün önəmlidir.</p>
      <h2 className="text-xl font-bold mt-6 mb-2">Toplanan məlumatlar</h2>
      <p className="text-muted-foreground">Ad, e-poçt, telefon nömrəsi və ünvan kimi məlumatlar yalnız sifarişin icrası üçün istifadə olunur.</p>
      <h2 className="text-xl font-bold mt-6 mb-2">Məlumatların paylaşılması</h2>
      <p className="text-muted-foreground">Məlumatlarınız üçüncü tərəflərlə paylaşılmır.</p>
    </div>
  );
}
