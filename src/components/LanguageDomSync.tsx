import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import az from "@/i18n/locales/az.json";
import ru from "@/i18n/locales/ru.json";
import en from "@/i18n/locales/en.json";

type Lang = "az" | "ru" | "en";

type TranslationEntry = { ru: string; en: string };

const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Partial<Record<string, string>>>();

const AZ_CHARS = /[ƏəĞğİıÖöÜüÇçŞş]/;
const ATTRS = ["placeholder", "title", "aria-label"] as const;

const EXTRA_PHRASES: Record<string, TranslationEntry> = {
  "EG Shop tətbiqini yüklə": { ru: "Скачать приложение EG Shop", en: "Download the EG Shop app" },
  "Daha sürətli alış-veriş, bildirişlər və xüsusi endirimlər tətbiqdə.": {
    ru: "Более быстрые покупки, уведомления и специальные скидки — в приложении.",
    en: "Faster shopping, notifications and special discounts in the app.",
  },
  "Yüklə": { ru: "Скачать", en: "Download" },
  "Sonra": { ru: "Позже", en: "Later" },
  "Toggle Sidebar": { ru: "Открыть меню", en: "Toggle menu" },
  "Səhifə tapılmadı": { ru: "Страница не найдена", en: "Page not found" },
  "Axtardığınız səhifə mövcud deyil və ya köçürülüb.": {
    ru: "Страница, которую вы ищете, не существует или была перемещена.",
    en: "The page you are looking for does not exist or has been moved.",
  },
  "Ana səhifəyə qayıt": { ru: "Вернуться на главную", en: "Go back home" },
  "Çıxış": { ru: "Выйти", en: "Logout" },
  "Satıcı paneli": { ru: "Панель продавца", en: "Seller panel" },
  "PVZ PUNKT paneli": { ru: "Панель ПВЗ", en: "PVZ panel" },
  "Bakı, Azərbaycan": { ru: "Баку, Азербайджан", en: "Baku, Azerbaijan" },
  "Əlaqə": { ru: "Контакты", en: "Contact" },
  "Şərtlər və qaydalar": { ru: "Условия и правила", en: "Terms and rules" },
  "Məxfilik siyasəti": { ru: "Политика конфиденциальности", en: "Privacy policy" },
  "Müqayisə üçün daxil olun": { ru: "Войдите для сравнения", en: "Sign in to compare" },
  "Müqayisə siyahınız boşdur": { ru: "Список сравнения пуст", en: "Your comparison list is empty" },
  "Kataloqa keç": { ru: "Перейти в каталог", en: "Go to catalog" },
  "Səbətə": { ru: "В корзину", en: "To cart" },
  "Ödəniş": { ru: "Оплата", en: "Payment" },
  "Kartlarım": { ru: "Мои карты", en: "My cards" },
  "Yeni kart əlavə et": { ru: "Добавить новую карту", en: "Add new card" },
  "Kart nömrəsi": { ru: "Номер карты", en: "Card number" },
  "Kart sahibinin adı": { ru: "Имя владельца карты", en: "Cardholder name" },
  "Əlavə et": { ru: "Добавить", en: "Add" },
  "Ləğv et": { ru: "Отмена", en: "Cancel" },
  "Hələ kartınız yoxdur": { ru: "У вас пока нет карты", en: "You do not have a card yet" },
  "Sifariş tapılmadı.": { ru: "Заказ не найден.", en: "Order not found." },
  "Bu sifariş artıq ödənilib": { ru: "Этот заказ уже оплачен", en: "This order is already paid" },
  "Sifarişlərə qayıt": { ru: "Вернуться к заказам", en: "Back to orders" },
  "Ödəniləcək məbləğ": { ru: "Сумма к оплате", en: "Amount to pay" },
  "Kart seçin": { ru: "Выберите карту", en: "Select a card" },
  "Yeni kart ilə ödə": { ru: "Оплатить новой картой", en: "Pay with a new card" },
  "Növbəti dəfə üçün bu kartı yadda saxla": { ru: "Сохранить эту карту для следующего раза", en: "Save this card for next time" },
};

const exactTranslations: Record<string, TranslationEntry> = { ...EXTRA_PHRASES };
const templateTranslations: Array<{ re: RegExp; ru: string; en: string; vars: string[] }> = [];

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  if (!obj || typeof obj !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[next] = value;
    else Object.assign(out, flatten(value, next));
  }
  return out;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTranslations() {
  const azFlat = flatten(az);
  const ruFlat = flatten(ru);
  const enFlat = flatten(en);
  for (const [key, azValue] of Object.entries(azFlat)) {
    const ruValue = ruFlat[key];
    const enValue = enFlat[key];
    if (!ruValue || !enValue) continue;
    if (azValue.includes("{{")) {
      const vars: string[] = [];
      const pattern = escapeRegex(azValue).replace(/\\\{\\\{\s*(\w+)\s*\\\}\\\}/g, (_, name: string) => {
        vars.push(name);
        return `(?<${name}>.+?)`;
      });
      templateTranslations.push({ re: new RegExp(`^${pattern}$`, "u"), ru: ruValue, en: enValue, vars });
    } else {
      exactTranslations[azValue] = { ru: ruValue, en: enValue };
    }
  }
}

buildTranslations();

function langCode(language: string | undefined): Lang {
  if (language?.startsWith("ru")) return "ru";
  if (language?.startsWith("en")) return "en";
  return "az";
}

function preserveOuterWhitespace(original: string, translated: string) {
  const start = original.match(/^\s*/)?.[0] ?? "";
  const end = original.match(/\s*$/)?.[0] ?? "";
  return `${start}${translated}${end}`;
}

function translateValue(original: string, lang: Lang) {
  if (lang === "az") return original;
  const trimmed = original.trim();
  const exact = exactTranslations[trimmed]?.[lang];
  if (exact) return preserveOuterWhitespace(original, exact);

  for (const tpl of templateTranslations) {
    const match = trimmed.match(tpl.re);
    if (!match?.groups) continue;
    let translated = tpl[lang];
    for (const name of tpl.vars) {
      translated = translated.replace(new RegExp(`{{\\s*${name}\\s*}}`, "g"), match.groups[name] ?? "");
    }
    return preserveOuterWhitespace(original, translated);
  }
  return original;
}

function isKnownAzerbaijaniUiText(value: string) {
  const trimmed = value.trim();
  return Boolean(exactTranslations[trimmed]) || templateTranslations.some((tpl) => tpl.re.test(trimmed)) || AZ_CHARS.test(trimmed);
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  const tag = parent.tagName;
  if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "OPTION"].includes(tag)) return true;
  return Boolean(parent.closest("[data-no-dom-i18n]"));
}

function syncTextNodes(lang: Lang) {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const current = node.nodeValue ?? "";
    if (isKnownAzerbaijaniUiText(current)) textOriginals.set(node, current);
    const original = textOriginals.get(node);
    if (!original) continue;
    const next = translateValue(original, lang);
    if (node.nodeValue !== next) node.nodeValue = next;
  }
}

function syncAttributes(lang: Lang) {
  if (!document.body) return;
  const selector = ATTRS.map((a) => `[${a}]`).join(",");
  document.querySelectorAll(selector).forEach((el) => {
    if (el.closest("[data-no-dom-i18n]")) return;
    const stored = attrOriginals.get(el) ?? {};
    let changed = false;
    for (const attr of ATTRS) {
      const current = el.getAttribute(attr);
      if (!current) continue;
      if (isKnownAzerbaijaniUiText(current)) {
        stored[attr] = current;
        changed = true;
      }
      const original = stored[attr];
      if (!original) continue;
      const next = translateValue(original, lang);
      if (current !== next) el.setAttribute(attr, next);
    }
    if (changed) attrOriginals.set(el, stored);
  });
}

function applyLanguageToDom(lang: Lang) {
  document.documentElement.lang = lang;
  syncTextNodes(lang);
  syncAttributes(lang);
}

export function LanguageDomSync() {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("elzan_lang");
      const next = langCode(saved || i18n.language);
      if (next !== langCode(i18n.language)) void i18n.changeLanguage(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [i18n]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => applyLanguageToDom(lang));
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    window.addEventListener("eg-language-sync", schedule);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("eg-language-sync", schedule);
    };
  }, [lang]);

  return null;
}