import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Input, Select } from "../../../Components/Fields";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { appendPaymentPlanRow, type PaymentPlanField, type PaymentPlanRow } from "./paymentPlan";
import type { usePaymentPlanValidation } from "./usePaymentPlanValidation";

const fields = [
  { name: "installmentNumber", inputMode: "numeric" },
  { name: "installmentPercentage", inputMode: "decimal" },
  { name: "installmentPeriodMonths", inputMode: "numeric" },
] as const;

const installmentNames = [
  { value: "Downpayment", label: "downpayment" },
  { value: "Installment", label: "installment" },
  { value: "Deposit", label: "deposit" },
] as const;

export function PaymentPlanEditor({ rows, validation, disabled, onChange }: {
  rows: readonly PaymentPlanRow[];
  validation: ReturnType<typeof usePaymentPlanValidation>;
  disabled: boolean;
  onChange: (rows: PaymentPlanRow[]) => void;
}) {
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  const { fieldId, totalId, totalError, fieldErrors, formattedTotal } = validation;

  function change(key: number, field: PaymentPlanField, value: string) {
    onChange(rows.map((row) => row.key === key ? { ...row, [field]: value } : row));
  }

  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-4">
      <legend className="mb-3 text-xl font-semibold">{t("paymentPlan.title")}</legend>
      {rows.map((row, index) => {
        const label = t("paymentPlan.row", { number: formatNumber(index + 1, locale) });
        const nameId = fieldId(row.key, "installmentName");
        // Preserve custom names from plans saved before the dropdown was introduced.
        const savedName = row.installmentName && !installmentNames.some(({ value }) => value === row.installmentName);
        return (
          <fieldset key={row.key} className="grid min-w-0 gap-4 rounded-ui border border-accent/50 p-4">
            <legend className="px-1 font-medium">{label}</legend>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Select
                id={nameId}
                label={t("paymentPlan.installmentName")}
                error={fieldErrors.get(nameId)}
                value={row.installmentName}
                required
                onChange={(event) => change(row.key, "installmentName", event.target.value)}
              >
                <option value="" disabled>{t("paymentPlan.chooseName")}</option>
                {savedName && <option value={row.installmentName} dir="auto">{row.installmentName}</option>}
                {installmentNames.map(({ value, label }) => (
                  <option key={value} value={value}>{t(`paymentPlan.names.${label}`)}</option>
                ))}
              </Select>
              {fields.map(({ name, ...input }) => {
                const id = fieldId(row.key, name);
                return (
                  <Input
                    key={name}
                    id={id}
                    label={t(`paymentPlan.${name}`)}
                    error={fieldErrors.get(id)}
                    value={row[name]}
                    required
                    {...input}
                    onChange={(event) => change(row.key, name, event.target.value)}
                  />
                );
              })}
            </div>
            <div>
              <Button type="button" variant="secondary" aria-label={t("paymentPlan.removeRow", { row: label })}
                onClick={() => onChange(rows.filter((item) => item.key !== row.key))}>
                {t("paymentPlan.remove")}
              </Button>
            </div>
          </fieldset>
        );
      })}
      <div>
        <Button type="button" variant="secondary" onClick={() => onChange(appendPaymentPlanRow(rows))}>{t("paymentPlan.add")}</Button>
      </div>
      <div id={totalId} tabIndex={-1} className="grid gap-1">
        <p role="status" className="font-medium">{t("paymentPlan.total", { total: formattedTotal })}</p>
        {totalError && <p className="text-sm text-error">{totalError}</p>}
      </div>
    </fieldset>
  );
}
