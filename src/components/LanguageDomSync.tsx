import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import az from "@/i18n/locales/az.json";
import ru from "@/i18n/locales/ru.json";
import en from "@/i18n/locales/en.json";

type Lang = "az" | "ru" | "en";

type TranslationEntry = { ru: string; en: string };

const textOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Partial<Record<string, string>>>();

const AZ_CHARS = /[ĆŹÉ™ÄžÄźÄ°Ä±Ă–Ă¶ĂśĂĽĂ‡Ă§ĹžĹź]/;
const ATTRS = ["placeholder", "title", "aria-label"] as const;

const EXTRA_PHRASES: Record<string, TranslationEntry> = {
  "EG Shop tÉ™tbiqini yĂĽklÉ™": { ru: "ĐˇĐşĐ°Ń‡Đ°Ń‚ŃŚ ĐżŃ€Đ¸Đ»ĐľĐ¶ĐµĐ˝Đ¸Đµ EG Shop", en: "Download the EG Shop app" },
  "Daha sĂĽrÉ™tli alÄ±Ĺź-veriĹź, bildiriĹźlÉ™r vÉ™ xĂĽsusi endirimlÉ™r tÉ™tbiqdÉ™.": {
    ru: "Đ‘ĐľĐ»ĐµĐµ Đ±Ń‹ŃŃ‚Ń€Ń‹Đµ ĐżĐľĐşŃĐżĐşĐ¸, ŃĐ˛ĐµĐ´ĐľĐĽĐ»ĐµĐ˝Đ¸ŃŹ Đ¸ ŃĐżĐµŃ†Đ¸Đ°Đ»ŃŚĐ˝Ń‹Đµ ŃĐşĐ¸Đ´ĐşĐ¸ â€” Đ˛ ĐżŃ€Đ¸Đ»ĐľĐ¶ĐµĐ˝Đ¸Đ¸.",
    en: "Faster shopping, notifications and special discounts in the app.",
  },
  "YĂĽklÉ™": { ru: "ĐˇĐşĐ°Ń‡Đ°Ń‚ŃŚ", en: "Download" },
  "Sonra": { ru: "ĐźĐľĐ·Đ¶Đµ", en: "Later" },
  "Toggle Sidebar": { ru: "ĐžŃ‚ĐşŃ€Ń‹Ń‚ŃŚ ĐĽĐµĐ˝ŃŽ", en: "Toggle menu" },
  "SÉ™hifÉ™ tapÄ±lmadÄ±": { ru: "ĐˇŃ‚Ń€Đ°Đ˝Đ¸Ń†Đ° Đ˝Đµ Đ˝Đ°ĐąĐ´ĐµĐ˝Đ°", en: "Page not found" },
  "AxtardÄ±ÄźÄ±nÄ±z sÉ™hifÉ™ mĂ¶vcud deyil vÉ™ ya kĂ¶Ă§ĂĽrĂĽlĂĽb.": {
    ru: "ĐˇŃ‚Ń€Đ°Đ˝Đ¸Ń†Đ°, ĐşĐľŃ‚ĐľŃ€ŃŃŽ Đ˛Ń‹ Đ¸Ń‰ĐµŃ‚Đµ, Đ˝Đµ ŃŃŃ‰ĐµŃŃ‚Đ˛ŃĐµŃ‚ Đ¸Đ»Đ¸ Đ±Ń‹Đ»Đ° ĐżĐµŃ€ĐµĐĽĐµŃ‰ĐµĐ˝Đ°.",
    en: "The page you are looking for does not exist or has been moved.",
  },
  "Ana sÉ™hifÉ™yÉ™ qayÄ±t": { ru: "Đ’ĐµŃ€Đ˝ŃŃ‚ŃŚŃŃŹ Đ˝Đ° ĐłĐ»Đ°Đ˛Đ˝ŃŃŽ", en: "Go back home" },
  "Ă‡Ä±xÄ±Ĺź": { ru: "Đ’Ń‹ĐąŃ‚Đ¸", en: "Logout" },
  "SatÄ±cÄ± paneli": { ru: "ĐźĐ°Đ˝ĐµĐ»ŃŚ ĐżŃ€ĐľĐ´Đ°Đ˛Ń†Đ°", en: "Seller panel" },
  "PVZ PUNKT paneli": { ru: "ĐźĐ°Đ˝ĐµĐ»ŃŚ ĐźĐ’Đ—", en: "PVZ panel" },
  "BakÄ±, AzÉ™rbaycan": { ru: "Đ‘Đ°ĐşŃ, ĐĐ·ĐµŃ€Đ±Đ°ĐąĐ´Đ¶Đ°Đ˝", en: "Baku, Azerbaijan" },
  "ĆŹlaqÉ™": { ru: "ĐšĐľĐ˝Ń‚Đ°ĐşŃ‚Ń‹", en: "Contact" },
  "ĹžÉ™rtlÉ™r vÉ™ qaydalar": { ru: "ĐŁŃĐ»ĐľĐ˛Đ¸ŃŹ Đ¸ ĐżŃ€Đ°Đ˛Đ¸Đ»Đ°", en: "Terms and rules" },
  "MÉ™xfilik siyasÉ™ti": { ru: "ĐźĐľĐ»Đ¸Ń‚Đ¸ĐşĐ° ĐşĐľĐ˝Ń„Đ¸Đ´ĐµĐ˝Ń†Đ¸Đ°Đ»ŃŚĐ˝ĐľŃŃ‚Đ¸", en: "Privacy policy" },
  "MĂĽqayisÉ™ ĂĽĂ§ĂĽn daxil olun": { ru: "Đ’ĐľĐąĐ´Đ¸Ń‚Đµ Đ´Đ»ŃŹ ŃŃ€Đ°Đ˛Đ˝ĐµĐ˝Đ¸ŃŹ", en: "Sign in to compare" },
  "MĂĽqayisÉ™ siyahÄ±nÄ±z boĹźdur": { ru: "ĐˇĐżĐ¸ŃĐľĐş ŃŃ€Đ°Đ˛Đ˝ĐµĐ˝Đ¸ŃŹ ĐżŃŃŃ‚", en: "Your comparison list is empty" },
  "Kataloqa keĂ§": { ru: "ĐźĐµŃ€ĐµĐąŃ‚Đ¸ Đ˛ ĐşĐ°Ń‚Đ°Đ»ĐľĐł", en: "Go to catalog" },
  "SÉ™bÉ™tÉ™": { ru: "Đ’ ĐşĐľŃ€Đ·Đ¸Đ˝Ń", en: "To cart" },
  "Ă–dÉ™niĹź": { ru: "ĐžĐżĐ»Đ°Ń‚Đ°", en: "Payment" },
  "KartlarÄ±m": { ru: "ĐśĐľĐ¸ ĐşĐ°Ń€Ń‚Ń‹", en: "My cards" },
  "Yeni kart É™lavÉ™ et": { ru: "Đ”ĐľĐ±Đ°Đ˛Đ¸Ń‚ŃŚ Đ˝ĐľĐ˛ŃŃŽ ĐşĐ°Ń€Ń‚Ń", en: "Add new card" },
  "Kart nĂ¶mrÉ™si": { ru: "ĐťĐľĐĽĐµŃ€ ĐşĐ°Ń€Ń‚Ń‹", en: "Card number" },
  "Kart sahibinin adÄ±": { ru: "ĐĐĽŃŹ Đ˛Đ»Đ°Đ´ĐµĐ»ŃŚŃ†Đ° ĐşĐ°Ń€Ń‚Ń‹", en: "Cardholder name" },
  "ĆŹlavÉ™ et": { ru: "Đ”ĐľĐ±Đ°Đ˛Đ¸Ń‚ŃŚ", en: "Add" },
  "LÉ™Äźv et": { ru: "ĐžŃ‚ĐĽĐµĐ˝Đ°", en: "Cancel" },
  "HÉ™lÉ™ kartÄ±nÄ±z yoxdur": { ru: "ĐŁ Đ˛Đ°Ń ĐżĐľĐşĐ° Đ˝ĐµŃ‚ ĐşĐ°Ń€Ń‚Ń‹", en: "You do not have a card yet" },
  "SifariĹź tapÄ±lmadÄ±.": { ru: "Đ—Đ°ĐşĐ°Đ· Đ˝Đµ Đ˝Đ°ĐąĐ´ĐµĐ˝.", en: "Order not found." },
  "Bu sifariĹź artÄ±q Ă¶dÉ™nilib": { ru: "Đ­Ń‚ĐľŃ‚ Đ·Đ°ĐşĐ°Đ· ŃĐ¶Đµ ĐľĐżĐ»Đ°Ń‡ĐµĐ˝", en: "This order is already paid" },
  "SifariĹźlÉ™rÉ™ qayÄ±t": { ru: "Đ’ĐµŃ€Đ˝ŃŃ‚ŃŚŃŃŹ Đş Đ·Đ°ĐşĐ°Đ·Đ°ĐĽ", en: "Back to orders" },
  "Ă–dÉ™nilÉ™cÉ™k mÉ™blÉ™Äź": { ru: "ĐˇŃĐĽĐĽĐ° Đş ĐľĐżĐ»Đ°Ń‚Đµ", en: "Amount to pay" },
  "Kart seĂ§in": { ru: "Đ’Ń‹Đ±ĐµŃ€Đ¸Ń‚Đµ ĐşĐ°Ń€Ń‚Ń", en: "Select a card" },
  "Yeni kart ilÉ™ Ă¶dÉ™": { ru: "ĐžĐżĐ»Đ°Ń‚Đ¸Ń‚ŃŚ Đ˝ĐľĐ˛ĐľĐą ĐşĐ°Ń€Ń‚ĐľĐą", en: "Pay with a new card" },
  "NĂ¶vbÉ™ti dÉ™fÉ™ ĂĽĂ§ĂĽn bu kartÄ± yadda saxla": { ru: "ĐˇĐľŃ…Ń€Đ°Đ˝Đ¸Ń‚ŃŚ ŃŤŃ‚Ń ĐşĐ°Ń€Ń‚Ń Đ´Đ»ŃŹ ŃĐ»ĐµĐ´ŃŃŽŃ‰ĐµĐłĐľ Ń€Đ°Đ·Đ°", en: "Save this card for next time" },
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
    const storedOriginal = textOriginals.get(node);
    if (
      storedOriginal
      && current !== storedOriginal
      && current !== translateValue(storedOriginal, lang)
    ) {
      // React/i18next has rendered a newer localized value (for example a
      // translated category from the database). Do not restore stale text.
      textOriginals.delete(node);
    }
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
      const storedOriginal = stored[attr];
      if (
        storedOriginal
        && current !== storedOriginal
        && current !== translateValue(storedOriginal, lang)
      ) {
        delete stored[attr];
      }
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

    const observer = new MutationObserver(schedule);
    const startTimer = window.setTimeout(() => {
      schedule();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRS],
      });
    }, 800);
    window.addEventListener("eg-language-sync", schedule);
    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("eg-language-sync", schedule);
    };
  }, [lang]);

  return null;
}

