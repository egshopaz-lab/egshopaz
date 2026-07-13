import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import az from "./locales/az.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const supportedLngs = ["az", "ru", "en"];

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: az },
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: "az",
    fallbackLng: "az",
    supportedLngs,
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined" && supportedLngs.includes(lng)) {
    localStorage.setItem("elzan_lang", lng);
  }
});

export default i18n;
