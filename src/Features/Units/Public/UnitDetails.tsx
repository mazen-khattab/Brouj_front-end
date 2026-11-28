import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Amenities } from "../../../Components/Amenities";
import { BidiText } from "../../../Components/BidiText";
import { useLocale } from "../../../Hooks/useLocale";
import { formatCurrency, formatNumber } from "../../../i18n/format";
import type { UnitDto } from "../../../Types/contracts";
import { UnitFacts } from "./Facts";

export function UnitDetails({ unit }: { unit: UnitDto }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const id = useId();
  const plan = unit.paymentPlan ?? [];
  const prices = [
    { label: t("meterPrice"), value: formatCurrency(unit.meterPrice, locale) },
    {
      label: t("neighborMeterPrice"),
      value: unit.neighborMeterPrice === null ? t("priceUnavailable") : formatCurrency(unit.neighborMeterPrice, locale),
    },
  ];

  return (
    <div className="ud-information">
      <section aria-labelledby={`${id}-pricing`} className="ud-pricing" data-ud-enter>
        <h2 id={`${id}-pricing`} className="text-2xl font-medium">
          {t("unitPricing")}
        </h2>
        <div className="ud-total-price">
          <p>{t("unitPrice")}</p>
          <p>
            <BidiText direction="auto">{formatCurrency(unit.totalPrice, locale)}</BidiText>
          </p>
        </div>
        <dl className="ud-price-comparison">
          {prices.map((price, index) => (
            <div key={price.label} className={index === 0 ? "ud-brouj-price" : "ud-neighbour-price"}>
              <dt className={`text-sm leading-6 ${index === 0 ? "text-accent-light" : "text-muted"}`}>{price.label}</dt>
              <dd>
                <BidiText direction="auto">{price.value}</BidiText>
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby={`${id}-details`} className="ud-specifications" data-ud-enter>
        <h2 id={`${id}-details`} className="text-2xl font-medium">
          {t("unitDetails")}
        </h2>
        <div className="ud-facts">
          <UnitFacts unit={unit} full showMeterPrices={false} showTotalPrice={false} />
        </div>
        <div className="ud-amenities">
          <Amenities items={unit.amenities} cards />
        </div>
      </section>
      {plan.length > 0 && (
        <section aria-labelledby={`${id}-payment-plan`} className="ud-payment-plan" data-ud-enter>
          <h2 id={`${id}-payment-plan`} className="text-2xl font-medium">
            {t("paymentPlan.title")}
          </h2>
          <ol className="grid min-w-0 gap-3">
            {plan.map((row) =>
              "stageId" in row ? (
                <li key={row.stageId} className="ud-payment-row" data-ud-stage>
                  <h3 className="font-medium [overflow-wrap:anywhere]">
                    <BidiText direction="auto">{row.stageName}</BidiText>
                  </h3>
                  <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">{t("paymentPlan.percentage")}</dt>
                      <dd>
                        <BidiText direction="auto">
                          {formatNumber(row.unitPercentage / 100, locale, { style: "percent", maximumFractionDigits: 4 })}
                        </BidiText>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("paymentPlan.amount")}</dt>
                      <dd>
                        <BidiText direction="auto">
                          {row.stageCost === null ? t("paymentPlan.pricingUnavailable") : formatCurrency(row.stageCost, locale)}
                        </BidiText>
                      </dd>
                    </div>
                  </dl>
                </li>
              ) : (
                <li key={row.installmentNumber} className="ud-payment-row ud-installment" data-ud-stage>
                  <h3 className="font-medium [overflow-wrap:anywhere]">
                    <BidiText direction="auto">{row.installmentName}</BidiText>
                  </h3>
                  <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-muted">{t("paymentPlan.number")}</dt>
                      <dd>
                        <BidiText direction="auto">{formatNumber(row.installmentNumber, locale)}</BidiText>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted">{t("paymentPlan.percentage")}</dt>
                      <dd>
                        <BidiText direction="auto">
                          {formatNumber(row.installmentPercentage / 100, locale, { style: "percent", maximumFractionDigits: 4 })}
                        </BidiText>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted">{t("paymentPlan.timing")}</dt>
                      <dd>
                        <BidiText direction="auto">
                          {t("paymentPlan.months", {
                            count: row.installmentPeriodMonths,
                            months: formatNumber(row.installmentPeriodMonths, locale),
                          })}
                        </BidiText>
                      </dd>
                    </div>
                  </dl>
                </li>
              ),
            )}
          </ol>
        </section>
      )}
    </div>
  );
}
