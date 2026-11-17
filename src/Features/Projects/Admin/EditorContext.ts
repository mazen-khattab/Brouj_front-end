import { createContext, useContext } from "react";
import type { ApiError } from "../../../Types/failures";

export interface ProjectEditorValue {
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
export const ProjectEditorContext = createContext<ProjectEditorValue | null>(null);

export function useProjectEditor() {
  const value = useContext(ProjectEditorContext);
  if (!value) {
    throw new Error("Project editor provider required.");
  }
  return value;
}
