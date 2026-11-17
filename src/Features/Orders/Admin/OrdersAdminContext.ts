import { createContext, useContext } from "react";
import type { StaffOperation } from "../../../Hooks/useStaffOperation";
import type { OrderDto } from "../../../Types/contracts";
import type { ResourceCollectionRead } from "../../../Types/resource";

import type { useOrdersQuery } from "./useQuery";

export interface OrdersAdminValue {
  read: ResourceCollectionRead<OrderDto>;
  filters: ReturnType<typeof useOrdersQuery>;
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
