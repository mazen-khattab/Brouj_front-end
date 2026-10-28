import { createContext } from "react";
import type { InitialLocale } from "../i18n/bootstrap";

export interface LocaleState {
  locale: InitialLocale;
  direction: "rtl" | "ltr";
  setLocale: (locale: InitialLocale) => void;
}

export const LocaleContext = createContext<LocaleState | null>(null);
