import { createContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { OrderDto, PaginationResult } from "../../../Types/contracts";
export type OrdersData = { kind: "orders"; value: PaginationResult<OrderDto> } | { kind: "order"; value: OrderDto };
export const OrdersDataContext = createContext<{
  result: ResourceRead<OrdersData>;
  reload: () => void;
  page: number;
  pageSize: number;
  status: number | null;
  update: (change: { page?: number; pageSize?: number; status?: number | null }) => void;
} | null>(null);
