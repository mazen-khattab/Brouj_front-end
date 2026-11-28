import { useTranslation } from "react-i18next";

export function Status({ value, className = "" }: { value: number; className?: string }) {
  const { t } = useTranslation("account");
  return (
    <span className={`inline-flex rounded-ui bg-accent-light px-4 py-2 text-sm font-medium text-primary ${className}`}>
      {t(`orderStatus.${value}`, { defaultValue: t("unknownStatus") })}
    </span>
  );
}
