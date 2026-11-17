import { createContext, useContext } from "react";
import type { useStaffResource } from "../../../Hooks/useStaffResource";
import type { ActivityLogDto, PaginationResult } from "../../../Types/contracts";
import type { AuditFilters } from "./types";

export interface AuditSnapshot {
  page: PaginationResult<ActivityLogDto>;
  detail: ActivityLogDto | null;
}
export interface ActivityLogsValue extends Pick<ReturnType<typeof useStaffResource<AuditSnapshot>>, "read"> {
  page: number;
  setPage: (page: number) => void;
  apply: (filters: AuditFilters) => void;
}
export const ActivityLogsContext = createContext<ActivityLogsValue | null>(null);

export function useActivityLogs() {
  const value = useContext(ActivityLogsContext);
  if (!value) {
    throw new Error("Activity logs provider required.");
  }
  return value;
}
