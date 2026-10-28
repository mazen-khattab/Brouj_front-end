import { afterEach, expect, test, vi } from 'vitest';
import { createSessionCoordinator } from '../../src/Security/sessionCoordinator';
import type { SessionServices } from '../../src/Security/sessionCoordinator';
import { createSessionBoundary } from '../../src/Security/sessionBoundary';
import type { SessionPlatform, SessionNotice } from '../../src/Security/sessionPlatform';
import type { Actor } from '../../src/Types/auth';
import { ApiError } from '../../src/Types/failures';
import type { AuthSessionDto } from '../../src/Types/contracts';

const customer = { id: 'customer-id', fName: 'Customer', lName: 'Fixture', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' };
const staff = { id: 'staff-id', name: 'Staff fixture', email: 'staff@example.test', phone: '01000000000', role: 0 as const, deletedAt: null };
const input = { email: 'customer@example.test', password: 'test-password' };
const stops: (() => void)[] = [];
afterEach(async () => { for (const stop of stops.splice(0)) stop(); await Promise.resolve(); });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }

function fixture(options: { hint?: Actor; actor?: Actor; locks?: boolean } = {}) {
  const server = { actor: options.actor as Actor | undefined };
  let hint = options.hint;
  let receive: (notice: SessionNotice) => void = () => {};
  const profile = async (actor: Actor) => {
    if (server.actor !== actor) throw new ApiError('transport', { status: server.actor ? 403 : 401 });
    return actor === 'customer' ? customer : staff;
  };
  const metadata = (actor: Actor): AuthSessionDto => ({ actorId: actor === 'customer' ? customer.id : staff.id, expiresAt: '2099-01-01T00:00:00Z' });
  const services = {
    customerProfile: vi.fn(async () => await profile('customer') as typeof customer),
    staffProfile: vi.fn(async () => await profile('staff') as typeof staff),
    loginCustomer: vi.fn(async () => { server.actor = 'customer'; return metadata('customer'); }),
    registerCustomer: vi.fn(async () => { server.actor = 'customer'; return metadata('customer'); }),
    loginStaff: vi.fn(async () => { server.actor = 'staff'; return metadata('staff'); }),
    refresh: vi.fn(async (actor: Actor) => { server.actor = actor; return metadata(actor); }),
    logout: vi.fn(async () => { server.actor = undefined; return 'logout-id'; }),
    proof: vi.fn(async () => 'proof'),
    invalidateProof: vi.fn(),
  } satisfies SessionServices;
  const platform = {
    readHint: () => hint,
    writeHint: vi.fn((actor: Actor | undefined) => { hint = actor; }),
    ...(options.locks === false ? {} : { lock: async <T,>(work: () => Promise<T>): Promise<T> => work() }),
    subscribe: (listener: (notice: SessionNotice) => void) => { receive = listener; return () => { receive = () => {}; }; },
    publish: vi.fn(),
  } satisfies SessionPlatform;
  const boundary = createSessionBoundary();
  const coordinator = createSessionCoordinator(services, platform, boundary);
  const start = async () => { stops.push(coordinator.start()); await coordinator.retryBootstrap(); };
  return { services, server, platform, boundary, coordinator, start, hint: () => hint, receive: (notice: SessionNotice) => receive(notice), metadata };
}

test('anonymous bootstrap probes both profiles and never guesses a refresh actor', async () => {
  const f = fixture(); await f.start();
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'anonymous', actor: null });
  expect(f.services.customerProfile).toHaveBeenCalledTimes(1);
  expect(f.services.staffProfile).toHaveBeenCalledTimes(1);
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test.each(['customer', 'staff'] as const)('restores the current %s with a fresh profile', async (actor) => {
  const f = fixture({ hint: actor, actor }); await f.start();
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: actor, actor, profile: actor === 'customer' ? customer : staff });
  if (actor === 'staff') expect(f.coordinator.getSnapshot()).toHaveProperty('role', 0);
  expect(f.services.refresh).not.toHaveBeenCalled();
  expect(f.hint()).toBe(actor);
});
test('wrong actor hint only changes probe order and is corrected by authoritative identity', async () => {
  const f = fixture({ hint: 'staff', actor: 'customer' }); await f.start();
  expect(f.coordinator.getSnapshot().actor).toBe('customer');
  expect(f.hint()).toBe('customer');
  expect(f.services.staffProfile.mock.invocationCallOrder[0]).toBeLessThan(f.services.customerProfile.mock.invocationCallOrder[0]!);
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test.each([500, 429])('profile %s leaves identity unavailable, without another actor probe or refresh', async (status) => {
  const f = fixture({ hint: 'staff' }); f.services.staffProfile.mockRejectedValue(new ApiError('transport', { status }));
  await f.start();
  expect(f.coordinator.getSnapshot().status).toBe('unavailable');
  expect(f.services.customerProfile).not.toHaveBeenCalled();
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test('profile network failure permits safe bootstrap retry instead of assuming logout', async () => {
  const f = fixture({ actor: 'customer' }); f.services.customerProfile.mockRejectedValueOnce(new ApiError('network'));
  await f.start(); expect(f.coordinator.getSnapshot().status).toBe('unavailable');
  await f.coordinator.retryBootstrap(); expect(f.coordinator.getSnapshot().status).toBe('customer');
});
test('reload refreshes only the hinted actor and rebinds proof before profile hydration', async () => {
  const f = fixture({ hint: 'staff' }); await f.start();
  expect(f.services.refresh).toHaveBeenCalledExactlyOnceWith('staff', expect.any(AbortSignal));
  expect(f.services.proof).toHaveBeenCalledTimes(2);
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'staff', role: 0 });
  expect(f.platform.publish).toHaveBeenCalledWith('changed');
});
test('unsupported cross-tab locking disables refresh and requests sign-in', async () => {
  const f = fixture({ hint: 'customer', locks: false }); await f.start();
  expect(f.services.refresh).not.toHaveBeenCalled();
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'unavailable', reason: 'locksUnavailable', automaticRefresh: false });
});
test('concurrent 401s share one refresh, and a later old revision reuses that result', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!;
  f.server.actor = undefined;
  const gate = deferred<AuthSessionDto>();
  f.services.refresh.mockImplementation(async (actor) => { const metadata = await gate.promise; f.server.actor = actor; return metadata; });
  const results = [f.boundary.recover(stamp), f.boundary.recover(stamp), f.boundary.recover(stamp)];
  await vi.waitFor(() => expect(f.services.refresh).toHaveBeenCalledTimes(1));
  gate.resolve(f.metadata('customer'));
  expect(await Promise.all(results)).toEqual([true, true, true]);
  expect(await f.boundary.recover(stamp)).toBe(true);
  expect(f.services.refresh).toHaveBeenCalledTimes(1);
});
test('a profile restored by another tab while waiting for the lock avoids rotating again', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!; f.server.actor = undefined;
  const gate = deferred<void>();
  f.platform.lock = async <T,>(work: () => Promise<T>): Promise<T> => { await gate.promise; return work(); };
  const result = f.boundary.recover(stamp);
  f.server.actor = 'customer'; gate.resolve();
  expect(await result).toBe(true);
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test('a different identity found under the lock cancels old replay', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!; f.server.actor = 'staff';
  expect(await f.boundary.recover(stamp)).toBe(false);
  expect(f.coordinator.getSnapshot().actor).toBe('staff');
  expect(f.coordinator.getSnapshot().generation).toBeGreaterThan(stamp.generation);
  expect(f.services.refresh).not.toHaveBeenCalled();
});

test('a denied cross-tab lock fails closed without leaving a permanently pending session', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!; f.server.actor = undefined;
  f.platform.lock = () => { throw new Error('Lock denied'); };
  expect(await f.boundary.recover(stamp)).toBe(false);
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'unavailable', pending: false, reason: 'refreshUncertain' });
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test('definitive refresh rejection clears private identity, hint and proof without a retry loop', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!; f.server.actor = undefined;
  f.services.refresh.mockRejectedValue(new ApiError('feature', { status: 401, featureCode: 1 }));
  expect(await f.boundary.recover(stamp)).toBe(false);
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'anonymous', reason: 'expired' });
  expect(f.hint()).toBeUndefined();
  await f.coordinator.retryBootstrap();
  expect(f.services.refresh).toHaveBeenCalledTimes(1);
});
test('uncertain refresh pauses writes and safe retry never blindly rotates again', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const stamp = f.boundary.stamp()!; f.server.actor = undefined;
  f.services.refresh.mockRejectedValue(new ApiError('network'));
  expect(await f.boundary.recover(stamp)).toBe(false);
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'unavailable', reason: 'refreshUncertain', logoutRequired: true });
  expect(() => f.boundary.assert({ operation: 'write', authenticated: true, skipAuthenticationRecovery: false }, true)).toThrow();
  await f.coordinator.retryBootstrap();
  expect(f.services.refresh).toHaveBeenCalledTimes(1);
  await expect(f.coordinator.loginStaff(input)).rejects.toMatchObject({ code: 'logoutRequired' });
});
test.each(['loginCustomer', 'registerCustomer', 'loginStaff'] as const)('%s hydrates only server profile data after proof rebinding', async (method) => {
  const f = fixture(); await f.start();
  const body = { ...input, ...customer, password: 'test-password' };
  await f.coordinator[method](body);
  expect(f.coordinator.getSnapshot().actor).toBe(method === 'loginStaff' ? 'staff' : 'customer');
  expect(f.services.proof).toHaveBeenCalledTimes(2);
  expect(f.platform.publish).toHaveBeenCalledWith('changed');
});
test('invalid credentials retain anonymous state and cannot fabricate an actor', async () => {
  const f = fixture(); await f.start();
  f.services.loginCustomer.mockRejectedValue(new ApiError('feature', { status: 401, featureCode: 1 }));
  await expect(f.coordinator.loginCustomer(input)).rejects.toMatchObject({ featureCode: 1 });
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
  expect(f.hint()).toBeUndefined();
});
test('successful login with failed hydration offers safe retry without returning a fake profile', async () => {
  const f = fixture(); await f.start();
  f.services.loginCustomer.mockImplementation(async () => {
    f.server.actor = 'customer'; f.services.customerProfile.mockRejectedValueOnce(new ApiError('network')); return f.metadata('customer');
  });
  await expect(f.coordinator.loginCustomer(input)).rejects.toMatchObject({ code: 'hydration' });
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'unavailable', actor: null, reason: 'hydration' });
  await f.coordinator.retryBootstrap();
  expect(f.coordinator.getSnapshot().status).toBe('customer');
});
test('active identity must log out before another login, and business writes block transitions', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  await expect(f.coordinator.loginStaff(input)).rejects.toMatchObject({ code: 'logoutRequired' });
  const release = f.boundary.enter({ operation: 'write', authenticated: true, skipAuthenticationRecovery: false }, true);
  await expect(f.coordinator.logout()).rejects.toMatchObject({ code: 'busy' });
  release(); await f.coordinator.logout();
  expect(f.services.logout).toHaveBeenCalledExactlyOnceWith('customer', expect.any(AbortSignal));
});
test('logout failure retains established actor and allows confirmed retry', async () => {
  const f = fixture({ actor: 'staff' }); await f.start();
  f.services.logout.mockRejectedValueOnce(new ApiError('network'));
  await expect(f.coordinator.logout()).rejects.toMatchObject({ kind: 'network' });
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'staff', reason: 'logoutUnconfirmed', pending: false });
  await f.coordinator.logout();
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
  expect(f.hint()).toBeUndefined();
});
test('confirmed logout clears private state and still succeeds if anonymous proof is unavailable', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  const before = f.coordinator.getSnapshot().generation;
  f.services.logout.mockImplementation(async () => { f.server.actor = undefined; f.services.proof.mockRejectedValueOnce(new ApiError('network')); return 'id'; });
  await f.coordinator.logout();
  expect(f.coordinator.getSnapshot()).toMatchObject({ status: 'anonymous', actor: null, logoutRequired: false });
  expect(f.coordinator.getSnapshot().generation).toBeGreaterThan(before);
  expect(f.platform.publish).toHaveBeenCalledWith('changed');
});
test('cross-tab invalidation drops old identity and re-probes, while uncertainty never auto-refreshes', async () => {
  const f = fixture({ actor: 'customer' }); await f.start();
  f.server.actor = undefined; f.platform.writeHint(undefined); f.receive('changed');
  await f.coordinator.retryBootstrap();
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
  f.receive('uncertain');
  expect(f.coordinator.getSnapshot().status).toBe('unavailable');
  expect(f.services.refresh).not.toHaveBeenCalled();
});
test('StrictMode subscribe/unsubscribe/remount does not duplicate bootstrap or lose subscribers', async () => {
  const f = fixture();
  const first = f.coordinator.start(); first();
  const second = f.coordinator.start(); stops.push(second);
  await f.coordinator.retryBootstrap();
  expect(f.services.customerProfile).toHaveBeenCalledTimes(1);
  expect(f.services.staffProfile).toHaveBeenCalledTimes(1);
});
test('a late old profile cannot restore identity after cross-tab logout', async () => {
  const f = fixture(); const gate = deferred<typeof customer>();
  f.services.customerProfile.mockImplementationOnce(async () => gate.promise);
  stops.push(f.coordinator.start());
  f.receive('changed');
  await f.coordinator.retryBootstrap();
  gate.resolve(customer); await Promise.resolve();
  expect(f.coordinator.getSnapshot().status).toBe('anonymous');
});
