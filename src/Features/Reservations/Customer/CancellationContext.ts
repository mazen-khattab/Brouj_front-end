import { createContext, useContext } from "react";
import type { ApiError } from "../../../Types/failures";

export type CancellationResult = { ok: true; id: string } | { ok: false; failure: ApiError; uncertain: boolean };
export interface CancellationState {
  pending: boolean;
  failure?: ApiError;
  uncertain?: boolean;
  succeeded?: boolean;
}
export interface CancellationValue extends CancellationState {
  cancel: (id: string) => Promise<CancellationResult>;
  isCurrent: () => boolean;
}
export const CancellationContext = createContext<CancellationValue | null>(null);

export function useCancellation() {
  const value = useContext(CancellationContext);
  if (!value) throw new Error("Reservation action provider required.");
  return value;
}
