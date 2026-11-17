import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { UnitDto } from "../../../Types/contracts";
export const DetailContext = createContext<{ result: ResourceRead<UnitDto>; reload: () => void } | null>(null);
export function useDetail() {
  const value = useContext(DetailContext);
  if (!value) throw new Error("Units DetailProvider required.");
  return value;
}
