import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../Hooks/useLocale";
import { formatCurrency, formatNumber } from "../../i18n/format";
import type { UnitDto } from "../../Types/contracts";
import { BidiText } from "../../Components/BidiText";

export function Facts({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="border-t border-accent/40 pt-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="mt-2 text-lg font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function UnitFacts({
  unit,
  full = false,
  showMeterPrices = true,
}: {
  unit: UnitDto;
  full?: boolean;
  showMeterPrices?: boolean;
}) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const items: { label: string; value: ReactNode }[] = [
    { label: t("unitPrice"), value: formatCurrency(unit.totalPrice, locale) },
    {
      label: t("size"),
      value: t("squareMeters", {
        value: formatNumber(unit.size, locale, { maximumFractionDigits: 4 }),
      }),
    },
    { label: t("floor"), value: formatNumber(unit.floorNumber, locale) },
    {
      label: t("availability"),
      value: t(unit.isAvailable ? "available" : "unavailable"),
    },
  ];
  if (full) {
    items.unshift({ label: t("unitNumber"), value: <BidiText>{unit.number}</BidiText> });
    items.push(
      { label: t("garage"), value: t(unit.isGarage ? "yes" : "no") },
      {
        label: t("garagePrice"),
        value: formatCurrency(unit.garagePrice, locale),
      },
    );
    if (showMeterPrices) {
      items.push({
        label: t("meterPrice"),
        value: formatCurrency(unit.meterPrice, locale),
      });
    }
    if (showMeterPrices && unit.neighborMeterPrice !== null)
      items.push({
        label: t("neighborMeterPrice"),
        value: formatCurrency(unit.neighborMeterPrice, locale),
      });
    if (unit.percentage !== null)
      items.push({
        label: t("percentage"),
        value: t("percentValue", {
          value: formatNumber(unit.percentage, locale, {
            maximumFractionDigits: 6,
          }),
        }),
      });
  }
  return <Facts items={items} />;
}
