import { toDateTimeLocalValue, toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";
import { ApiError } from "../../../Types/failures";
import { TimePlanStageStatus, type StageDraftInput, type StageTemplateDto, type StageUpdateInput, type TemplateStageDraftInput, type TimePlanStageDto } from "../../../Types/contracts";
import type { TimePlanStageDraft, TemplateApplicationItemDraft } from "./types";

export function stageFrom(source?: TimePlanStageDto): TimePlanStageDraft {
  return {
    name: source?.name ?? "",
    deliveryDate: toDateTimeLocalValue(source?.deliveryDate),
    price: source?.pricingDate == null ? "" : String(source.price),
    pricingDate: toDateTimeLocalValue(source?.pricingDate),
    status: String(source?.status ?? TimePlanStageStatus.Pending),
  };
}

function stagePricingInput(values: TimePlanStageDraft): Pick<StageUpdateInput, "price" | "pricingDate"> {
  const pricingDate = toDateTimeOffsetIso(values.pricingDate);
  return values.price.trim() && pricingDate ? { price: Number(values.price), pricingDate } : {};
}

export function stageUpdateInput(values: TimePlanStageDraft): StageUpdateInput {
  return {
    name: values.name,
    deliveryDate: toDateTimeOffsetIso(values.deliveryDate),
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
    deliveryDate: toDateTimeOffsetIso(values.deliveryDate),
    stageTemplateId: source.id,
    name: source.name,
    items: rows.map((row) => ({
      itemTemplateId: row.itemTemplateId,
      name: source.items.find((item) => item.itemTemplateId === row.itemTemplateId)!.name,
      dueDate: toDateTimeOffsetIso(row.dueDate),
      confirmedDate: toDateTimeOffsetIso(row.confirmedDate),
    })),
  };
}
