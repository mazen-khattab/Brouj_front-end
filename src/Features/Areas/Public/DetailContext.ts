import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { AreaDto } from "../../../Types/contracts";
export const DetailContext = createContext<{ result: ResourceRead<AreaDto>; reload: () => void } | null>(null);
export function useDetail() {
  const value = useContext(DetailContext);
  if (!value) throw new Error("Areas DetailProvider required.");
  return value;
}
