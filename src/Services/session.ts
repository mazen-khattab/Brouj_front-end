import { createSessionCoordinator } from '../Security/sessionCoordinator';
import { createBrowserSessionPlatform } from '../Security/sessionPlatform';
import { sessionBoundary } from '../Security/sessionBoundary';
import * as customerAuth from './CustomerAuth';
import * as staffAuth from './StaffAuth';
import { getCurrentCustomer } from './CustomerProfile';
import { getCurrentUser } from './StaffProfile';
import { getCsrfProof, invalidateCsrfProof } from './Security';

const control = (signal: AbortSignal) => ({ signal, sessionControl: true, skipAuthenticationRecovery: true });
/** Only this composition layer wires HTTP services into the framework-independent coordinator. */
export const sessionCoordinator = createSessionCoordinator({
  customerProfile: (signal) => getCurrentCustomer(control(signal)),
  staffProfile: (signal) => getCurrentUser(control(signal)),
  loginCustomer: (body, signal) => customerAuth.loginCustomer({ body }, control(signal)),
  registerCustomer: (body, signal) => customerAuth.registerCustomer({ body }, control(signal)),
  loginStaff: (body, signal) => staffAuth.loginUser({ body }, control(signal)),
  refresh: (actor, signal) => actor === 'customer' ? customerAuth.refreshCustomerSession(control(signal)) : staffAuth.refreshUserSession(control(signal)),
  logout: (actor, signal) => actor === 'customer' ? customerAuth.logoutCustomer(control(signal)) : staffAuth.logoutUser(control(signal)),
  proof: (signal) => getCsrfProof({ signal }),
  invalidateProof: invalidateCsrfProof,
}, createBrowserSessionPlatform(), sessionBoundary);
