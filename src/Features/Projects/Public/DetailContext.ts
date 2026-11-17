import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { ProjectDto } from "../../../Types/contracts";
export const DetailContext = createContext<{ result: ResourceRead<ProjectDto>; reload: () => void } | null>(null);
export function useDetail() {
  const value = useContext(DetailContext);
  if (!value) throw new Error("Projects DetailProvider required.");
  return value;
}
