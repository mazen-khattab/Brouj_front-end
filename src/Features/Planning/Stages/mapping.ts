import { ApiError } from "../../../Types/failures";
import type { StageDraftInput, StageTemplateDto, TimePlanInput, TimePlanStageInput, TimePlanStageDto } from "../../../Types/contracts";
import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";

export function stageFrom(source?: TimePlanStageDto): TimePlanStageDraft {
  return { name: source?.name ?? "", deliveryDate: source?.deliveryDate ?? "", percentage: source ? String(source.percentage) : "" };
}

export function stageInput(values: TimePlanStageDraft): TimePlanStageInput {
  return { name: values.name, deliveryDate: values.deliveryDate || null, percentage: Number(values.percentage) };
}

/** The current update contract intentionally excludes percentage. */
export function stageUpdateInput(values: TimePlanStageDraft): TimePlanInput {
  return { name: values.name, deliveryDate: values.deliveryDate || null };
}

export function approvedStageUpdate(input: TimePlanInput): TimePlanInput {
  return { name: input.name, deliveryDate: input.deliveryDate };
}

export function approvedStageDraft(input: StageDraftInput): StageDraftInput {
  return {
    stageTemplateId: input.stageTemplateId, name: input.name, deliveryDate: input.deliveryDate, percentage: input.percentage,
    items: input.items.map(row => ({ itemTemplateId: row.itemTemplateId, name: row.name, dueDate: row.dueDate, confirmedDate: row.confirmedDate })),
  };
}

export function stageFromTemplateInput(
  source: StageTemplateDto,
  values: TimePlanStageDraft,
  rows: readonly TemplateApplicationItemDraft[],
): StageDraftInput {
  if (
    !source.isActive ||
    source.items.some((item) => !item.isActive) ||
    source.items.length !== rows.length ||
    new Set(rows.map((row) => row.itemTemplateId)).size !== rows.length ||
    rows.some((row) => !source.items.some((item) => item.itemTemplateId === row.itemTemplateId))
  ) {
    throw new ApiError("transport", { status: 409 });
  }
  return {
    ...stageInput(values),
    stageTemplateId: source.id,
    name: source.name,
    items: rows.map((row) => ({
      itemTemplateId: row.itemTemplateId,
      name: source.items.find((item) => item.itemTemplateId === row.itemTemplateId)!.name,
      dueDate: row.dueDate || null,
      confirmedDate: row.confirmedDate || null,
    })),
  };
}
