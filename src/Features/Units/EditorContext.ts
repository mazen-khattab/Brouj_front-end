import { createContext, useContext } from "react";
import type { ApiError } from "../../Types/failures";

export interface UnitEditorValue {
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
export const UnitEditorContext = createContext<UnitEditorValue | null>(null);

export function useUnitEditor() {
  const value = useContext(UnitEditorContext);
  if (!value) {
    throw new Error("Unit editor provider required.");
  }
  return value;
}
