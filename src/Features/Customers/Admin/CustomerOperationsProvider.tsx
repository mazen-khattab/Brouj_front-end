import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CustomerOperationsContext } from "./CustomerOperationsContext";
import { useCustomersQuery } from "./useCustomersQuery";
import { useResourcePageBounds } from "../../../Hooks/useResourcePageBounds";
import { useStaffRead } from "../../../Hooks/useStaffRead";
import { useStaffOperation } from "../../../Hooks/useStaffOperation";
import * as customers from "../../../Services/CustomersAdmin";
import { ApiError } from "../../../Types/failures";
import { isGuid } from "../../../Services/identifiers";
import { invalidateOperations, useOperationsInvalidation } from "../../../Realtime/operationInvalidation";
import type { ResourceData } from "../../../Types/resource";
import type { CustomerDto } from "../../../Types/contracts";

export function CustomerOperationsProvider({ id, scope, children }: { id: string | undefined; scope: string; children: ReactNode }) {
  const filters = useCustomersQuery(id === undefined);
  const { pageNumber, pageSize, isDeleted, debouncedSearch } = filters;
  const load = useCallback(
    async (signal: AbortSignal): Promise<ResourceData<CustomerDto>> => {
      if (id !== undefined) {
        if (!isGuid(id)) {
          throw new ApiError("transport", { status: 404 });
        }
        return { list: false, record: await customers.getCustomerById({ id }, { signal }) };
      }
      return {
        list: true,
        page: await customers.getCustomers(
          { query: { pageNumber, pageSize, isDeleted, ...(debouncedSearch ? { search: debouncedSearch } : {}) } },
          { signal },
        ),
      };
    },
    [id, pageNumber, pageSize, isDeleted, debouncedSearch],
  );
  const read = useStaffRead(`${scope}:${filters.key}:${debouncedSearch}`, load);
  useResourcePageBounds(read, filters);
  useOperationsInvalidation("customers", scope, read.reload);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const deletion = useStaffOperation("deletion", gate);
  const restoration = useStaffOperation("restoration", gate);
  const [active, setActive] = useState<"deletion" | "restoration">();

  async function refresh(targetId: string, signal: AbortSignal) {
    // A filtered list may no longer contain a soft-deleted customer; its detail endpoint still returns that record.
    if (id !== targetId) {
      await customers.getCustomerById({ id: targetId }, { signal });
    }
    await read.reload(signal);
    invalidateOperations(["customers"], scope);
  }

  function change(operation: "deletion" | "restoration", targetId: string) {
    setActive(operation);
    return (operation === "deletion" ? deletion : restoration).run({
      id: targetId,
      write: (signal) =>
        operation === "deletion"
          ? customers.softDeleteCustomer({ id: targetId }, { signal })
          : customers.restoreCustomer({ id: targetId }, { signal }),
      refresh: async (returnedId, signal) => {
        if (returnedId !== targetId) {
          throw new ApiError("transport", { status: 200 });
        }
        await refresh(targetId, signal);
      },
      reconcile: (signal) => refresh(targetId, signal),
    });
  }

  return (
    <CustomerOperationsContext
      value={{
        read,
        filters,
        deletion,
        restoration,
        active,
        remove: (targetId) => change("deletion", targetId),
        restore: (targetId) => change("restoration", targetId),
      }}
    >
      {children}
    </CustomerOperationsContext>
  );
}
