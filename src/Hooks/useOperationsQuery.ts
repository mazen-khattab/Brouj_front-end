import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { OperationsKind, OperationsQuery } from "../AdminOperations/policy";
import { readOperationsQuery, writeOperationsQuery } from "../AdminOperations/policy";

export function useOperationsQuery(kind: OperationsKind, list: boolean) {
  const [params, setParams] = useSearchParams();
  const query = readOperationsQuery(params, kind);
  const canonical = writeOperationsQuery(query, kind).toString();
  const [search, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    if (list && params.toString() !== canonical) {
      setParams(canonical, { replace: true, preventScrollReset: true });
    }
  }, [list, params, canonical, setParams]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function update(changes: Partial<OperationsQuery>) {
    const next = writeOperationsQuery({ ...query, pageNumber: changes.pageNumber ?? 1, ...changes }, kind);
    // Typing while already on page one must not fill history with copies of the same URL.
    if (next.toString() !== canonical) {
      setParams(next, { preventScrollReset: true });
    }
  }

  return {
    ...query,
    key: canonical,
    search,
    debouncedSearch,
    update,
    setSearch: (value: string) => {
      setSearchValue(value.slice(0, 100));
      update({ pageNumber: 1 });
    },
  };
}
