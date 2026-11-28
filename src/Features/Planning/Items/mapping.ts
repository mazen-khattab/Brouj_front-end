import { toDateTimeLocalValue, toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";
import type { PlanStageItemDto, PlanStageItemInput, ChangePlanStageItemStatusRequest, PlanStageItemStatus } from "../../../Types/contracts";
import type { TimePlanItemDraft, TimePlanItemStatusDraft, ItemImageDescriptionDraft } from "./types";

export function itemFrom(source?: PlanStageItemDto): TimePlanItemDraft {
  return { name: source?.name ?? "", dueDate: toDateTimeLocalValue(source?.dueDate), confirmedDate: toDateTimeLocalValue(source?.confirmedDate) };
}

export function itemStatusFrom(source: PlanStageItemDto): TimePlanItemStatusDraft {
  return { status: String(source.status), confirmedDate: toDateTimeLocalValue(source.confirmedDate) };
}

export function itemInput(values: TimePlanItemDraft): PlanStageItemInput {
  return { name: values.name, dueDate: toDateTimeOffsetIso(values.dueDate), confirmedDate: toDateTimeOffsetIso(values.confirmedDate) };
}

export function itemStatusInput(values: TimePlanItemStatusDraft): ChangePlanStageItemStatusRequest {
  return { status: Number(values.status) as PlanStageItemStatus, confirmedDate: toDateTimeOffsetIso(values.confirmedDate) };
}

export function imageDescriptionInput(values: ItemImageDescriptionDraft) {
  return { description: values.description || null };
}

export function approvedItem(input: PlanStageItemInput): PlanStageItemInput {
  return { name: input.name, dueDate: input.dueDate, confirmedDate: input.confirmedDate };
}
