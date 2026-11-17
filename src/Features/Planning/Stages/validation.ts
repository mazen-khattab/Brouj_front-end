import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";
import { validDateTime } from "../../../Validation/dateTime";

export function validateStage(values: TimePlanStageDraft, mode: "create" | "edit"): (keyof TimePlanStageDraft)[] {
  const errors: (keyof TimePlanStageDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validDateTime(values.deliveryDate)) errors.push("deliveryDate");
  if (mode === "create" && (!values.percentage.trim() || !Number.isFinite(Number(values.percentage)) || Number(values.percentage) < 0 || Number(values.percentage) > 100)) errors.push("percentage");
  return errors;
}

export function validateTemplateItemDates(rows: readonly TemplateApplicationItemDraft[]): string[] {
  return rows.flatMap((row, index) => [
    ...(!validDateTime(row.dueDate) ? [`template-due-${index}`] : []),
    ...(row.confirmedDate && !validDateTime(row.confirmedDate) ? [`template-confirmed-${index}`] : []),
  ]);
}
