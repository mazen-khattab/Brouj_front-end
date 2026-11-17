import type { TimePlanDto, TimePlanInput } from "../../../Types/contracts";
import type { TimePlanDraft } from "./types";

export function planFrom(source?: Pick<TimePlanDto, "name" | "deliveryDate"> | null): TimePlanDraft {
  return { name: source?.name ?? "", deliveryDate: source?.deliveryDate ?? "" };
}

export function planInput(values: TimePlanDraft): TimePlanInput {
  return { name: values.name, deliveryDate: values.deliveryDate || null };
}

export function approvedPlan(input: TimePlanInput): TimePlanInput {
  return { name: input.name, deliveryDate: input.deliveryDate };
}
