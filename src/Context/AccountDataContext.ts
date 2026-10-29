import { createContext } from 'react';
import type { CurrentCustomerDto, OrderDto, PaginationResult, ReservationDto, TimePlanDto } from '../Types/contracts';
import type { CatalogueRead } from '../Hooks/useCatalogueRead';
export type AccountData =
  | { kind: 'profile'; value: CurrentCustomerDto }
  | { kind: 'reservations'; value: PaginationResult<ReservationDto> }
  | { kind: 'reservation'; value: ReservationDto }
  | { kind: 'orders'; value: PaginationResult<OrderDto> }
  | { kind: 'order'; value: OrderDto }
  | { kind: 'plan'; value: TimePlanDto };
export const AccountDataContext = createContext<{
  result: CatalogueRead<AccountData>; reload: () => void;
  page: number; pageSize: number; status: number | null;
  update: (change: { page?: number; pageSize?: number; status?: number | null }) => void;
} | null>(null);
