import { useCallback, useLayoutEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { i18n as I18nInstance } from "i18next";
import { I18nextProvider, useTranslation } from "react-i18next";
import { LocaleContext } from "./LocaleContext";
import type { LocaleState } from "./LocaleContext";
import type { InitialLocale } from "../i18n/bootstrap";
import { i18n } from "../i18n/instance";

function LocaleBridge({ children }: { children: ReactNode }) {
  const { i18n: instance } = useTranslation();
  const locale: InitialLocale =
    instance.resolvedLanguage === "en" ? "en" : "ar";
  const direction: LocaleState["direction"] = locale === "ar" ? "rtl" : "ltr";
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);
  const setLocale = useCallback(
    (next: InitialLocale) => {
      // Locale is a UI preference only. Storage denial does not block switching for this session.
      try {
        localStorage.setItem("brouj.locale", next);
      } catch {
        /* Private browsing may reject writes. */
      }
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      void instance.changeLanguage(next);
    },
    [instance],
  );
  const value = useMemo(
    () => ({ locale, direction, setLocale }),
    [locale, direction, setLocale],
  );
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function LocaleProvider({
  children,
  instance = i18n,
}: {
  children: ReactNode;
  instance?: I18nInstance;
}) {
  return (
    <I18nextProvider i18n={instance}>
      <LocaleBridge>{children}</LocaleBridge>
    </I18nextProvider>
  );
}
