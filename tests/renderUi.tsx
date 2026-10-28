import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { LocaleProvider } from "../src/Context/LocaleProvider";
import { ToastProvider } from "../src/Context/ToastProvider";
import { createLocaleInstance } from "../src/i18n/instance";
import type { InitialLocale } from "../src/i18n/bootstrap";

export function renderUi(children: ReactNode, locale: InitialLocale = "en") {
  const instance = createLocaleInstance(locale);
  return {
    instance,
    ...render(
      <LocaleProvider instance={instance}>
        <ToastProvider>{children}</ToastProvider>
      </LocaleProvider>,
    ),
  };
}
