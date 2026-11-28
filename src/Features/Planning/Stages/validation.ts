import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";
import { toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";

export function validateStage(values: TimePlanStageDraft, mode: "create" | "edit", isTemplateCopy = false): (keyof TimePlanStageDraft)[] {
  const errors: (keyof TimePlanStageDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!toDateTimeOffsetIso(values.deliveryDate)) errors.push("deliveryDate");

  if (isTemplateCopy) return errors;

  if (values.status !== "0" && values.status !== "1" && values.status !== "2") errors.push("status");
  const price = values.price.trim();
  const pricingDate = values.pricingDate.trim();
  if (mode === "create" || price || pricingDate) {
    const normalized = price.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    if (!/^\d{1,15}(?:\.\d{1,4})?$/.test(price) || String(Number(price)) !== normalized) errors.push("price");
    if (!toDateTimeOffsetIso(pricingDate)) errors.push("pricingDate");
  }

  return errors;
}

export function validateTemplateItemDates(rows: readonly TemplateApplicationItemDraft[]): string[] {
  return rows.flatMap((row, index) => [
    ...(!toDateTimeOffsetIso(row.dueDate) ? [`template-due-${index}`] : []),
    ...(row.confirmedDate && !toDateTimeOffsetIso(row.confirmedDate) ? [`template-confirmed-${index}`] : []),
  ]);
}
