import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../Hooks/useLocale";
import { formatCurrency } from "../../i18n/format";
import type { UnitDto } from "../../Types/contracts";
import { Amenities, UnitFacts } from "./PropertyFacts";

export function UnitDetails({ unit }: { unit: UnitDto }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const id = useId();
  const prices = [
    { label: t("meterPrice"), value: formatCurrency(unit.meterPrice, locale) },
    {
      label: t("neighborMeterPrice"),
      value: unit.neighborMeterPrice === null ? t("priceUnavailable") : formatCurrency(unit.neighborMeterPrice, locale),
    },
  ];

  return (
    <div className="grid min-w-0 content-start gap-8">
      <section aria-labelledby={`${id}-pricing`} className="grid gap-5">
        <h2 id={`${id}-pricing`} className="text-2xl font-medium">
          {t("unitPricing")}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:gap-4">
          {prices.map((price, index) => (
            <div
              key={price.label}
              className={`min-w-0 rounded-ui border border-accent/40 p-4 [overflow-wrap:anywhere] sm:p-5 ${index === 0 ? "bg-primary text-ivory" : "bg-accent-light/35"}`}
            >
              <dt className={`text-sm leading-6 ${index === 0 ? "text-accent-light" : "text-muted"}`}>{price.label}</dt>
              <dd className="mt-3 text-lg font-medium sm:text-2xl">{price.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby={`${id}-details`} className="grid gap-5">
        <h2 id={`${id}-details`} className="text-2xl font-medium">
          {t("unitDetails")}
        </h2>
        <UnitFacts unit={unit} full showMeterPrices={false} />
        <Amenities items={unit.amenities} cards />
      </section>
    </div>
  );
}
