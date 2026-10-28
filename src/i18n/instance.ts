import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { bootstrapLocale } from "./bootstrap";
import type { InitialLocale } from "./bootstrap";
import { namespaces, resources } from "./resources";

export function createLocaleInstance(locale: InitialLocale) {
  const instance = createInstance();
  // Local resources initialize synchronously: no initial wrong-language frame or network loader.
  void instance.use(initReactI18next).init({
    resources: structuredClone(resources),
    ns: [...namespaces],
    defaultNS: "common",
    lng: locale,
    supportedLngs: ["ar", "en"],
    fallbackLng: "en",
    initAsync: false,
    returnNull: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false }, // React escapes rendered text.
    parseMissingKeyHandler: () => "Content unavailable",
    react: { useSuspense: false },
  });
  return instance;
}

export const i18n = createLocaleInstance(bootstrapLocale());
