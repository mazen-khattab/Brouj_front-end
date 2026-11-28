import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { isGuid } from "../../../Services/identifiers";
import { getProjects } from "../../../Services/Projects";
import { ApiError } from "../../../Types/failures";
import type { ListData } from "./ListContext";
import { ListContext } from "./ListContext";
import type { Query } from "./query";
import { readQuery, writeQuery } from "./query";
import { queryForType, typeFilterKey, type TypeFilterMemory } from "./typeFilters";

export function ListProvider({ scopeId, children, rememberTypes = false }: { scopeId?: string | undefined; children: ReactNode; rememberTypes?: boolean }) {
  const typeMemory = useRef<TypeFilterMemory>({});
  const [search, setSearch] = useSearchParams();
  const raw = search.toString();
  const params = useMemo(() => {
    const parsed = readQuery(new URLSearchParams(raw));
    return parsed;
  }, [raw]);
  const canonical = writeQuery(params).toString();
  useEffect(() => {
    if (rememberTypes) typeMemory.current[typeFilterKey(params.projectType)] = params;
  }, [params, rememberTypes]);
  useEffect(() => {
    if (raw !== canonical) setSearch(canonical, { replace: true, preventScrollReset: true });
  }, [raw, canonical, setSearch]);
  const load = useCallback(
    async (signal: AbortSignal): Promise<ListData> => {
      if (scopeId && !isGuid(scopeId)) throw new ApiError("transport", { status: 404 });
      return { page: await getProjects({ query: { ...params, ...(scopeId ? { areaId: scopeId } : {}) } }, { signal }) };
    },
    [params, scopeId],
  );
  const { result, reload } = useResourceRead(`projects:${scopeId ?? ""}:${canonical}`, load);
  usePublicContentInvalidation(reload);
  useEffect(() => {
    if (result.status !== "success") return;
    const last = Math.max(1, result.data.page.totalPages);
    if (params.pageNumber > last) setSearch(writeQuery({ ...params, pageNumber: last }), { replace: true, preventScrollReset: true });
  }, [result, params, setSearch]);
  const update = useCallback(
    (changes: Partial<Query>, replace = false) => {
      if (rememberTypes && "projectType" in changes && typeFilterKey(changes.projectType) !== typeFilterKey(params.projectType)) {
        typeMemory.current[typeFilterKey(params.projectType)] = params;
        setSearch(writeQuery({ ...queryForType(changes.projectType, typeMemory.current), ...changes }), { replace, preventScrollReset: true });
        return;
      }
      const next = { ...params, ...changes, pageNumber: changes.pageNumber ?? 1 };
      // A new city starts a new area selection; it must not retain a stale area's constraint.
      if ("cityId" in changes && !("areaId" in changes)) delete next.areaId;
      setSearch(writeQuery(next), { replace, preventScrollReset: true });
    },
    [params, setSearch, rememberTypes],
  );
  return <ListContext value={{ params, result, reload, update }}>{children}</ListContext>;
}
