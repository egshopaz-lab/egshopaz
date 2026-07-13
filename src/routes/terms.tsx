import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Şərtlər və qaydalar — EG Shop" },
      { name: "description", content: "EG Shop platformasının istifadə şərtləri və qaydaları: sifariş, çatdırılma, geri qaytarma və alıcı-satıcı məsuliyyətləri." },
      { property: "og:title", content: "Şərtlər və qaydalar — EG Shop" },
      { property: "og:description", content: "EG Shop platformasının istifadə şərtləri və qaydaları: sifariş, çatdırılma, geri qaytarma və alıcı-satıcı məsuliyyətləri." },
      { property: "og:url", content: absoluteUrl("/terms") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl prose prose-slate">
      <h1 className="text-3xl font-black mb-6">Şərtlər və qaydalar</h1>
      <p className="text-muted-foreground">EG Shop platformasından istifadə edərək aşağıdakı şərtləri qəbul etmiş olursunuz.</p>
      <h2 className="text-xl font-bold mt-6 mb-2">1. Ümumi müddəalar</h2>
      <p className="text-muted-foreground">Platforma alıcılar və satıcılar arasında vasitəçi rolunu oynayır.</p>
      <h2 className="text-xl font-bold mt-6 mb-2">2. Sifariş və çatdırılma</h2>
      <p className="text-muted-foreground">Sifarişlər seçilmiş PVZ punktları və ya kuryer vasitəsilə çatdırılır.</p>
      <h2 className="text-xl font-bold mt-6 mb-2">3. Geri qaytarma</h2>
      <p className="text-muted-foreground">Məhsulların geri qaytarılması qaydalarına uyğun aparılır.</p>
    </div>
  );
}
