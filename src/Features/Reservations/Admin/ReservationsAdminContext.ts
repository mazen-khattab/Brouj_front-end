import { createContext, useContext } from "react";
import type { StaffOperation } from "../../../Hooks/useStaffOperation";
import type { ReservationDto } from "../../../Types/contracts";
import type { ResourceCollectionRead } from "../../../Types/resource";

import type { useReservationsQuery } from "./useQuery";

export interface ReservationsAdminValue {
  read: ResourceCollectionRead<ReservationDto>;
  filters: ReturnType<typeof useReservationsQuery>;
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
