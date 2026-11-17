import type { TimePlanDraft } from "./types";
import { validPlanningDate } from "../Shared/dates";

export function validatePlan(values: TimePlanDraft): (keyof TimePlanDraft)[] {
  const errors: (keyof TimePlanDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validPlanningDate(values.deliveryDate)) errors.push("deliveryDate");
  return errors;
}
