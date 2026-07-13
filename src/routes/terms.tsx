import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Şərtlər və qaydalar — EG Shop" },
      { name: "description", content: "EG Shop platformasında hesab, sifariş, ödəniş, çatdırılma, PVZ, geri qaytarma və alıcı-satıcı məsuliyyətlərini tənzimləyən geniş istifadə şərtləri." },
      { property: "og:title", content: "Şərtlər və qaydalar — EG Shop" },
      { property: "og:description", content: "EG Shop platformasının alıcı, satıcı və PVZ istifadə qaydaları." },
      { property: "og:url", content: absoluteUrl("/terms") },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/terms") }],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "1. Ümumi müddəalar",
    body: "Bu Şərtlər EG Shop platformasına daxil olan və ondan istifadə edən alıcı, satıcı, PVZ əməkdaşı və digər istifadəçilərə tətbiq olunur. Hesab yaratmaq, sifariş vermək və ya platformanın funksiyalarından istifadə etməklə həmin anda qüvvədə olan Şərtləri qəbul etmiş olursunuz.",
  },
  {
    title: "2. Platformanın rolu",
    body: "EG Shop alıcılarla müstəqil satıcıları bir araya gətirən texnoloji bazar yeridir. Məhsulun satıcısı məhsul səhifəsində göstərilən tərəfdir və məhsulun qanuniliyi, keyfiyyəti, təsvirə uyğunluğu, zəmanəti və sənədlərinə görə tətbiq olunan qanunvericilik çərçivəsində məsuliyyət daşıyır. EG Shop sifariş, ödəniş, çatdırılma və mübahisə proseslərini təşkil edə bilər.",
  },
  {
    title: "3. Hesab və giriş təhlükəsizliyi",
    body: "İstifadəçi doğru, aktual və tam məlumat təqdim etməli, şifrəsini məxfi saxlamalıdır. Hesabda baş verən şübhəli fəaliyyəti dərhal bildirmək lazımdır. Başqasının adından icazəsiz hesab açmaq, saxta məlumat vermək, hesabı satmaq və təhlükəsizlik mexanizmlərini keçmək qadağandır.",
  },
  {
    title: "4. Satıcı qeydiyyatı və VÖEN",
    body: "Satıcı qeydiyyatı zamanı mağaza adı, əlaqə məlumatı və etibarlı 10 rəqəmli VÖEN təqdim edilməlidir. Satıcı vergi uçotu, lisenziya, sertifikat, kassa və istehlakçı qarşısındakı öhdəliklərini özü yerinə yetirir. EG Shop məlumatları yoxlaya, əlavə sənəd istəyə və yoxlama tamamlanana qədər satış imkanlarını məhdudlaşdıra bilər.",
  },
  {
    title: "5. Məhsullar, qiymətlər və məzmun",
    body: "Satıcı məhsulun adı, şəkli, təsviri, qiyməti, mövcudluğu, çatdırılma müddəti və digər xüsusiyyətlərini düzgün göstərməlidir. Yanıltıcı reklam, saxta rəy, kontrafakt məhsul, qanunla dövriyyəsi qadağan edilən mallar və üçüncü şəxsin hüquqlarını pozan məzmun qadağandır. Aşkar texniki qiymət səhvi olduqda sifariş icradan əvvəl ləğv edilə və ödənilmiş məbləğ geri qaytarıla bilər.",
  },
  {
    title: "6. Sifariş və müqavilənin yaranması",
    body: "Səbətə məhsul əlavə etmək rezervasiya sayılmır. Sifariş satıcı tərəfindən təsdiqləndikdə və ya sistemdə qəbul edildikdə icraya yönəldilir. Məhsul stokda olmadıqda, məlumat yanlış olduqda və ya təhlükəsizlik yoxlaması uğursuz olduqda sifariş ləğv edilə bilər; ödəniş tutulubsa, uyğun qaydada geri qaytarılır.",
  },
  {
    title: "7. Ödəniş, komissiya və geri ödəniş",
    body: "Mövcud ödəniş üsulları sifariş zamanı göstərilir. Bank və ödəniş provayderinin əlavə yoxlamaları tətbiq oluna bilər. Satıcı komissiyası və xidmət tarifləri satıcı panelində və ya ayrıca razılaşmada göstərilir. Geri ödəniş bank və ödəniş sisteminin emal müddətindən asılı olaraq hesaba gec çata bilər.",
  },
  {
    title: "8. Çatdırılma və PVZ",
    body: "Çatdırılma ünvanı, təxmini müddət və qiymət sifariş zamanı göstərilir. PVZ-dən təhvil zamanı sifariş kodu, QR və ya şəxsiyyəti təsdiq edən məlumat tələb oluna bilər. İstifadəçi əlaqə və ünvan məlumatlarının düzgünlüyünə cavabdehdir. Fors-major, hava, yol, təhlükəsizlik və daşıyıcı səbəbləri ilə gecikmə yarana bilər; bu halda istifadəçiyə mümkün qədər məlumat verilir.",
  },
  {
    title: "9. Ləğv, qaytarma və zəmanət",
    body: "Sifarişin ləğvi və məhsulun qaytarılması məhsulun növü, vəziyyəti, gigiyena və təhlükəsizlik xüsusiyyətləri, satıcının qanuni öhdəlikləri və Azərbaycan Respublikasının istehlakçı hüquqları qaydaları nəzərə alınmaqla aparılır. Qaytarılan məhsul komplekt, istifadə olunmamış və sübutlarla təqdim edilməli ola bilər. Qüsurlu və ya yanlış məhsul barədə mümkün qədər tez dəstəyə müraciət edilməlidir.",
  },
  {
    title: "10. Qadağan edilən davranışlar",
    body: "Fırıldaqçılıq, saxta sifariş, ödənişdən qanunsuz yayınma, zərərli kod, avtomatlaşdırılmış hücum, digər şəxsin məlumatından icazəsiz istifadə, təhqir, təhdid, platformadan kənar aldadıcı ödəniş tələbi və qanunsuz məhsul dövriyyəsi qadağandır. Belə hallarda sifariş dayandırıla, hesab məhdudlaşdırıla və qanuni tələb olduqda məlumat səlahiyyətli orqanlara təqdim edilə bilər.",
  },
  {
    title: "11. Əqli mülkiyyət",
    body: "EG Shop adı, loqosu, sayt dizaynı və platforma proqram təminatı müvafiq hüquq sahiblərinə məxsusdur. Satıcı yüklədiyi məzmunu istifadə etmək hüququna malik olduğunu təsdiqləyir və həmin məzmunun məhsulun təqdimatı üçün platformada göstərilməsinə zəruri həcmdə icazə verir.",
  },
  {
    title: "12. Hesabın məhdudlaşdırılması",
    body: "Şərtlərin pozulması, təhlükəsizlik riski, qanuni tələb, yüksək fırıldaqçılıq ehtimalı və ya istifadəçilərə zərər riski olduqda hesab və ya ayrı funksiyalar müvəqqəti məhdudlaşdırıla bilər. Mümkün və qanuni olduğu hallarda səbəb və etiraz yolu barədə məlumat verilir.",
  },
  {
    title: "13. Məsuliyyət və fors-major",
    body: "Tərəflərin məsuliyyəti tətbiq olunan qanunvericiliklə müəyyən edilir. Heç bir müddəa istehlakçının qanunla verilən məcburi hüquqlarını aradan qaldırmır. EG Shop nəzarətindən kənar rabitə, enerji, təbii hadisə, dövlət məhdudiyyəti və digər fors-major hallarından yaranan gecikmələrə görə qanunun icazə verdiyi həddə məsuliyyət daşımaya bilər.",
  },
  {
    title: "14. Mübahisələr və tətbiq olunan hüquq",
    body: "Əvvəlcə Əlaqə səhifəsi vasitəsilə dəstəyə müraciət etmək tövsiyə olunur. Mübahisə danışıqlar yolu ilə həll edilməzsə, Azərbaycan Respublikasının qanunvericiliyi və aidiyyəti üzrə səlahiyyətli məhkəmələrin qaydaları tətbiq olunur. İstehlakçının qanuni müraciət hüquqları saxlanılır.",
  },
  {
    title: "15. Şərtlərin yenilənməsi",
    body: "Xidmət, təhlükəsizlik və qanunvericilik dəyişdikdə Şərtlər yenilənə bilər. Yeni tarix bu səhifədə göstərilir; əhəmiyyətli dəyişikliklər uyğun kanalla bildirilir. Dəyişiklikdən sonra istifadənin davam etdirilməsi qüvvədə olan şərtlərin qəbulunu ifadə edir.",
  },
];

function TermsPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-10">
        <p className="mb-2 text-sm font-semibold text-primary">Son yenilənmə: 13 iyul 2026</p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Şərtlər və qaydalar</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Bu sənəd EG Shop-dan istifadə zamanı əsas hüquq və öhdəlikləri aydın şəkildə müəyyən edir.
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
          Şərtlərlə bağlı sualınız var? <Link to="/contact" className="font-bold text-primary hover:underline">Dəstəyə yazın</Link>.
        </div>
      </div>
    </main>
  );
}
