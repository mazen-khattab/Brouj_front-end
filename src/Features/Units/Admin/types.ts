import type { UnitDto, ProjectDto } from "../../../Types/contracts";

export type UnitRecord = UnitDto;
export type UnitProject = Pick<ProjectDto, "id" | "name" | "projectType" | "price">;
export interface UnitDraft {
  projectId: string;
  number: string;
  meterPrice: string;
  floorNumber: string;
  size: string;
  neighborMeterPrice: string;
}
