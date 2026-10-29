import { createContext, useContext } from "react";
import type { useGovernanceResource } from "../Hooks/useGovernanceResource";
import type { PaginationResult, TermsDto, TermsListDto } from "../Types/contracts";
import type { GovernanceFields } from "../Governance/policy";

export interface TermsSnapshot { page: PaginationResult<TermsListDto>; detail: TermsDto | null }
export interface TermsAdminValue extends Omit<ReturnType<typeof useGovernanceResource<TermsSnapshot>>, "run"> {
  page: number;
  setPage: (page: number) => void;
  create: (values: GovernanceFields) => Promise<string | undefined>;
  activate: (id: string) => Promise<string | undefined>;
}
export const TermsAdminContext = createContext<TermsAdminValue | null>(null);

export function useTermsAdmin() {
  const value = useContext(TermsAdminContext);
  if (!value) {
    throw new Error("Terms admin provider required.");
  }
  return value;
}
