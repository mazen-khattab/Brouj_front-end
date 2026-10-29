import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { ReservationsAdminContext } from "./ReservationsAdminContext";
import { useOperationsQuery } from "../Hooks/useOperationsQuery";
import { useOperationsPageBounds } from "../Hooks/useOperationsPageBounds";
import { useStaffRead } from "../Hooks/useStaffRead";
import { useStaffOperation } from "../Hooks/useStaffOperation";
import { getReservations, getReservationDetails } from "../Services/Reservations";
import { createOrderFromReservation, getOrderById } from "../Services/Orders";
import { ApiError } from "../Types/failures";
import { isGuid } from "../Catalogue/query";
import { invalidateOperations, useOperationsInvalidation } from "../AdminOperations/invalidation";
import { invalidateCatalogue } from "../Catalogue/invalidation";
import type { OperationsData } from "../AdminOperations/types";
import type { ReservationDto } from "../Types/contracts";
import { useRealtimeReload } from "../Hooks/useRealtimeReload";

export function ReservationsAdminProvider({ id, scope, children }: { id: string | undefined; scope: string; children: ReactNode }) {
  const filters = useOperationsQuery("reservations", id === undefined);
  const { pageNumber, pageSize, status } = filters;
  const load = useCallback(
    async (signal: AbortSignal): Promise<OperationsData<ReservationDto>> => {
      if (id !== undefined) {
        if (!isGuid(id)) {
          throw new ApiError("transport", { status: 404 });
        }
        return { list: false, record: await getReservationDetails({ id }, { signal }) };
      }
      return { list: true, page: await getReservations({ query: { pageNumber, pageSize, status: status as 0 | 1 | 2 | null } }, { signal }) };
    },
    [id, pageNumber, pageSize, status],
  );
  const read = useStaffRead(`${scope}:${filters.key}`, load);
  useRealtimeReload("reservations", `${scope}:${filters.key}`, read.result.status === "loading", read.reload, id);
  useOperationsPageBounds(read, filters);
  useOperationsInvalidation("reservations", scope, read.reload);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const conversion = useStaffOperation("conversion", gate);

  async function reservation(targetId: string, signal: AbortSignal) {
    if (id === targetId) {
      const value = await read.reload(signal);
      if (!value.list) {
        return value.record;
      }
    }
    const value = await getReservationDetails({ id: targetId }, { signal });
    await read.reload(signal);
    return value;
  }

  async function refresh(targetId: string, signal: AbortSignal, returnedId?: string) {
    // Conversion changes two records. Read both and verify their link before acknowledging success.
    const current = await reservation(targetId, signal);
    const orderId = returnedId ?? current.orderId;
    if (orderId) {
      if (!isGuid(orderId)) {
        throw new ApiError("transport", { status: 200 });
      }
      const order = await getOrderById({ id: orderId }, { signal });
      if (order.id !== orderId || order.reservationId !== targetId || (returnedId && current.orderId !== returnedId)) {
        throw new ApiError("transport", { status: 200 });
      }
    }
    invalidateOperations(["reservations", "orders"], scope);
    invalidateCatalogue();
  }

  return (
    <ReservationsAdminContext
      value={{
        read,
        filters,
        conversion,
        convert: (targetId) =>
          conversion.run({
            id: targetId,
            write: (signal) => createOrderFromReservation({ reservationId: targetId }, { signal }),
            refresh: (returnedId, signal) => refresh(targetId, signal, returnedId),
            reconcile: (signal) => refresh(targetId, signal),
          }),
      }}
    >
      {children}
    </ReservationsAdminContext>
  );
}
