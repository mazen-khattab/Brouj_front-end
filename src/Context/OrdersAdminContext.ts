import { createContext, useContext } from "react";
import type { OrderDto } from "../Types/contracts";
import type { OperationsRead, OperationsFilters } from "../AdminOperations/types";
import type { StaffOperation } from "../Hooks/useStaffOperation";

export interface OrdersAdminValue {
  read: OperationsRead<OrderDto>;
  filters: OperationsFilters;
  completion: StaffOperation;
  complete: (id: string) => Promise<string | undefined>;
}
export const OrdersAdminContext = createContext<OrdersAdminValue | null>(null);

export function useOrdersAdmin() {
  const value = useContext(OrdersAdminContext);
  if (!value) {
    throw new Error("Admin orders provider required.");
  }
  return value;
}
