import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { TermsDto } from "../../../Types/contracts";
export const TermsContext = createContext<{ result: ResourceRead<TermsDto>; reload: () => void } | null>(null);
export function useTerms() {
  const value = useContext(TermsContext);
  if (!value) throw new Error("TermsProvider required.");
  return value;
}
