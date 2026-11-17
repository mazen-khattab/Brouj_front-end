import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { CityDto } from "../../../Types/contracts";
export const DetailContext = createContext<{ result: ResourceRead<CityDto>; reload: () => void } | null>(null);
export function useDetail() {
  const value = useContext(DetailContext);
  if (!value) throw new Error("Cities DetailProvider required.");
  return value;
}
