import { Bot, ExternalLink, FileText, Image, LifeBuoy } from "lucide-react";

interface AdminContentHubProps {
  onNavigate: (section: string) => void;
}

const internalItems = [
  {
    section: "banners",
    title: "Ana səhifə bannerləri",
    description: "Banner şəkillərini, tarixlərini, prioritetini və keçidini dəyişin.",
    icon: Image,
  },
  {
    section: "ai_bot",
    title: "FAQ və AI bilik bazası",
    description: "Tez-tez verilən sualları əlavə edin, aktivləşdirin və silin.",
    icon: Bot,
  },
  {
    section: "support",
    title: "Dəstək müraciətləri",
    description: "İstifadəçi müraciətlərinə baxın və admin cavabı göndərin.",
    icon: LifeBuoy,
  },
];

const publicPages = [
  { title: "İstifadəçi şərtləri", href: "https://egshop.az/terms" },
  { title: "Məxfilik siyasəti", href: "https://egshop.az/privacy" },
];

export function AdminContentHub({ onNavigate }: AdminContentHubProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {internalItems.map((item) => (
          <button
            key={item.section}
            type="button"
            onClick={() => onNavigate(item.section)}
            className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md"
          >
            <item.icon className="h-6 w-6 text-primary" />
            <div className="mt-4 font-bold">{item.title}</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            <div className="mt-4 text-sm font-bold text-primary">İdarəetməni aç →</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 font-bold">
          <FileText className="h-5 w-5 text-primary" /> Hüquqi səhifələr
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {publicPages.map((page) => (
            <a
              key={page.href}
              href={page.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              {page.title}
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Hüquqi mətnlərin dəyişdirilməsi nəşrdən əvvəl hüquqi yoxlama tələb etdiyi üçün bu ekranda
          yalnız canlı səhifəyə təhlükəsiz baxış verilir.
        </p>
      </div>
    </div>
  );
}
