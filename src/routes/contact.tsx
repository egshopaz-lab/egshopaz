import { createFileRoute } from "@tanstack/react-router";
import { Clock, ExternalLink, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { absoluteUrl } from "@/lib/site";

const SUPPORT_PHONE = "+994105287946";
const SUPPORT_PHONE_DISPLAY = "+994 10 528 79 46";
const INSTAGRAM_URL = "https://www.instagram.com/egshop.az?utm_source=qr&igsh=MW54N25wZmU0Nm42Mw%3D%3D";
const FACEBOOK_URL = "https://www.facebook.com/share/1BWiaWT6hx/";

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
    ? {
        title: "Контакты",
        email: "Служба поддержки",
        phone: "Телефон поддержки",
        social: "Социальные сети",
        instagram: "Instagram",
        facebook: "Facebook",
        address: "Баку, Азербайджан",
        hours: "Поддержка: пн–пт, 09:00–18:00",
        note: "По вопросам заказов укажите номер заказа в письме.",
      }
    : language === "en"
      ? {
          title: "Contact",
          email: "Customer support",
          phone: "Support phone",
          social: "Social media",
          instagram: "Instagram",
          facebook: "Facebook",
          address: "Baku, Azerbaijan",
          hours: "Support: Mon–Fri, 09:00–18:00",
          note: "Please include your order number when contacting support.",
        }
      : {
          title: "Əlaqə",
          email: "Müştəri dəstəyi",
          phone: "Dəstək telefonu",
          social: "Sosial şəbəkələr",
          instagram: "Instagram",
          facebook: "Facebook",
          address: "Bakı, Azərbaycan",
          hours: "Dəstək: B.e.–Cümə, 09:00–18:00",
          note: "Sifarişlə bağlı müraciətdə sifariş nömrəsini qeyd edin.",
        };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <h1 className="text-3xl font-black mb-6">{copy.title}</h1>
      <div className="space-y-4 bg-card border border-border rounded-2xl p-6">
        <a href="mailto:info@egshop.az" className="flex items-center gap-3 hover:text-primary">
          <Mail className="h-5 w-5 text-primary" />
          <span><strong>{copy.email}:</strong> info@egshop.az</span>
        </a>
        <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-3 hover:text-primary">
          <Phone className="h-5 w-5 text-primary" />
          <span><strong>{copy.phone}:</strong> {SUPPORT_PHONE_DISPLAY}</span>
        </a>
        <div className="flex items-start gap-3">
          <Instagram className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">{copy.social}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.instagram}
                title={copy.instagram}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-amber-400 text-white shadow-sm transition hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.facebook}
                title={copy.facebook}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm transition hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <span className="font-black text-2xl leading-none" aria-hidden="true">f</span>
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 hover:border-primary hover:text-primary">
                {copy.instagram} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 hover:border-primary hover:text-primary">
                {copy.facebook} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-primary" /><span>{copy.address}</span></div>
        <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /><span>{copy.hours}</span></div>
        <p className="text-sm text-muted-foreground border-t border-border pt-4">{copy.note}</p>
      </div>
    </div>
  );
}
