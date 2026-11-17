import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { getAreas, getAreasByCity } from "../../../Services/Areas";
import { isGuid } from "../../../Services/identifiers";
import { ApiError } from "../../../Types/failures";
import type { ListData } from "./ListContext";
import { ListContext } from "./ListContext";
import type { Query } from "./query";
import { readQuery, writeQuery } from "./query";

export function ListProvider({ scopeId, children }: { scopeId?: string | undefined; children: ReactNode }) {
  const [search, setSearch] = useSearchParams();
  const raw = search.toString();
  const params = useMemo(() => {
    const parsed = readQuery(new URLSearchParams(raw));
    if (scopeId && !parsed.cityId) {
      return { ...parsed, cityId: scopeId };
    }
    return parsed;
  }, [raw, scopeId]);
  const canonical = writeQuery(params).toString();
  useEffect(() => {
    if (raw !== canonical) setSearch(canonical, { replace: true, preventScrollReset: true });
  }, [raw, canonical, setSearch]);
  const load = useCallback(
    async (signal: AbortSignal): Promise<ListData> => {
      if (scopeId && !isGuid(scopeId)) throw new ApiError("transport", { status: 404 });
      const paging = { pageNumber: params.pageNumber, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) };
      const activeCityId = params.cityId ?? scopeId;
      if (activeCityId && !isGuid(activeCityId)) throw new ApiError("transport", { status: 404 });
      return {
        page: activeCityId
          ? await getAreasByCity({ cityId: activeCityId, query: paging }, { signal })
          : await getAreas({ query: paging }, { signal }),
      };
    },
    [params, scopeId],
  );
  const { result, reload } = useResourceRead(`areas:${scopeId ?? ""}:${canonical}`, load);
  usePublicContentInvalidation(reload);
  useEffect(() => {
    if (result.status !== "success") return;
    const last = Math.max(1, result.data.page.totalPages);
    if (params.pageNumber > last) setSearch(writeQuery({ ...params, pageNumber: last }), { replace: true, preventScrollReset: true });
  }, [result, params, setSearch]);
  const update = useCallback(
    (changes: Partial<Query>, replace = false) => {
      const next = { ...params, ...changes, pageNumber: changes.pageNumber ?? 1 };
      setSearch(writeQuery(next), { replace, preventScrollReset: true });
    },
    [params, setSearch],
  );
  return <ListContext value={{ params, result, reload, update }}>{children}</ListContext>;
}
