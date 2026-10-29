import { createContext, useContext } from "react";
import type { useGovernanceResource } from "../Hooks/useGovernanceResource";
import type { ActivityLogDto, PaginationResult } from "../Types/contracts";
import type { GovernanceFields } from "../Governance/policy";

export interface AuditSnapshot { page: PaginationResult<ActivityLogDto>; detail: ActivityLogDto | null }
export interface ActivityLogsValue extends Pick<ReturnType<typeof useGovernanceResource<AuditSnapshot>>, "read"> {
  page: number;
  setPage: (page: number) => void;
  apply: (filters: GovernanceFields) => void;
}
export const ActivityLogsContext = createContext<ActivityLogsValue | null>(null);

export function useActivityLogs() {
  const value = useContext(ActivityLogsContext);
  if (!value) {
    throw new Error("Activity logs provider required.");
  }
  return value;
}
