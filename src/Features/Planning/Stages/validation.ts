import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";
import { validDateTime } from "../../../Validation/dateTime";

export function validateStage(values: TimePlanStageDraft, _mode?: "create" | "edit", showPricing = true): (keyof TimePlanStageDraft)[] {
  const errors: (keyof TimePlanStageDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validDateTime(values.deliveryDate)) errors.push("deliveryDate");

  if (showPricing) {
    const price = values.price.trim();
    const normalized = price
      .replace(/^0+(?=\d)/, "")
      .replace(/(\.\d*?)0+$/, "$1")
      .replace(/\.$/, "");
    if (!price || !/^\d{1,15}(?:\.\d{1,4})?$/.test(price) || String(Number(price)) !== normalized) {
      errors.push("price");
    }

    const pricingDate = values.pricingDate.trim();
    if (!pricingDate || !validDateTime(pricingDate)) {
      errors.push("pricingDate");
    }
  }

  return errors;
}

export function validateTemplateItemDates(rows: readonly TemplateApplicationItemDraft[]): string[] {
  return rows.flatMap((row, index) => [
    ...(!validDateTime(row.dueDate) ? [`template-due-${index}`] : []),
    ...(row.confirmedDate && !validDateTime(row.confirmedDate) ? [`template-confirmed-${index}`] : []),
  ]);
}
