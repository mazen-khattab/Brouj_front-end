import type { TimePlanDraft } from "./types";
import { validDateTime } from "../../../Validation/dateTime";

export function validatePlan(values: TimePlanDraft): (keyof TimePlanDraft)[] {
  const errors: (keyof TimePlanDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!validDateTime(values.deliveryDate)) errors.push("deliveryDate");
  return errors;
}
