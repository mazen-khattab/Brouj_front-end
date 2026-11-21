import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { validatePaymentPlan, type PaymentPlanField, type PaymentPlanRow } from "./paymentPlan";

export function usePaymentPlanValidation(rows: readonly PaymentPlanRow[], submitted: boolean) {
  const id = useId();
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  const { total, issues, planIssue, paymentPlan } = validatePaymentPlan(rows);
  const formattedTotal = formatNumber(total / 100, locale, { style: "percent", maximumFractionDigits: 4 });
  const fieldId = (key: number, field: PaymentPlanField) => `${id}-${key}-${field}`;
  const totalId = `${id}-total`;
  const totalError = submitted && planIssue ? t(`paymentPlan.${planIssue}`, { total: formattedTotal }) : undefined;
  const fieldErrors = new Map<string, string>();
  const summary = [];
  if (submitted) {
    for (const { key, field, reason } of issues) {
      const id = fieldId(key, field);
      const message = t(`paymentPlan.${reason}`);
      fieldErrors.set(id, message);
      summary.push({ fieldId: id, message: `${t(`paymentPlan.${field}`)} · ${message}` });
    }
    if (totalError) summary.push({ fieldId: totalId, message: totalError });
  }
  return { paymentPlan, formattedTotal, fieldId, totalId, totalError, fieldErrors, summary };
}
