import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import type { ListQuery as Query } from "../../../Router/listQuery";
import { readListQuery as readQuery, writeListQuery as writeQuery } from "../../../Router/listQuery";
import { getCities } from "../../../Services/Cities";
import type { ListData } from "./ListContext";
import { ListContext } from "./ListContext";

export function ListProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useSearchParams();
  const raw = search.toString();
  const params = useMemo(() => {
    const parsed = readQuery(new URLSearchParams(raw));
    return parsed;
  }, [raw]);
  const canonical = writeQuery(params).toString();
  useEffect(() => {
    if (raw !== canonical) setSearch(canonical, { replace: true, preventScrollReset: true });
  }, [raw, canonical, setSearch]);
  const load = useCallback(
    async (signal: AbortSignal): Promise<ListData> => {
      const paging = { pageNumber: params.pageNumber, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) };
      return { page: await getCities({ query: paging }, { signal }) };
    },
    [params],
  );
  const { result, reload } = useResourceRead(`cities:${canonical}`, load);
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
