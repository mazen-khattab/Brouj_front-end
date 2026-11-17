import { createContext, useContext } from "react";
import type { CustomerProfileInput, PasswordChangeInput } from "../../../Types/contracts";
import type { ApiError } from "../../../Types/failures";

export type CustomerOperation = "profile" | "password";
export type CustomerActionResult = { ok: true; id: string } | { ok: false; failure: ApiError; uncertain: boolean };
export interface CustomerActionState {
  pending: boolean;
  operation?: CustomerOperation;
  failure?: ApiError;
  uncertain?: boolean;
  succeeded?: boolean;
}
export interface CustomerActionValue extends CustomerActionState {
  updateProfile: (input: CustomerProfileInput) => Promise<CustomerActionResult>;
  changePassword: (input: PasswordChangeInput) => Promise<CustomerActionResult>;
  resetAfterRead: () => void;
  isCurrent: () => boolean;
}
export const CustomerActionContext = createContext<CustomerActionValue | null>(null);

export function useProfileActions() { const value = useContext(CustomerActionContext); if (!value) throw new Error("Profile action provider required."); return value; }
