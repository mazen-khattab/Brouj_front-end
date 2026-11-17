import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import { invalidatePublicContent } from "../../../Realtime/publicContentInvalidation";
import { isGuid } from "../../../Services/identifiers";
import { useResourcePageBounds } from "../../../Hooks/useResourcePageBounds";
import { useRealtimeReload } from "../../../Hooks/useRealtimeReload";
import { useStaffOperation } from "../../../Hooks/useStaffOperation";
import { useStaffRead } from "../../../Hooks/useStaffRead";
import { invalidateOperations, useOperationsInvalidation } from "../../../Realtime/operationInvalidation";
import { completeInitiativeOrder, getOrderById, getOrders } from "../../../Services/Orders";
import type { OrderDto } from "../../../Types/contracts";
import { ApiError } from "../../../Types/failures";
import type { ResourceData } from "../../../Types/resource";
import { OrdersAdminContext } from "./OrdersAdminContext";
import { useOrdersQuery } from "./useQuery";

export function OrdersAdminProvider({ id, scope, children }: { id: string | undefined; scope: string; children: ReactNode }) {
  const filters = useOrdersQuery(id === undefined);
  const { pageNumber, pageSize, status } = filters;
  const load = useCallback(
    async (signal: AbortSignal): Promise<ResourceData<OrderDto>> => {
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
  useResourcePageBounds(read, filters);
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
    invalidatePublicContent();
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
