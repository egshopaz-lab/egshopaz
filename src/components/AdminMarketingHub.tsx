import { BadgePercent, Crown, Image, Megaphone, Settings2, Sparkles } from "lucide-react";

interface AdminMarketingHubProps {
  onNavigate: (section: string) => void;
}

const tools = [
  {
    section: "commercial_settings",
    title: "Kampaniyalar və qiymətlər",
    description: "Kampaniya, kupon, modul və kommersiya qaydalarını idarə edin.",
    icon: Settings2,
  },
  {
    section: "banners",
    title: "Banner reklamları",
    description: "Desktop və mobil bannerləri, tarixləri və keçidləri idarə edin.",
    icon: Image,
  },
  {
    section: "packages",
    title: "Reklam paketləri",
    description: "Satıcı paketlərinin qiymət və limitlərini dəyişin.",
    icon: Crown,
  },
  {
    section: "trends",
    title: "EG Trends",
    description: "Trends planlarını, girişləri və paylaşımları idarə edin.",
    icon: Sparkles,
  },
  {
    section: "promo",
    title: "Promokodlar",
    description: "Endirim kodlarını yaradın, aktivləşdirin və istifadəyə nəzarət edin.",
    icon: BadgePercent,
  },
];

export function AdminMarketingHub({ onNavigate }: AdminMarketingHubProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-bold">Marketinq idarəetmə mərkəzi</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Buradakı kartlar işlək admin bölmələrini açır. Email, SMS və push göndərişi provayder
              qoşulmadan saxta "Göndər" əməliyyatı göstərmir.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((item) => (
          <button
            key={item.section}
            type="button"
            onClick={() => onNavigate(item.section)}
            className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="font-bold">{item.title}</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            <div className="mt-4 text-sm font-bold text-primary">İdarəetməni aç →</div>
          </button>
        ))}
      </div>
    </div>
  );
}
