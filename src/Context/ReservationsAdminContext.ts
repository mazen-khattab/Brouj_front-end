import { createContext, useContext } from "react";
import type { ReservationDto } from "../Types/contracts";
import type { OperationsRead, OperationsFilters } from "../AdminOperations/types";
import type { StaffOperation } from "../Hooks/useStaffOperation";

export interface ReservationsAdminValue {
  read: OperationsRead<ReservationDto>;
  filters: OperationsFilters;
  conversion: StaffOperation;
  convert: (id: string) => Promise<string | undefined>;
}
export const ReservationsAdminContext = createContext<ReservationsAdminValue | null>(null);

export function useReservationsAdmin() {
  const value = useContext(ReservationsAdminContext);
  if (!value) {
    throw new Error("Admin reservations provider required.");
  }
  return value;
}
