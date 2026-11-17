import { createContext, useContext } from "react";
import type { ApiError } from "../../Types/failures";

export interface CityEditorValue {
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
export const CityEditorContext = createContext<CityEditorValue | null>(null);

export function useCityEditor() {
  const value = useContext(CityEditorContext);
  if (!value) {
    throw new Error("City editor provider required.");
  }
  return value;
}
