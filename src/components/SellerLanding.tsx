import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Headphones,
  LineChart,
  LockKeyhole,
  Megaphone,
  Menu,
  PackageCheck,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

const LOGIN_URL = "https://seller.egshop.az/login?form=1";
const REGISTER_URL = "https://seller.egshop.az/register";

const benefits = [
  {
    icon: Users,
    title: "Yeni müştərilərə çatın",
    description:
      "Məhsullarınızı Azərbaycanın hər yerindən alış-veriş edən müştərilərə təqdim edin.",
  },
  {
    icon: Boxes,
    title: "Məhsulları rahat idarə edin",
    description:
      "Stok, qiymət, sifariş və kampaniyaları vahid, aydın satıcı panelindən idarə edin.",
  },
  {
    icon: LineChart,
    title: "Satışınızı məlumatla böyüdün",
    description:
      "Satış göstəricilərini, gəliri və məhsul performansını real vaxtda izləyin.",
  },
];

const capabilities = [
  {
    icon: PackageCheck,
    title: "Sifariş idarəetməsi",
    description: "Yeni sifarişdən təhvilə qədər bütün mərhələləri izləyin.",
  },
  {
    icon: Megaphone,
    title: "Reklam və kampaniyalar",
    description: "Məhsul və mağazanızı düzgün auditoriyaya daha görünən edin.",
  },
  {
    icon: WalletCards,
    title: "Şəffaf maliyyə",
    description: "Gəlir, komissiya, ödəniş və çıxarışları detallı görün.",
  },
  {
    icon: ShieldCheck,
    title: "Təhlükəsiz əməliyyatlar",
    description: "Hesab və ödəniş axınları təhlükəsizlik nəzarəti ilə qorunur.",
  },
];

const steps = [
  {
    number: "01",
    title: "Qeydiyyatdan keçin",
    description: "Satıcı və biznes məlumatlarınızı mərhələli formada daxil edin.",
  },
  {
    number: "02",
    title: "Hesabınızı təsdiqləyin",
    description: "E-poçt təsdiqini və tələb olunan aktivləşdirmə addımlarını tamamlayın.",
  },
  {
    number: "03",
    title: "Mağazanızı hazırlayın",
    description: "Loqo, mağaza məlumatları və ilk məhsullarınızı əlavə edin.",
  },
  {
    number: "04",
    title: "Satışa başlayın",
    description: "Sifarişləri qəbul edin, nəticələri izləyin və biznesinizi böyüdün.",
  },
];

export function SellerLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <div className="bg-slate-950 px-4 py-2.5 text-center text-xs font-semibold text-white sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <Rocket className="h-4 w-4 text-violet-300" />
          EG Shop-da mağazanızı yaradın və onlayn satışa başlayın
        </span>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-3" aria-label="EG Shop Satıcı">
            <img src="/brand/eg-wordmark-dark.svg" alt="EG Shop" className="h-10 w-[145px] object-contain object-left" />
            <div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">
                Satıcı
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-700 lg:flex">
            <a href="#why-egshop" className="transition hover:text-violet-700">
              Niyə EG Shop?
            </a>
            <a href="#how-it-works" className="transition hover:text-violet-700">
              Necə işləyir?
            </a>
            <a href="#seller-tools" className="transition hover:text-violet-700">
              Satıcı imkanları
            </a>
            <a href="https://egshop.az/support" className="transition hover:text-violet-700">
              Dəstək
            </a>
          </nav>

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <a
              href={LOGIN_URL}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-5 text-sm font-black text-slate-900 transition hover:bg-slate-200"
            >
              <LockKeyhole className="h-4 w-4" />
              Daxil ol
            </a>
            <a
              href={REGISTER_URL}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-violet-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
            >
              Qeydiyyatdan keç
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="ml-auto grid h-11 w-11 place-items-center rounded-xl border border-slate-200 sm:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Menyunu bağla" : "Menyunu aç"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 sm:hidden">
            <nav className="grid gap-1 text-sm font-bold">
              <a href="#why-egshop" className="rounded-xl px-3 py-3" onClick={() => setMobileMenuOpen(false)}>
                Niyə EG Shop?
              </a>
              <a href="#how-it-works" className="rounded-xl px-3 py-3" onClick={() => setMobileMenuOpen(false)}>
                Necə işləyir?
              </a>
              <a href="#seller-tools" className="rounded-xl px-3 py-3" onClick={() => setMobileMenuOpen(false)}>
                Satıcı imkanları
              </a>
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={LOGIN_URL} className="rounded-xl bg-slate-100 px-3 py-3 text-center text-sm font-black">
                Daxil ol
              </a>
              <a href={REGISTER_URL} className="rounded-xl bg-violet-600 px-3 py-3 text-center text-sm font-black text-white">
                Qeydiyyat
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_78%_30%,rgba(196,181,253,0.52),transparent_28%),linear-gradient(180deg,#ffffff_0%,#faf9ff_100%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700">
                <BadgeCheck className="h-4 w-4" />
                Azərbaycanın yerli onlayn marketplace-i
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.03] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-7xl">
                Biznesinizi
                <span className="block bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
                  onlayn böyüdün
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                EG Shop satıcı hesabınızı yaradın, məhsullarınızı minlərlə alıcıya təqdim edin və
                bütün satış prosesini bir paneldən idarə edin.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={REGISTER_URL}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-violet-600 px-7 text-sm font-black text-white shadow-xl shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700"
                >
                  Satışa başla
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 text-sm font-black text-slate-900 transition hover:bg-slate-50"
                >
                  Necə işlədiyini öyrən
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-600">
                {["Sadə qeydiyyat", "Şəffaf maliyyə", "Satıcı dəstəyi"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -left-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-fuchsia-300/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-violet-950/20 sm:p-5">
                <div className="rounded-[1.4rem] bg-white p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400">Satıcı iş mərkəzi</p>
                      <p className="mt-1 text-lg font-black">Mağazanızın icmalı</p>
                    </div>
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                      <Store className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-violet-600 p-4 text-white">
                      <CircleDollarSign className="h-5 w-5 text-violet-200" />
                      <p className="mt-4 text-[11px] font-bold text-violet-200">Aylıq satış</p>
                      <p className="mt-1 text-2xl font-black">12 480 ₼</p>
                      <p className="mt-2 text-[10px] font-bold text-emerald-200">↑ 18.4% artım</p>
                    </div>
                    <div className="rounded-2xl bg-slate-100 p-4">
                      <ShoppingBag className="h-5 w-5 text-slate-600" />
                      <p className="mt-4 text-[11px] font-bold text-slate-500">Yeni sifarişlər</p>
                      <p className="mt-1 text-2xl font-black">36</p>
                      <p className="mt-2 text-[10px] font-bold text-violet-700">8-i hazırlanır</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black">Satış dinamikası</p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Son 7 gün</p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="mt-5 flex h-24 items-end gap-2">
                      {[40, 56, 45, 70, 62, 86, 98].map((height, index) => (
                        <div key={index} className="flex h-full flex-1 items-end rounded-full bg-violet-50">
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-violet-700 to-fuchsia-400"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:flex">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Çatdırılma</p>
                  <p className="text-xs font-black">Sifariş təhvil verildi</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why-egshop" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-22">
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Satış üçün doğru başlanğıc
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                EG Shop-da satmağın üstünlükləri
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="grid h-13 w-13 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-black">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="seller-tools" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Vahid idarəetmə
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Satış üçün lazım olan hər şey bir paneldə
              </h2>
              <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                Gündəlik əməliyyatları fərqli sistemlərdə axtarmayın. Məhsuldan maliyyəyə qədər
                bütün əsas prosesləri EG Shop satıcı panelində idarə edin.
              </p>
              <a
                href={REGISTER_URL}
                className="mt-7 inline-flex items-center gap-2 text-sm font-black text-violet-700"
              >
                Pulsuz hesab yaradın
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-3xl bg-slate-50 p-6">
                  <Icon className="h-7 w-7 text-violet-600" />
                  <h3 className="mt-8 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                Dörd sadə addım
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Bu gün başlayın
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <article key={step.number} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <span className="text-4xl font-black text-violet-400">{step.number}</span>
                  <h3 className="mt-8 text-lg font-black">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-400">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 px-6 py-12 text-center text-white shadow-2xl shadow-violet-600/20 sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Mağazanızı onlayn böyütməyə hazırsınız?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-6 text-violet-100 sm:text-base">
              EG Shop satıcı icmasına qoşulun və satış prosesinizi peşəkar alətlərlə idarə edin.
            </p>
            <a
              href={REGISTER_URL}
              className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-black text-violet-700 transition hover:-translate-y-0.5"
            >
              Qeydiyyatdan keç
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/brand/eg-wordmark-dark.svg" alt="EG Shop" className="h-9 w-[132px] object-contain object-left" />
            <div>
              <p className="font-black">Satıcı portalı</p>
              <p className="text-xs font-semibold text-slate-500">Biznesiniz üçün etibarlı tərəfdaş</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-slate-600 lg:ml-auto">
            <a href="https://egshop.az/terms" className="hover:text-violet-700">İstifadəçi şərtləri</a>
            <a href="https://egshop.az/privacy" className="hover:text-violet-700">Məxfilik siyasəti</a>
            <a href="https://egshop.az/support" className="inline-flex items-center gap-1.5 hover:text-violet-700">
              <Headphones className="h-3.5 w-3.5" />
              Dəstək
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

