import { useContext } from "react";
import { HomeContext } from "../Context/HomeContext";

export function useHome() {
  const value = useContext(HomeContext);
  if (!value) {
    throw new Error("useHome requires HomeProvider.");
  }
  return value;
}
