import { useTranslation } from "react-i18next";

export function BrandWordmark() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-3.5 text-accent-light">
      <span
        aria-hidden="true"
        className="flex size-12 items-end justify-center gap-1 rounded-ui border border-accent/40 px-3 py-3 [direction:ltr]"
      >
        <i className="h-full w-1 bg-accent" />
        <i className="h-3/4 w-1 bg-accent" />
        <i className="h-1/2 w-1 bg-accent" />
      </span>
      <span className="text-2xl font-medium tracking-tight rtl:tracking-normal">
        {t("brand")}
      </span>
    </span>
  );
}
