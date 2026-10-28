import { afterEach, expect, test, vi } from 'vitest';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as API from '../../src/API';
import { createCsrfCoordinator } from '../../src/Security/csrf';
import { createAuthenticationFailureChannel } from '../../src/Security/authenticationFailures';
import { createSessionBoundary } from '../../src/Security/sessionBoundary';
import { createSessionCoordinator } from '../../src/Security/sessionCoordinator';
import * as customerAuth from '../../src/Services/CustomerAuth';
import * as staffAuth from '../../src/Services/StaffAuth';
import { getCurrentCustomer } from '../../src/Services/CustomerProfile';
import { getCurrentUser } from '../../src/Services/StaffProfile';
import { createReservation, getMyReservations } from '../../src/Services/Reservations';
import type { Actor } from '../../src/Types/auth';

const customer = { id: '00000000-0000-0000-0000-000000000001', fName: 'Customer', lName: 'Fixture', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' };
const staff = { id: '00000000-0000-0000-0000-000000000002', name: 'Staff fixture', email: 'staff@example.test', phone: '01000000000', role: 0, deletedAt: null };
const disposers: (() => void)[] = [];
afterEach(async () => { for (const dispose of disposers.splice(0)) dispose(); await Promise.resolve(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }

async function fixture() {
  const calls: InternalAxiosRequestConfig[] = [];
  const server = { actor: 'customer' as Actor | undefined, expired: false, status: 0, refreshedButStill401: false, refreshStatus: 0 };
  let intercept: AxiosAdapter | undefined;
  let before: ((config: InternalAxiosRequestConfig) => Promise<void>) | undefined;
  const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({ config, data: status === 200 ? { success: true, data, message: null } : { status }, status, statusText: 'Fixture', headers: {} });
  const proof = () => !server.actor || server.expired ? 'anonymous-proof' : server.actor + '-proof';
  const security = createCsrfCoordinator(); const boundary = createSessionBoundary();
  const transport = API.createApiTransport(async (config) => {
    calls.push(config);
    await before?.(config);
    if (intercept) return intercept(config);
    if (config.url?.endsWith('/csrf')) return response(config, { requestToken: proof() });
    if (config.url?.endsWith('/customers/me')) return server.actor === 'customer' && !server.expired ? response(config, customer) : response(config, {}, server.actor && !server.expired ? 403 : 401);
    if (config.url?.endsWith('/users/me')) return server.actor === 'staff' && !server.expired ? response(config, staff) : response(config, {}, server.actor && !server.expired ? 403 : 401);
    if (config.url?.includes('/auth/')) {
      expect(config.headers.get('X-CSRF-TOKEN')).toBe(proof());
      if (config.url.endsWith('/refresh')) {
        if (server.refreshStatus) return response(config, {}, server.refreshStatus);
        server.expired = false;
      } else if (config.url.endsWith('/logout')) { server.actor = undefined; server.expired = false; return response(config, customer.id); }
      else { server.actor = config.url.includes('/users/') ? 'staff' : 'customer'; server.expired = false; }
      return response(config, { actorId: server.actor === 'staff' ? staff.id : customer.id, expiresAt: '2099-01-01T00:00:00Z' });
    }
    if (server.status || server.expired || server.refreshedButStill401) return response(config, {}, server.status || 401);
    if (config.method !== 'get') expect(config.headers.get('X-CSRF-TOKEN')).toBe(proof());
    return response(config, config.method === 'get' ? { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 } : customer.id);
  }, security, createAuthenticationFailureChannel(), boundary);
  vi.spyOn(API, 'apiRequest').mockImplementation(transport.request);
  const control = (signal: AbortSignal) => ({ signal, sessionControl: true, skipAuthenticationRecovery: true });
  let hint: Actor | undefined = 'customer';
  const coordinator = createSessionCoordinator({
    customerProfile: (signal) => getCurrentCustomer(control(signal)), staffProfile: (signal) => getCurrentUser(control(signal)),
    loginCustomer: (body, signal) => customerAuth.loginCustomer({ body }, control(signal)),
    registerCustomer: (body, signal) => customerAuth.registerCustomer({ body }, control(signal)),
    loginStaff: (body, signal) => staffAuth.loginUser({ body }, control(signal)),
    refresh: (actor, signal) => actor === 'customer' ? customerAuth.refreshCustomerSession(control(signal)) : staffAuth.refreshUserSession(control(signal)),
    logout: (actor, signal) => actor === 'customer' ? customerAuth.logoutCustomer(control(signal)) : staffAuth.logoutUser(control(signal)),
    proof: transport.csrf, invalidateProof: security.invalidate,
  }, { readHint: () => hint, writeHint: (actor) => { hint = actor; }, lock: async (work) => work(), subscribe: () => () => {}, publish: () => {} }, boundary);
  const stop = coordinator.start(); disposers.push(() => { stop(); queueMicrotask(transport.dispose); });
  await coordinator.retryBootstrap();
  return { calls, server, coordinator, transport, boundary, response, intercept: (adapter: AxiosAdapter | undefined) => { intercept = adapter; }, before: (work: (config: InternalAxiosRequestConfig) => Promise<void>) => { before = work; } };
}

test('concurrent real service 401s rotate once, rebind CSRF and replay every request only once', async () => {
  const f = await fixture(); f.server.expired = true;
  const results = await Promise.all([getMyReservations(), getMyReservations(), getMyReservations()]);
  expect(results.every((value) => value.totalCount === 0)).toBe(true);
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(1);
  expect(f.calls.filter((config) => config.url?.endsWith('/reservations/me'))).toHaveLength(6);
  const proofCalls = f.calls.filter((config) => config.url?.endsWith('/csrf'));
  expect(proofCalls).toHaveLength(2);
  expect(f.coordinator.getSnapshot().status).toBe('customer');
});
test('a mutation rejected with definitive 401 replays with fresh proof and retains GUID data', async () => {
  const f = await fixture(); f.server.expired = true;
  await expect(createReservation({ body: { unitId: customer.id } })).resolves.toBe(customer.id);
  expect(f.calls.filter((config) => config.url === '/api/v1/reservations')).toHaveLength(2);
  expect(f.calls.at(-1)?.headers.get('X-CSRF-TOKEN')).toBe('customer-proof');
});
test.each([400, 403, 409, 429, 500])('%s never triggers refresh or replay', async (status) => {
  const f = await fixture(); f.server.status = status;
  await expect(getMyReservations()).rejects.toMatchObject({ status });
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(0);
  expect(f.calls.filter((config) => config.url?.endsWith('/reservations/me'))).toHaveLength(1);
});
test('a second 401 ends the session without another refresh or replay', async () => {
  const f = await fixture(); f.server.expired = true; f.server.refreshedButStill401 = true;
  await expect(getMyReservations()).rejects.toMatchObject({ status: 401 });
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(1);
  expect(f.calls.filter((config) => config.url?.endsWith('/reservations/me'))).toHaveLength(2);
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
});
test('profile probes opt out and never recursively recover', async () => {
  const f = await fixture(); f.server.expired = true;
  await expect(getCurrentCustomer({ sessionControl: true })).rejects.toMatchObject({ status: 401 });
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(0);
});
test('late private responses are canceled after confirmed logout', async () => {
  const f = await fixture(); const gate = deferred<AxiosResponse>();
  f.intercept(async (config) => {
    if (config.url?.endsWith('/reservations/me')) return gate.promise;
    if (config.url?.endsWith('/csrf')) return f.response(config, { requestToken: 'proof' });
    if (config.url?.endsWith('/logout')) { f.server.actor = undefined; return f.response(config, customer.id); }
    throw new Error('Unexpected request');
  });
  const pending = expect(getMyReservations()).rejects.toMatchObject({ kind: 'canceled' });
  await vi.waitFor(() => expect(f.calls.some((config) => config.url?.endsWith('/reservations/me'))).toBe(true));
  const old = f.calls.at(-1)!;
  await f.coordinator.logout();
  gate.resolve(f.response(old, { private: 'old' }));
  await pending;
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
});
test('new unsafe requests are blocked while a session refresh is pending', async () => {
  const f = await fixture(); f.server.expired = true;
  const gate = deferred<void>();
  f.intercept(async (config) => {
    if (config.url?.endsWith('/reservations/me')) return f.response(config, {}, 401);
    if (config.url?.endsWith('/me')) return f.response(config, {}, 401);
    if (config.url?.endsWith('/csrf')) return f.response(config, { requestToken: 'anonymous-proof' });
    if (config.url?.endsWith('/refresh')) { await gate.promise; return f.response(config, {}, 401); }
    throw new Error('An unsafe request escaped the transition gate');
  });
  const first = expect(getMyReservations()).rejects.toMatchObject({ status: 401 });
  await vi.waitFor(() => expect(f.coordinator.getSnapshot().pending).toBe(true));
  await expect(createReservation({ body: { unitId: customer.id } })).rejects.toMatchObject({ kind: 'canceled' });
  gate.resolve(); await first;
  expect(f.calls.filter((config) => config.url === '/api/v1/reservations')).toHaveLength(0);
});

test('canceling one request waiting on refresh does not cancel refresh or replay another request', async () => {
  const f = await fixture(); f.server.expired = true;
  const gate = deferred<void>();
  f.before(async (config) => { if (config.url?.endsWith('/refresh')) await gate.promise; });
  const controller = new AbortController();
  const canceled = expect(getMyReservations({}, { signal: controller.signal })).rejects.toMatchObject({ kind: 'canceled' });
  const survivor = getMyReservations();
  await vi.waitFor(() => expect(f.calls.some((config) => config.url?.endsWith('/refresh'))).toBe(true));
  controller.abort(); await canceled;
  gate.resolve(); await survivor;
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(1);
  expect(f.calls.filter((config) => config.url?.endsWith('/reservations/me'))).toHaveLength(3);
});

test('a protected network failure retains the current actor and never guesses refresh', async () => {
  const f = await fixture(); f.intercept(async () => { throw { isAxiosError: true, code: 'ERR_NETWORK' }; });
  await expect(getMyReservations()).rejects.toMatchObject({ kind: 'network' });
  expect(f.coordinator.getSnapshot().status).toBe('customer');
  expect(f.calls.filter((config) => config.url?.endsWith('/refresh'))).toHaveLength(0);
});
