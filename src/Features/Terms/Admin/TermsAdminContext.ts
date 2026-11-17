import { createContext, useContext } from "react";
import type { useStaffResource } from "../../../Hooks/useStaffResource";
import type { PaginationResult, TermsDto, TermsListDto } from "../../../Types/contracts";
import type { TermsValues } from "./types";

export interface TermsSnapshot {
  page: PaginationResult<TermsListDto>;
  detail: TermsDto | null;
}
export interface TermsAdminValue extends Omit<ReturnType<typeof useStaffResource<TermsSnapshot>>, "run"> {
  page: number;
  setPage: (page: number) => void;
  create: (values: TermsValues) => Promise<string | undefined>;
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
