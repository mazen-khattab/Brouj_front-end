import { createContext, useContext } from "react";
import type { ApiError } from "../Types/failures";

export interface AdminCatalogueValue {
  scope: string;
  pending: boolean;
  blocked: boolean;
  failure: ApiError | undefined;
  uncertain: boolean;
  succeeded: boolean;
  run: (
    work: (signal: AbortSignal) => Promise<string>,
    refresh: () => Promise<unknown>,
    conflictRefresh?: () => Promise<unknown>,
  ) => Promise<string | undefined>;
  check: (refresh: () => Promise<unknown>) => Promise<void>;
  markDirty: (form: string, dirty: boolean) => void;
  discardDrafts: () => void;
}
export const AdminCatalogueContext = createContext<AdminCatalogueValue | null>(null);

export function useAdminCatalogue() {
  const value = useContext(AdminCatalogueContext);
  if (!value) {
    throw new Error("Admin catalogue provider required.");
  }
  return value;
}
