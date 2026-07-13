import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ShieldCheck, Store, Truck, Users } from "lucide-react";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Haqqımızda — EG Shop" },
      { name: "description", content: "EG Shop-un məqsədi, iş prinsipi, alıcı, satıcı və PVZ ekosistemi haqqında." },
      { property: "og:title", content: "Haqqımızda — EG Shop" },
      { property: "og:description", content: "Azərbaycanda alıcıları, yerli satıcıları və çatdırılma nöqtələrini birləşdirən onlayn bazar yeri." },
      { property: "og:url", content: absoluteUrl("/about") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/about") }],
  }),
  component: AboutPage,
});

const features = [
  { icon: Users, title: "Alıcılar üçün", body: "Məhsulları müqayisə etmək, təhlükəsiz sifariş vermək, çatdırılmanı izləmək və dəstək almaq üçün rahat rəqəmsal mühit." },
  { icon: Store, title: "Satıcılar üçün", body: "Yerli bizneslərin mağaza yaratması, məhsul yerləşdirməsi, sifariş və satış nəticələrini idarə etməsi üçün vahid panel." },
  { icon: Building2, title: "PVZ şəbəkəsi", body: "Sifarişlərin yaxın təhvil nöqtəsinə çatdırılması, kodla yoxlanması və idarə olunan təhvil prosesi." },
  { icon: Truck, title: "Çatdırılma", body: "Satıcı, daşıyıcı, PVZ və alıcı arasında sifariş statuslarının aydın və ardıcıl ötürülməsi." },
];

function AboutPage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-emerald-500/10 p-7 md:p-12">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">EG Shop haqqında</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
          Azərbaycanda alış-verişi və yerli ticarəti bir platformada birləşdiririk
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          EG Shop alıcıları, müstəqil satıcıları, çatdırılma tərəfdaşlarını və PVZ təhvil nöqtələrini bir araya gətirən onlayn bazar yeridir. Məqsədimiz seçim etməyi, satışa başlamağı və sifarişi təhvil almağı daha sadə və şəffaf etməkdir.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Icon className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-bold">{title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-3xl border border-border bg-card p-7 md:p-10">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-9 w-9 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-black">İş prinsiplərimiz</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Düzgün məhsul məlumatı, rol əsaslı təhlükəsizlik, şəxsi məlumatların qorunması, qanuni ticarət və mübahisələrin sənədləşdirilmiş qaydada həlli bizim əsas prinsiplərimizdir. Satıcı məhsul və satış öhdəliklərinə, EG Shop isə platformanın texniki fəaliyyəti və proseslərin təşkilinə cavabdehdir.
            </p>
            <p className="mt-3 leading-7 text-muted-foreground">
              Platformanı mərhələli şəkildə inkişaf etdirir, istifadəçi rəylərinə əsasən kataloq, ödəniş, çatdırılma, PVZ və dəstək funksiyalarını təkmilləşdiririk.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-primary p-7 text-primary-foreground md:p-10">
        <h2 className="text-2xl font-black">Bizimlə əlaqə</h2>
        <p className="mt-2 max-w-2xl opacity-90">
          Tərəfdaşlıq, satıcı qeydiyyatı, PVZ əməkdaşlığı və ümumi suallar üçün əlaqə səhifəsindən bizə yaza bilərsiniz.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/contact" className="rounded-xl bg-background px-5 py-3 font-bold text-foreground">Əlaqə</Link>
          <Link to="/become-seller" className="rounded-xl border border-primary-foreground/40 px-5 py-3 font-bold">Satıcı ol</Link>
        </div>
      </section>
    </main>
  );
}
