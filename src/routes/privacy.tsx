import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Məxfilik siyasəti — EG Shop" },
      { name: "description", content: "EG Shop-da şəxsi məlumatların toplanması, istifadəsi, saxlanması, paylaşılması və istifadəçi hüquqları haqqında geniş məxfilik siyasəti." },
      { property: "og:title", content: "Məxfilik siyasəti — EG Shop" },
      { property: "og:description", content: "Şəxsi məlumatlarınızı necə qoruduğumuzu və hansı hüquqlara malik olduğunuzu öyrənin." },
      { property: "og:url", content: absoluteUrl("/privacy") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/privacy") }],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "1. Siyasətin məqsədi və əhatə dairəsi",
    body: "Bu siyasət EG Shop saytından, mobil uyğunlaşdırılmış xidmətlərdən, alıcı, satıcı, PVZ və admin funksiyalarından istifadə zamanı şəxsi məlumatların necə emal edildiyini izah edir. Platformadan istifadə etməklə məlumatların bu siyasətdə göstərilən qaydada emal olunması barədə məlumatlandırılmış olursunuz.",
  },
  {
    title: "2. Topladığımız məlumatlar",
    body: "Hesab məlumatları (ad, soyad, e-poçt, telefon), giriş və təhlükəsizlik məlumatları, çatdırılma ünvanı, sifariş və ödəniş statusları, dəstək yazışmaları, cihaz və texniki jurnal məlumatları toplana bilər. Satıcılardan əlavə olaraq mağaza məlumatı, VÖEN, hesablaşma və qanunvericiliklə tələb olunan təsdiq məlumatları; PVZ əməkdaşlarından isə iş yeri, vəzifə və əməliyyat məlumatları alına bilər. Kartın tam rekvizitləri EG Shop tərəfindən saxlanılmırsa, ödəniş provayderinin qaydaları tətbiq olunur.",
  },
  {
    title: "3. Məlumatlardan istifadə məqsədləri",
    body: "Məlumatlar hesab yaratmaq və qorumaq, sifarişi qəbul və icra etmək, ödəniş və geri ödənişləri idarə etmək, çatdırılma və PVZ təhvilini təşkil etmək, satıcıları yoxlamaq, fırıldaqçılığın qarşısını almaq, dəstək göstərmək, qanuni öhdəlikləri yerinə yetirmək və xidmətin keyfiyyətini yaxşılaşdırmaq üçün istifadə edilir. Marketinq bildirişləri yalnız tətbiq olunan qaydalara və verdiyiniz seçimlərə uyğun göndərilir.",
  },
  {
    title: "4. Emalın hüquqi əsasları",
    body: "Emal müqavilənin icrası, qanuni öhdəlik, istifadəçinin razılığı və platformanın təhlükəsizliyi, fırıldaqçılığın qarşısının alınması və xidmətin təkmilləşdirilməsi kimi qanuni maraqlara əsaslana bilər. Razılığa əsaslanan emal üçün razılığınızı sonradan geri götürə bilərsiniz; bu, geri götürülmədən əvvəlki emalın qanuniliyinə təsir etmir.",
  },
  {
    title: "5. Məlumatların kimlərlə paylaşılması",
    body: "Sifarişin icrası üçün zəruri məlumatlar müvafiq satıcı, kuryer, PVZ, ödəniş və texniki xidmət provayderləri ilə minimum həcmdə paylaşa bilər. Məlumatlar qanuni tələb olduqda dövlət orqanlarına, məhkəməyə və hüquq-mühafizə orqanlarına təqdim edilə bilər. EG Shop şəxsi məlumatları ayrıca kommersiya məqsədi ilə satmır.",
  },
  {
    title: "6. Kukilər və texniki məlumatlar",
    body: "Sayt sessiyanın saxlanması, dil və giriş seçimləri, təhlükəsizlik və performans üçün kukilərdən və oxşar texnologiyalardan istifadə edə bilər. Brauzerinizdə kukiləri məhdudlaşdıra bilərsiniz, lakin bu halda giriş, səbət və bəzi digər funksiyalar düzgün işləməyə bilər.",
  },
  {
    title: "7. Saxlanma müddəti",
    body: "Məlumatlar hesab aktiv olduğu, xidmətin göstərilməsi üçün lazım olduğu və vergi, maliyyə, istehlakçı hüquqları, mübahisə və təhlükəsizlik üzrə qanuni müddətlər davam etdiyi qədər saxlanılır. Müddət bitdikdən sonra məlumatlar silinir, anonimləşdirilir və ya hüquqi əsas varsa məhdud saxlanılır.",
  },
  {
    title: "8. Məlumatların təhlükəsizliyi",
    body: "Giriş nəzarəti, şifrələnmiş əlaqə, rol əsaslı icazələr, jurnal nəzarəti və ehtiyat tədbirləri kimi texniki və təşkilati vasitələr tətbiq olunur. Heç bir internet sistemi tam risksiz olmadığı üçün istifadəçilər güclü şifrə seçməli, giriş məlumatlarını paylaşmamalı və şübhəli fəaliyyəti dərhal bildirməlidirlər.",
  },
  {
    title: "9. Hüquqlarınız",
    body: "Tətbiq olunan qanunvericiliyin imkan verdiyi həddə məlumatlarınıza çıxış, düzəliş, silinmə, emalın məhdudlaşdırılması və razılığın geri götürülməsini tələb edə bilərsiniz. Hesabın, sifarişin və ya qanuni öhdəliyin icrası üçün zəruri məlumatlar dərhal silinməyə bilər. Sorğu zamanı şəxsiyyətinizin təsdiqi tələb oluna bilər.",
  },
  {
    title: "10. Uşaqların məlumatları",
    body: "Yetkinlik yaşına çatmayan şəxslər platformadan valideyn və ya qanuni nümayəndənin razılığı və nəzarəti ilə istifadə etməlidir. Belə məlumatın qanunsuz toplandığını düşünürsünüzsə, bizimlə əlaqə saxlayın.",
  },
  {
    title: "11. Yeniliklər və əlaqə",
    body: "Xidmət və qanunvericilik dəyişdikdə siyasət yenilənə bilər. Əhəmiyyətli dəyişikliklər saytda və ya uyğun əlaqə kanalı ilə bildirilir. Məxfilik sorğuları üçün Əlaqə səhifəsindən müraciət edə bilərsiniz.",
  },
];

function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-10">
        <p className="mb-2 text-sm font-semibold text-primary">Son yenilənmə: 13 iyul 2026</p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Məxfilik siyasəti</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Şəxsi məlumatlarınıza məsuliyyətlə yanaşırıq. Aşağıdakı bölmələr məlumatların hansı səbəblə toplandığını və seçimlərinizi aydın şəkildə izah edir.
        </p>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold">{section.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-secondary/60 p-5 text-sm">
          Sorğunuz var? <Link to="/contact" className="font-bold text-primary hover:underline">Bizimlə əlaqə saxlayın</Link>.
        </div>
      </div>
    </main>
  );
}
