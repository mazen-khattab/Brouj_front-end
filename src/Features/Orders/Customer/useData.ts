import { useContext } from "react";
import { OrdersDataContext } from "./DataContext";
export function useOrdersData() {
  const value = useContext(OrdersDataContext);
  if (!value) throw new Error("OrdersDataProvider required.");
  return value;
}
