import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useOrdersQuery(list: boolean) {
  const [params, setParams] = useSearchParams();
  const query = readOrdersQuery(params);
  const canonical = writeOrdersQuery(query).toString();
  useEffect(() => {
    if (list && params.toString() !== canonical) {
      setParams(canonical, { replace: true, preventScrollReset: true });
    }
  }, [list, params, canonical, setParams]);

  function update(changes: Partial<OrdersQuery>) {
    const next = writeOrdersQuery({ ...query, pageNumber: changes.pageNumber ?? 1, ...changes });
    // Typing while already on page one must not fill history with copies of the same URL.
    if (next.toString() !== canonical) {
      setParams(next, { preventScrollReset: true });
    }
  }

  return {
    ...query,
    key: canonical,
    update,
  };
}

interface OrdersQuery {
  pageNumber: number;
  pageSize: number;
  status: number | null;
}

export function readOrdersQuery(params: URLSearchParams): OrdersQuery {
  function positive(key: string, fallback: number, max: number) {
    const raw = params.get(key) ?? "";
    const value = Number(raw);
    return /^\d+$/.test(raw) && value > 0 && value <= max ? value : fallback;
  }
  return {
    pageNumber: positive("pageNumber", 1, 2147483647),
    pageSize: positive("pageSize", 20, 100),
    status: new RegExp("^[0-3]$").test(params.get("status") ?? "") ? Number(params.get("status")) : null,
  };
}

export function writeOrdersQuery(query: OrdersQuery) {
  const params = new URLSearchParams();
  if (query.pageNumber !== 1) {
    params.set("pageNumber", String(query.pageNumber));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.status !== null) {
    params.set("status", String(query.status));
  }
  return params;
}
