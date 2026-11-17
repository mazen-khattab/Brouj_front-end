import type { ProjectDto } from "../../Types/contracts";

export type ProjectRecord = ProjectDto;
export interface ProjectDraft {
  name: string;
  areaId: string;
  description: string;
  latitude: string;
  longitude: string;
  size: string;
  projectType: string;
  price: string;
  floorCount: string;
  plannedUnitCount: string;
  neighborPrice: string;
  drawDate: string;
}
