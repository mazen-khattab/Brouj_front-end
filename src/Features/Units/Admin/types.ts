import type { UnitDto, ProjectDto } from "../../../Types/contracts";

export type UnitRecord = UnitDto;
export type SavedUnitPricing = Pick<UnitRecord, "meterPrice" | "pricingDate">;
export type UnitProject = Pick<ProjectDto, "id" | "name" | "projectType" | "price">;
export interface UnitDraft {
  projectId: string;
  number: string;
  meterPrice: string;
  floorNumber: string;
  size: string;
  excellencePercentage: string;
  trend: string;
  neighborMeterPrice: string;
  pricingDate: string;
}
