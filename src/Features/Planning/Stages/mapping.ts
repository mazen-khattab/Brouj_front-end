import { ApiError } from "../../../Types/failures";
import { TimePlanStageStatus, type StageDraftInput, type StageTemplateDto, type StageUpdateInput, type TemplateStageDraftInput, type TimePlanStageDto } from "../../../Types/contracts";
import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";

export function stageFrom(source?: TimePlanStageDto): TimePlanStageDraft {
  return {
    name: source?.name ?? "",
    deliveryDate: source?.deliveryDate ?? "",
    price: source?.pricingDate == null ? "" : String(source.price),
    pricingDate: source?.pricingDate ?? "",
    status: String(source?.status ?? TimePlanStageStatus.Pending),
  };
}

function stagePricingInput(values: TimePlanStageDraft): Pick<StageUpdateInput, "price" | "pricingDate"> {
  return values.price.trim() && values.pricingDate.trim() ? { price: Number(values.price), pricingDate: values.pricingDate.trim() } : {};
}

export function stageUpdateInput(values: TimePlanStageDraft): StageUpdateInput {
  return {
    name: values.name,
    deliveryDate: values.deliveryDate || null,
    status: Number(values.status) as TimePlanStageStatus,
    ...stagePricingInput(values),
  };
}

export function approvedStageUpdate({ name, deliveryDate, price, pricingDate, status }: StageUpdateInput): StageUpdateInput {
  return {
    name,
    deliveryDate,
    ...(status !== undefined && { status }),
    ...(price !== undefined && { price }),
    ...(pricingDate !== undefined && { pricingDate }),
  };
}

export function approvedStageDraft(input: StageDraftInput): StageDraftInput {
  return {
    stageTemplateId: input.stageTemplateId,
    ...approvedStageUpdate(input),
    items: input.items.map((row) => ({
      itemTemplateId: row.itemTemplateId,
      name: row.name,
      dueDate: row.dueDate,
      confirmedDate: row.confirmedDate,
    })),
  };
}

export function stageFromTemplateInput(
  source: StageTemplateDto,
  values: TimePlanStageDraft,
  rows: readonly TemplateApplicationItemDraft[],
): TemplateStageDraftInput {
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
    deliveryDate: values.deliveryDate || null,
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
