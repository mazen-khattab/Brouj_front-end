import type { ProjectDto, ProjectInput } from "../../../Types/contracts";
import type { ProjectDraft } from "./types";

export function draftFrom(data?: ProjectDto): ProjectDraft {
  return {
    name: data?.name == null ? "" : String(data.name),
    areaId: data?.areaId == null ? "" : String(data.areaId),
    description: data?.description == null ? "" : String(data.description),
    latitude: data?.latitude == null ? "" : String(data.latitude),
    longitude: data?.longitude == null ? "" : String(data.longitude),
    size: data?.size == null ? "" : String(data.size),
    projectType: data?.projectType == null ? "0" : String(data.projectType),
    price: data?.price == null ? "" : String(data.price),
    floorCount: data?.floorCount == null ? "" : String(data.floorCount),
    plannedUnitCount: data?.plannedUnitCount == null ? "" : String(data.plannedUnitCount),
    neighborPrice: data?.neighborPrice == null ? "" : String(data.neighborPrice),
    drawDate: data?.drawDate == null ? "" : String(data.drawDate),
  };
}

function optionalNumber(value: string | undefined) {
  return value?.trim() ? Number(value) : null;
}

export function projectInput(d: ProjectDraft): ProjectInput {
  return {
    name: d.name,
    areaId: d.areaId,
    description: d.description || null,
    latitude: optionalNumber(d.latitude),
    longitude: optionalNumber(d.longitude),
    size: Number(d.size),
    projectType: Number(d.projectType) as 0 | 1,
    price: Number(d.price),
    floorCount: Number(d.floorCount),
    plannedUnitCount: Number(d.plannedUnitCount),
    neighborPrice: optionalNumber(d.neighborPrice),
    drawDate: d.drawDate || null,
  };
}
