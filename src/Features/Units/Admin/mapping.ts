import { ProjectType, type UnitDto, type UnitInput } from "../../../Types/contracts";
import { toDateTimeLocalValue, toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";
import type { SavedUnitPricing, UnitDraft } from "./types";
import { requiresPricingDate } from "./validation";

export function draftFrom(data?: UnitDto): UnitDraft {
  return {
    projectId: data?.projectId == null ? "" : String(data.projectId),
    number: data?.number == null ? "" : String(data.number),
    meterPrice: data?.meterPrice == null ? "" : String(data.meterPrice),
    floorNumber: data?.floorNumber == null ? "" : String(data.floorNumber),
    size: data?.size == null ? "" : String(data.size),
    excellencePercentage: data?.excellencePercentage == null ? "" : String(data.excellencePercentage),
    trend: data?.trend ?? "",
    neighborMeterPrice: data?.neighborMeterPrice == null ? "" : String(data.neighborMeterPrice),
    pricingDate: toDateTimeLocalValue(data?.pricingDate),
  };
}

function optionalNumber(value: string | undefined) {
  return value?.trim() ? Number(value) : null;
}

export function unitInput(d: UnitDraft, projectType: ProjectType, data?: SavedUnitPricing): UnitInput {
  const savedDate = data?.pricingDate ?? null;
  let pricingDate = null;
  if (projectType === ProjectType.Initiative) {
    if (d.pricingDate !== toDateTimeLocalValue(savedDate)) {
      pricingDate = toDateTimeOffsetIso(d.pricingDate);
    } else if (requiresPricingDate(d, data)) {
      // Reuse the exact timestamp when the picker still shows the saved minute.
      pricingDate = savedDate;
    }
  }

  return {
    number: d.number,
    meterPrice: Number(d.meterPrice),
    floorNumber: Number(d.floorNumber),
    size: Number(d.size),
    excellencePercentage: optionalNumber(d.excellencePercentage),
    trend: d.trend.trim(),
    neighborMeterPrice: optionalNumber(d.neighborMeterPrice),
    pricingDate,
  };
}
