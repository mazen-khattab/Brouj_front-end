import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useCustomersQuery(list: boolean) {
  const [params, setParams] = useSearchParams();
  const query = readCustomersQuery(params);
  const canonical = writeCustomersQuery(query).toString();
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

  function update(changes: Partial<CustomersQuery>) {
    const next = writeCustomersQuery({ ...query, pageNumber: changes.pageNumber ?? 1, ...changes });
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

interface CustomersQuery {
  pageNumber: number;
  pageSize: number;
  isDeleted: boolean | null;
}

export function readCustomersQuery(params: URLSearchParams): CustomersQuery {
  function positive(key: string, fallback: number, max: number) {
    const raw = params.get(key) ?? "";
    const value = Number(raw);
    return /^\d+$/.test(raw) && value > 0 && value <= max ? value : fallback;
  }
  return {
    pageNumber: positive("pageNumber", 1, 2147483647),
    pageSize: positive("pageSize", 20, 100),
    isDeleted: ["true", "false"].includes(params.get("isDeleted") ?? "") ? params.get("isDeleted") === "true" : null,
  };
}

/** Customer search stays in memory instead of adding personal search text to SPA history. */
export function writeCustomersQuery(query: CustomersQuery) {
  const params = new URLSearchParams();
  if (query.pageNumber !== 1) {
    params.set("pageNumber", String(query.pageNumber));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.isDeleted !== null) {
    params.set("isDeleted", String(query.isDeleted));
  }
  return params;
}
