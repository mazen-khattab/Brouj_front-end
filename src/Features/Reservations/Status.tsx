import { useTranslation } from "react-i18next";

export function Status({ value }: { value: number }) {
  const { t } = useTranslation("account");
  return (
    <span className="inline-flex rounded-ui bg-accent-light px-4 py-2 text-sm font-medium text-primary">
      {t(`reservationStatus.${value}`, { defaultValue: t("unknownStatus") })}
    </span>
  );
}
