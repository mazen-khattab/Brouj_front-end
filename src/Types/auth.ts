import type { ApiFailure } from './failures';
import type { CurrentCustomerDto, UserDto, UserRole } from './contracts';

export type Actor = 'customer' | 'staff';
export type SessionReason = 'network' | 'hydration' | 'expired' | 'refreshUncertain' | 'logoutUnconfirmed' | 'locksUnavailable' | 'changed';
export type SessionIdentity =
  | { status: 'bootstrapping' | 'anonymous' | 'unavailable'; actor: null }
  | { status: 'customer'; actor: 'customer'; profile: CurrentCustomerDto }
  | { status: 'staff'; actor: 'staff'; profile: UserDto; role: UserRole };
export type AuthState = SessionIdentity & {
  generation: number;
  pending: boolean;
  automaticRefresh: boolean;
  reason?: SessionReason;
  failure?: ApiFailure;
  /** Known identity must be signed out before another login can replace its cookies. */
  logoutRequired: boolean;
};
export class SessionActionError extends Error {
  constructor(readonly code: 'busy' | 'logoutRequired' | 'signInRequired' | 'hydration', readonly failure?: ApiFailure) {
    super('The session action could not be completed.');
    this.name = 'SessionActionError';
  }
}
