import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Əlaqə — EG Shop" },
      { name: "description", content: "EG Shop ilə əlaqə: e-poçt, telefon və ofis ünvanı. Sifariş, satıcı və texniki dəstək sualları üçün bizimlə əlaqə saxlayın." },
      { property: "og:title", content: "Əlaqə — EG Shop" },
      { property: "og:description", content: "EG Shop dəstək komandası ilə əlaqə üsulları: e-poçt, telefon və ünvan." },
      { property: "og:url", content: absoluteUrl("/contact") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contact") }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] ?? "az";
  const copy = language === "ru"
    ? { title: "Контакты", email: "Служба поддержки", address: "Баку, Азербайджан", hours: "Поддержка: пн–пт, 09:00–18:00", note: "По вопросам заказов укажите номер заказа в письме." }
    : language === "en"
      ? { title: "Contact", email: "Customer support", address: "Baku, Azerbaijan", hours: "Support: Mon–Fri, 09:00–18:00", note: "Please include your order number when contacting support." }
      : { title: "Əlaqə", email: "Müştəri dəstəyi", address: "Bakı, Azərbaycan", hours: "Dəstək: B.e.–Cümə, 09:00–18:00", note: "Sifarişlə bağlı müraciətdə sifariş nömrəsini qeyd edin." };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-black mb-6">{copy.title}</h1>
      <div className="space-y-4 bg-card border border-border rounded-2xl p-6">
        <a href="mailto:info@egshop.az" className="flex items-center gap-3 hover:text-primary">
          <Mail className="h-5 w-5 text-primary" />
          <span><strong>{copy.email}:</strong> info@egshop.az</span>
        </a>
        <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-primary" /><span>{copy.address}</span></div>
        <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /><span>{copy.hours}</span></div>
        <p className="text-sm text-muted-foreground border-t border-border pt-4">{copy.note}</p>
      </div>
    </div>
  );
}
