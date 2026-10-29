import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ActivityLogsContext } from "./ActivityLogsContext";
import { useGovernanceResource } from "../Hooks/useGovernanceResource";
import * as logs from "../Services/ActivityLogs";
import type { ActivityAction } from "../Types/contracts";
import type { GovernanceFields } from "../Governance/policy";
import { auditRows } from "../Governance/policy";
import { isGuid } from "../Catalogue/query";
import { ApiError } from "../Types/failures";

export function ActivityLogsProvider({ scope, id, children }: { scope: string; id?: string | undefined; children: ReactNode }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<GovernanceFields>({});
  const load = useCallback(async (signal: AbortSignal) => {
    if (id && !isGuid(id)) {
      throw new ApiError("transport", { status: 404 });
    }
    const result = await logs.getActivityLogs({ query: {
      pageNumber: page, pageSize: 20, userId: filters.userId || null, entityType: filters.entityType || null,
      action: filters.action ? Number(filters.action) as ActivityAction : null,
      dateFrom: filters.dateFrom || null, dateTo: filters.dateTo || null,
    } }, { signal });
    if (!signal.aborted && page > Math.max(1, result.totalPages)) {
      setPage(Math.max(1, result.totalPages));
    }
    const detail = id ? await logs.getActivityLogById({ id }, { signal }) : null;
    if (id && (!detail || detail.id !== id)) {
      throw new ApiError("transport", { status: 200 });
    }
    return { page: { ...result, items: auditRows(result.items) }, detail };
  }, [page, id, filters]);
  const { read } = useGovernanceResource(`${scope}:${page}:${JSON.stringify(filters)}`, load);
  return <ActivityLogsContext value={{ read, page, setPage, apply: (next) => { setFilters(next); setPage(1); } }}>{children}</ActivityLogsContext>;
}
