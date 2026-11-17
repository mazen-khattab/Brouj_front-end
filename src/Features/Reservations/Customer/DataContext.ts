import { createContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { PaginationResult, ReservationDto } from "../../../Types/contracts";
export type ReservationsData = { kind: "reservations"; value: PaginationResult<ReservationDto> } | { kind: "reservation"; value: ReservationDto };
export const ReservationsDataContext = createContext<{
  result: ResourceRead<ReservationsData>;
  reload: () => void;
  page: number;
  pageSize: number;
  status: number | null;
  update: (change: { page?: number; pageSize?: number; status?: number | null }) => void;
} | null>(null);
