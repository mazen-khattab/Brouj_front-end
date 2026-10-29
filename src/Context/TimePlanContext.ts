import { createContext, useContext } from "react";
import type { ProjectDto, TimePlanDto } from "../Types/contracts";
import type { StaffRead } from "../Hooks/useStaffRead";
import type { StaffOperation } from "../Hooks/useStaffOperation";
import type { PlanCommand } from "../Planning/commands";

export interface PlanSnapshot {
  project: ProjectDto;
  plan: TimePlanDto | null;
}
export interface TimePlanValue {
  scope: string;
  read: StaffRead<PlanSnapshot>;
  snapshot: PlanSnapshot | undefined;
  action: StaffOperation;
  lastAction: string;
  run: (label: string, command: PlanCommand) => Promise<string | undefined>;
}
export const TimePlanContext = createContext<TimePlanValue | null>(null);

export function useTimePlan() {
  const value = useContext(TimePlanContext);
  if (!value) {
    throw new Error("Time plan provider required.");
  }
  return value;
}
