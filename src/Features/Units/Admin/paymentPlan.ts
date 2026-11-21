import type { UnitPaymentInstallmentDto, UnitPaymentInstallmentInput } from "../../../Types/contracts";

export type PaymentPlanField = keyof UnitPaymentInstallmentInput;
export type PaymentPlanRow = Record<PaymentPlanField, string> & { key: number };
type RowIssue = "invalidName" | "invalidNumber" | "duplicateNumber" | "invalidPercentage" | "invalidMonths";

const maxInteger = 2147483647;
const percentageScale = 10000;
const targetTotal = 100 * percentageScale;

export function paymentPlanRow(key: number, number: number): PaymentPlanRow {
  return { key, installmentName: "", installmentNumber: String(number), installmentPercentage: "", installmentPeriodMonths: "0" };
}

export function paymentPlanDraft(plan?: ReadonlyArray<UnitPaymentInstallmentDto>): PaymentPlanRow[] {
  return plan?.length
    ? plan.map((row, key) => ({
        key,
        installmentName: row.installmentName,
        installmentNumber: String(row.installmentNumber),
        installmentPercentage: String(row.installmentPercentage),
        installmentPeriodMonths: String(row.installmentPeriodMonths),
      }))
    : [paymentPlanRow(0, 1)];
}

function numericText(value: string) {
  return value.trim()
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replaceAll("٫", ".");
}

function integer(value: string, minimum: number) {
  const text = numericText(value);
  if (!/^\+?\d+$/.test(text)) return undefined;
  const number = Number(text);
  return number >= minimum && number <= maxInteger ? number : undefined;
}

export function appendPaymentPlanRow(rows: readonly PaymentPlanRow[]) {
  const key = rows.reduce((highest, row) => Math.max(highest, row.key), -1) + 1;
  const numbers = new Set(rows.map((row) => integer(row.installmentNumber, 1)));
  let number = rows.length + 1;
  while (numbers.has(number)) number += 1;
  return [...rows, paymentPlanRow(key, number)];
}

function scaledPercentage(value: string) {
  const match = /^\+?(\d+(?:\.\d*)?|\.\d+)$/.exec(numericText(value));
  if (!match) return undefined;
  const [whole, fraction = ""] = match[1]!.split(".");
  const significantFraction = fraction.replace(/0+$/, "");
  if (significantFraction.length > 4) return undefined;
  const scaled = Number(whole) * percentageScale + Number(significantFraction.padEnd(4, "0"));
  return scaled > 0 && scaled <= targetTotal ? scaled : undefined;
}

export function validatePaymentPlan(rows: readonly PaymentPlanRow[]) {
  const numbers = new Set<number>();
  const issues: { key: number; field: PaymentPlanField; reason: RowIssue }[] = [];
  const installments: UnitPaymentInstallmentInput[] = [];
  let total = 0;

  for (const row of rows) {
    const name = row.installmentName.trim();
    const number = integer(row.installmentNumber, 1);
    const percentage = scaledPercentage(row.installmentPercentage);
    const months = integer(row.installmentPeriodMonths, 0);
    if (!name || name.length > 100) issues.push({ key: row.key, field: "installmentName", reason: "invalidName" });
    if (number === undefined) issues.push({ key: row.key, field: "installmentNumber", reason: "invalidNumber" });
    else if (numbers.has(number)) issues.push({ key: row.key, field: "installmentNumber", reason: "duplicateNumber" });
    else numbers.add(number);
    if (percentage === undefined) issues.push({ key: row.key, field: "installmentPercentage", reason: "invalidPercentage" });
    else total += percentage;
    if (months === undefined) issues.push({ key: row.key, field: "installmentPeriodMonths", reason: "invalidMonths" });

    if (number !== undefined && percentage !== undefined && months !== undefined) {
      installments.push({
        installmentName: name,
        installmentNumber: number,
        installmentPercentage: percentage / percentageScale,
        installmentPeriodMonths: months,
      });
    }
  }

  const planIssue = !rows.length ? "empty" : total !== targetTotal ? "invalidTotal" : undefined;
  return {
    total: total / percentageScale,
    issues,
    planIssue,
    paymentPlan: issues.length || planIssue ? undefined : installments,
  } as const;
}
