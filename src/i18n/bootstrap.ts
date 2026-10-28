export type InitialLocale = "ar" | "en";

/** Establish document direction before any React rendering or translation initialization. */
export function bootstrapLocale(): InitialLocale {
  let locale: InitialLocale = "ar";
  try {
    if (localStorage.getItem("brouj.locale") === "en") locale = "en";
  } catch {
    // A blocked storage API must not prevent the Arabic default from rendering.
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  return locale;
}
