import { useContext } from "react";
import { ReservationsDataContext } from "./DataContext";
export function useReservationsData() {
  const value = useContext(ReservationsDataContext);
  if (!value) throw new Error("ReservationsDataProvider required.");
  return value;
}
