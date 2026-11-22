import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BidiText } from "../../../Components/BidiText";
import { Facts } from "../../../Components/Facts";
import { useLocale } from "../../../Hooks/useLocale";
import { formatCurrency, formatNumber } from "../../../i18n/format";
import type { UnitDto, UnitListDto } from "../../../Types/contracts";

export function UnitFacts({
  unit,
  full = false,
  showMeterPrices = true,
  showTotalPrice = true,
}: {
  unit: UnitDto | UnitListDto;
  full?: boolean;
  showMeterPrices?: boolean;
  showTotalPrice?: boolean;
}) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const items: { label: string; value: ReactNode }[] = [
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
  if (showTotalPrice) items.unshift({ label: t("unitPrice"), value: formatCurrency(unit.totalPrice, locale) });
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
    items.push({
        label: t("percentage"),
        value: unit.percentage == null ? t("priceUnavailable") : t("percentValue", {
          value: formatNumber(unit.percentage, locale, {
            maximumFractionDigits: 6,
          }),
        }),
      });
  }
  return <Facts items={items} />;
}
