import { expect, test } from "vitest";
import { appendPaymentPlanRow, paymentPlanDraft, paymentPlanRow, validatePaymentPlan } from "../../src/Features/Units/Admin/paymentPlan";

const row = (key: number, percentage: string, number = String(key + 1), months = "0") => ({
  ...paymentPlanRow(key, key + 1),
  installmentName: "  دفعة A  ",
  installmentNumber: number,
  installmentPercentage: percentage,
  installmentPeriodMonths: months,
});

test("accepts exact fractional totals, Arabic decimal input, names, gaps and explicit zero months", () => {
  const result = validatePaymentPlan([row(0, "٣٣٫٣٣٣٣", "١", "٠"), row(1, "66.666700", "۳")]);
  expect(result).toEqual({
    issues: [],
    planIssue: undefined,
    total: 100,
    paymentPlan: [
      { installmentName: "دفعة A", installmentNumber: 1, installmentPercentage: 33.3333, installmentPeriodMonths: 0 },
      { installmentName: "دفعة A", installmentNumber: 3, installmentPercentage: 66.6667, installmentPeriodMonths: 0 },
    ],
  });
});

test.each([95, 105])("reports the entered total of %i and rejects the plan", (total) => {
  expect(validatePaymentPlan([row(0, "50"), row(1, String(total - 50))])).toMatchObject({
    total, planIssue: "invalidTotal", paymentPlan: undefined,
  });
});

test("rejects normalized duplicate numbers, excessive precision and missing months", () => {
  const result = validatePaymentPlan([row(0, "33.33331", "01", ""), row(1, "66.6667", "١")]);
  expect(result.issues).toEqual([
    { key: 0, field: "installmentPercentage", reason: "invalidPercentage" },
    { key: 0, field: "installmentPeriodMonths", reason: "invalidMonths" },
    { key: 1, field: "installmentNumber", reason: "duplicateNumber" },
  ]);
  expect(result.paymentPlan).toBeUndefined();
});

test("enforces bounds and keeps default and empty drafts distinct", () => {
  expect(paymentPlanDraft()).toEqual([paymentPlanRow(0, 1)]);
  expect(validatePaymentPlan([]).planIssue).toBe("empty");
  expect(validatePaymentPlan([row(0, "100", "2147483647", "2147483647")]).paymentPlan).toHaveLength(1);
  expect(validatePaymentPlan([row(0, "100.0001", "2147483648", "-1")]).issues.map(({ reason }) => reason)).toEqual([
    "invalidNumber", "invalidPercentage", "invalidMonths",
  ]);
  expect(validatePaymentPlan([row(0, "1e2")]).paymentPlan).toBeUndefined();
  expect(validatePaymentPlan([row(0, "100", "1.0")]).paymentPlan).toBeUndefined();
});

test("new rows use a separate identity and avoid numbers already entered in Arabic", () => {
  const existing = row(3, "100", "٢");
  expect(appendPaymentPlanRow([existing])).toEqual([existing, paymentPlanRow(4, 3)]);
});
