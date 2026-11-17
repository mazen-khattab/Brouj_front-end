import { createContext, useContext } from "react";
import type { CustomerDto } from "../../../Types/contracts";
import type { ResourceCollectionRead } from "../../../Types/resource";
import type { StaffOperation } from "../../../Hooks/useStaffOperation";

import type { useCustomersQuery } from "./useCustomersQuery";

export interface CustomerOperationsValue {
  read: ResourceCollectionRead<CustomerDto>;
  filters: ReturnType<typeof useCustomersQuery>;
  deletion: StaffOperation;
  restoration: StaffOperation;
  active: "deletion" | "restoration" | undefined;
  remove: (id: string) => Promise<string | undefined>;
  restore: (id: string) => Promise<string | undefined>;
}
export const CustomerOperationsContext = createContext<CustomerOperationsValue | null>(null);

export function useCustomerOperations() {
  const value = useContext(CustomerOperationsContext);
  if (!value) {
    throw new Error("Customer operations provider required.");
  }
  return value;
}
