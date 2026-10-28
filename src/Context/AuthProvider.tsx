import { useLayoutEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { sessionCoordinator } from '../Services/session';
import type { SessionCoordinator } from '../Security/sessionCoordinator';

export function AuthProvider({ children, coordinator = sessionCoordinator }: { children: ReactNode; coordinator?: SessionCoordinator }) {
  const state = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
  useLayoutEffect(() => coordinator.start(), [coordinator]);
  return <AuthContext value={{ ...state, loginCustomer: coordinator.loginCustomer, registerCustomer: coordinator.registerCustomer,
    loginStaff: coordinator.loginStaff, logout: coordinator.logout, retryBootstrap: coordinator.retryBootstrap }}>{children}</AuthContext>;
}
