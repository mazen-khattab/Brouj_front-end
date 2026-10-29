import { createContext } from 'react';
import type { ApiError } from '../Types/failures';
import type { CustomerProfileInput, PasswordChangeInput } from '../Types/contracts';

export type CustomerOperation = 'profile' | 'password' | 'create' | 'cancel';
export type CustomerActionResult = { ok: true; id: string } | { ok: false; failure: ApiError; uncertain: boolean };
export interface CustomerActionState { pending: boolean; operation?: CustomerOperation; failure?: ApiError; uncertain?: boolean; succeeded?: boolean }
export interface CustomerActionValue extends CustomerActionState {
  updateProfile: (input: CustomerProfileInput) => Promise<CustomerActionResult>;
  changePassword: (input: PasswordChangeInput) => Promise<CustomerActionResult>;
  create: (unitId: string) => Promise<CustomerActionResult>;
  cancel: (id: string) => Promise<CustomerActionResult>;
  resetAfterRead: () => void;
  isCurrent: () => boolean;
}
export const CustomerActionContext = createContext<CustomerActionValue | null>(null);
