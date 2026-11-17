import { useTranslation } from "react-i18next";
import { useLocale } from "../Hooks/useLocale";
import { formatNumber } from "../i18n/format";
import { Select } from "./Fields";

export function PageSizeSelect({ pageSize, onChange }: { pageSize: number; onChange: (size: number) => void }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const sizes = [...new Set([12, 24, 48, pageSize])].sort((left, right) => left - right);

  return (
    <div className="w-full sm:w-auto sm:min-w-40">
      <Select id="catalogue-page-size" label={t("pageSize")} value={pageSize} onChange={(event) => onChange(Number(event.target.value))}>
        {sizes.map((size) => (
          <option key={size} value={size}>
            {formatNumber(size, locale)}
          </option>
        ))}
      </Select>
    </div>
  );
}
