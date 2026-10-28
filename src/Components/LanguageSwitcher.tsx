import { useTranslation } from "react-i18next";
import { useLocale } from "../Hooks/useLocale";
import { Button } from "./Button";

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const target = locale === "ar" ? "en" : "ar";
  return (
    <Button
      variant="secondary"
      aria-label={t("languageSwitch")}
      onClick={() => setLocale(target)}
    >
      <span className={target === 'en' ? 'font-latin' : 'font-arabic'} lang={target} dir={target === "ar" ? "rtl" : "ltr"}>
        {target === "en" ? "English" : "العربية"}
      </span>
    </Button>
  );
}
