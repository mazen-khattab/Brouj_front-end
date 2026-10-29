import { createContext, useContext } from "react";
import type { CustomerDto } from "../Types/contracts";
import type { OperationsRead, OperationsFilters } from "../AdminOperations/types";
import type { StaffOperation } from "../Hooks/useStaffOperation";

export interface CustomerOperationsValue {
  read: OperationsRead<CustomerDto>;
  filters: OperationsFilters;
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
