import { createContext } from 'react';
import type { AuthState } from '../Types/auth';
import type { SessionCoordinator } from '../Security/sessionCoordinator';

export type AuthValue = AuthState & Pick<SessionCoordinator, 'loginCustomer' | 'registerCustomer' | 'loginStaff' | 'logout' | 'retryBootstrap' | 'reloadIdentity'>;
export const AuthContext = createContext<AuthValue | undefined>(undefined);
