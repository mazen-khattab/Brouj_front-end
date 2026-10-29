import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { OrdersAdminContext } from "./OrdersAdminContext";
import { useOperationsQuery } from "../Hooks/useOperationsQuery";
import { useOperationsPageBounds } from "../Hooks/useOperationsPageBounds";
import { useStaffRead } from "../Hooks/useStaffRead";
import { useStaffOperation } from "../Hooks/useStaffOperation";
import { getOrders, getOrderById, completeInitiativeOrder } from "../Services/Orders";
import { ApiError } from "../Types/failures";
import { isGuid } from "../Catalogue/query";
import { invalidateOperations, useOperationsInvalidation } from "../AdminOperations/invalidation";
import { invalidateCatalogue } from "../Catalogue/invalidation";
import type { OperationsData } from "../AdminOperations/types";
import type { OrderDto } from "../Types/contracts";
import { useRealtimeReload } from "../Hooks/useRealtimeReload";

export function OrdersAdminProvider({ id, scope, children }: { id: string | undefined; scope: string; children: ReactNode }) {
  const filters = useOperationsQuery("orders", id === undefined);
  const { pageNumber, pageSize, status } = filters;
  const load = useCallback(
    async (signal: AbortSignal): Promise<OperationsData<OrderDto>> => {
      if (id !== undefined) {
        if (!isGuid(id)) {
          throw new ApiError("transport", { status: 404 });
        }
        return { list: false, record: await getOrderById({ id }, { signal }) };
      }
      return { list: true, page: await getOrders({ query: { pageNumber, pageSize, status: status as 0 | 1 | 2 | 3 | null } }, { signal }) };
    },
    [id, pageNumber, pageSize, status],
  );
  const read = useStaffRead(`${scope}:${filters.key}`, load);
  useRealtimeReload("orders", `${scope}:${filters.key}`, read.result.status === "loading", read.reload, id);
  useOperationsPageBounds(read, filters);
  useOperationsInvalidation("orders", scope, read.reload);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const completion = useStaffOperation("completion", gate);

  async function refresh(targetId: string, signal: AbortSignal) {
    if (id !== targetId) {
      await getOrderById({ id: targetId }, { signal });
    }
    await read.reload(signal);
    // Completion may cancel competing orders and change public unit availability.
    invalidateOperations(["orders"], scope);
    invalidateCatalogue();
  }

  return (
    <OrdersAdminContext
      value={{
        read,
        filters,
        completion,
        complete: (targetId) =>
          completion.run({
            id: targetId,
            write: (signal) => completeInitiativeOrder({ id: targetId }, { signal }),
            refresh: async (returnedId, signal) => {
              if (returnedId !== targetId) {
                throw new ApiError("transport", { status: 200 });
              }
              await refresh(targetId, signal);
            },
            reconcile: (signal) => refresh(targetId, signal),
          }),
      }}
    >
      {children}
    </OrdersAdminContext>
  );
}
