import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";
import { validPlanningDate } from "../Shared/dates";

export function validateStage(values: TimePlanStageDraft, mode: "create" | "edit"): (keyof TimePlanStageDraft)[] {
  const errors: (keyof TimePlanStageDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validPlanningDate(values.deliveryDate)) errors.push("deliveryDate");
  if (mode === "create" && (!values.percentage.trim() || !Number.isFinite(Number(values.percentage)) || Number(values.percentage) < 0 || Number(values.percentage) > 100)) errors.push("percentage");
  return errors;
}

export function validateTemplateItemDates(rows: readonly TemplateApplicationItemDraft[]): string[] {
  return rows.flatMap((row, index) => [
    ...(!validPlanningDate(row.dueDate) ? [`template-due-${index}`] : []),
    ...(row.confirmedDate && !validPlanningDate(row.confirmedDate) ? [`template-confirmed-${index}`] : []),
  ]);
}
