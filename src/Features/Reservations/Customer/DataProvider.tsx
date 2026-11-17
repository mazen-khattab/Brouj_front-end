import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { isGuid } from "../../../Services/identifiers";
import { useAuth } from "../../../Hooks/useAuth";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { useRealtimeReload } from "../../../Hooks/useRealtimeReload";
import { getMyReservations, getReservationById } from "../../../Services/Reservations";
import { ApiError } from "../../../Types/failures";
import type { ReservationsData } from "./DataContext";
import { ReservationsDataContext } from "./DataContext";

export function ReservationsDataProvider({ kind, id, children }: { kind: ReservationsData["kind"]; id?: string | undefined; children: ReactNode }) {
  const auth = useAuth();
  const [search, setSearch] = useSearchParams();
  const positive = (key: string, fallback: number, max: number) => {
    const raw = search.get(key);
    const value = Number(raw);
    return raw && /^\d+$/.test(raw) && value > 0 && value <= max ? value : fallback;
  };
  const page = positive("pageNumber", 1, 2_147_483_647),
    pageSize = positive("pageSize", 12, 100);
  const selected = search.get("status");
  const status = selected !== null && /^[0-3]$/.test(selected) && Number(selected) <= 2 ? Number(selected) : null;
  const list = kind === "reservations";
  const allowed = auth.actor === "customer";
  const canonical = new URLSearchParams();
  if (page !== 1) canonical.set("pageNumber", String(page));
  if (pageSize !== 12) canonical.set("pageSize", String(pageSize));
  if (status !== null) canonical.set("status", String(status));
  const queryKey = list ? canonical.toString() : "";
  useEffect(() => {
    if (list && search.toString() !== queryKey) setSearch(queryKey, { replace: true, preventScrollReset: true });
  }, [list, search, queryKey, setSearch]);
  const load = useCallback(
    async (signal: AbortSignal): Promise<ReservationsData> => {
      if (!allowed) throw new ApiError("transport", { status: 403 });
      if (!list && !isGuid(id)) throw new ApiError("transport", { status: 404 });
      if (list)
        return { kind, value: await getMyReservations({ query: { pageNumber: page, pageSize, status: status as 0 | 1 | 2 | null } }, { signal }) };
      return { kind, value: await getReservationById({ id: id! }, { signal }) };
    },
    [kind, id, allowed, page, pageSize, status, list],
  );
  const scope = auth.actor ? `${auth.actor}:${auth.profile.id}:${auth.generation}` : "anonymous";
  const { result, reload } = useResourceRead(`private:${scope}:${kind}:${id ?? ""}:${queryKey}`, load, allowed);
  const feature = "reservations";
  useRealtimeReload(
    allowed ? feature : undefined,
    `${scope}:${kind}:${id ?? ""}:${queryKey}`,
    result.status === "loading",
    reload,
    list ? undefined : id,
  );
  useEffect(() => {
    if (result.status !== "success" || result.data.kind !== "reservations") return;
    const last = Math.max(1, result.data.value.totalPages);
    if (page > last) {
      const next = new URLSearchParams(queryKey);
      if (last === 1) next.delete("pageNumber");
      else next.set("pageNumber", String(last));
      setSearch(next, { replace: true, preventScrollReset: true });
    }
  }, [result, page, queryKey, setSearch]);
  return (
    <ReservationsDataContext
      value={{
        result,
        reload,
        page,
        pageSize,
        status,
        update: (change) => {
          const next = new URLSearchParams(queryKey);
          const nextPage = change.page ?? 1;
          if (nextPage === 1) next.delete("pageNumber");
          else next.set("pageNumber", String(nextPage));
          if (change.pageSize !== undefined) next.set("pageSize", String(change.pageSize));
          if (change.status !== undefined) {
            if (change.status === null) next.delete("status");
            else next.set("status", String(change.status));
          }
          setSearch(next, { preventScrollReset: true });
        },
      }}
    >
      {children}
    </ReservationsDataContext>
  );
}
