import { createContext, useContext } from "react";
import type { ApiError } from "../../../Types/failures";

export interface AreaEditorValue {
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
export const AreaEditorContext = createContext<AreaEditorValue | null>(null);

export function useAreaEditor() {
  const value = useContext(AreaEditorContext);
  if (!value) {
    throw new Error("Area editor provider required.");
  }
  return value;
}
