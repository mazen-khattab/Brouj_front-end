import type { TimePlanDraft } from "./types";
import { toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";

export function validatePlan(values: TimePlanDraft): (keyof TimePlanDraft)[] {
  const errors: (keyof TimePlanDraft)[] = [];
  if (!values.name.trim() || values.name.length > 100) errors.push("name");
  if (!toDateTimeOffsetIso(values.deliveryDate)) errors.push("deliveryDate");
  return errors;
}
