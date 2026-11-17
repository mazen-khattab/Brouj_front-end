import type { UnitDto, UnitInput } from "../../Types/contracts";
import type { UnitDraft } from "./types";

export function draftFrom(data?: UnitDto): UnitDraft {
  return {
    projectId: data?.projectId == null ? "" : String(data.projectId),
    number: data?.number == null ? "" : String(data.number),
    meterPrice: data?.meterPrice == null ? "" : String(data.meterPrice),
    floorNumber: data?.floorNumber == null ? "" : String(data.floorNumber),
    size: data?.size == null ? "" : String(data.size),
    neighborMeterPrice: data?.neighborMeterPrice == null ? "" : String(data.neighborMeterPrice),
  };
}

function optionalNumber(value: string | undefined) {
  return value?.trim() ? Number(value) : null;
}

export function unitInput(d: UnitDraft): UnitInput {
  return {
    number: d.number,
    meterPrice: Number(d.meterPrice),
    floorNumber: Number(d.floorNumber),
    size: Number(d.size),
    neighborMeterPrice: optionalNumber(d.neighborMeterPrice),
  };
}
