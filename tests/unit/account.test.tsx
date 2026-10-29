import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ApiError } from '../../src/Types/failures';
import { canCancel, uncertainWrite, validatePassword, validateProfile } from '../../src/Account/policy';
import type { ReservationDto } from '../../src/Types/contracts';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { CustomerActionProvider } from '../../src/Context/CustomerActionProvider';
import { useCustomerAction } from '../../src/Hooks/useAccount';
import * as profile from '../../src/Services/CustomerProfile';
import * as reservations from '../../src/Services/Reservations';
import { sessionBoundary } from '../../src/Security/sessionBoundary';

vi.mock('../../src/Services/CustomerProfile', () => ({ updateCustomerProfile: vi.fn(), changeCustomerPassword: vi.fn() }));
vi.mock('../../src/Services/Reservations', () => ({ createReservation: vi.fn(), cancelReservation: vi.fn() }));
const id = '50000000-0000-4000-8000-000000000001';
const fields = { fName: 'Fixture', lName: 'Customer', email: 'fixture@example.test', phone: '01000000000', identityNumber: '10000000000000' };
const auth: AuthValue = { status: 'customer', actor: 'customer', profile: { ...fields, id }, generation: 1, pending: false, automaticRefresh: true, logoutRequired: true,
  loginCustomer: vi.fn(), loginStaff: vi.fn(), registerCustomer: vi.fn(), logout: vi.fn(), retryBootstrap: vi.fn(), reloadIdentity: vi.fn() };
function wrapper({ children }: { children: ReactNode }) { return <AuthContext value={auth}><CustomerActionProvider>{children}</CustomerActionProvider></AuthContext>; }
afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); });

test('profile validation matches the five approved fields and preserves numeric identity rules', () => {
  expect(validateProfile(fields)).toEqual([]);
  expect(validateProfile({ ...fields, identityNumber: '١'.repeat(14), phone: '+201000000000', email: 'invalid', fName: 'x'.repeat(101) }).map((item) => item.field)).toEqual(['fName', 'email', 'phone', 'identityNumber']);
  expect(validatePassword({ currentPassword: 'x', newPassword: '12345678' })).toEqual([]);
  expect(validatePassword({ currentPassword: '', newPassword: 'short' }).map((item) => item.field)).toEqual(['currentPassword', 'newPassword']);
});
test.each([400, 401, 403, 404, 409, 429])('a definitive %s does not create an uncertain mutation state', (status) => expect(uncertainWrite(new ApiError('transport', { status }))).toBe(false));
test.each([undefined, 200, 500, 503])('an absent/malformed success/server failure %s remains uncertain', (status) => expect(uncertainWrite(new ApiError('transport', { status }))).toBe(true));
test.each([
  [0, null, true], [0, id, false], [1, null, false], [2, null, false],
])('cancellation eligibility follows status %s and order %s', (status, orderId, eligible) => {
  expect(canCancel({ status, orderId } as ReservationDto)).toBe(eligible);
});
test('profile dispatch strips unrelated identity/actor fields', async () => {
  vi.mocked(profile.updateCustomerProfile).mockResolvedValue(id);
  const hook = renderHook(useCustomerAction, { wrapper });
  await act(async () => { await hook.result.current.updateProfile({ ...fields, id, actorId: id } as typeof fields); });
  expect(profile.updateCustomerProfile).toHaveBeenCalledWith({ body: fields }, { signal: expect.any(AbortSignal) });
});
test('passwords are unmodified and business credential failures cannot refresh/replay', async () => {
  vi.mocked(profile.changeCustomerPassword).mockRejectedValue(new ApiError('feature', { status: 401, featureCode: 1 }));
  const hook = renderHook(useCustomerAction, { wrapper });
  await act(async () => { await hook.result.current.changePassword({ currentPassword: ' old password ', newPassword: ' new password ' }); });
  expect(profile.changeCustomerPassword).toHaveBeenCalledExactlyOnceWith({ body: { currentPassword: ' old password ', newPassword: ' new password ' } }, { signal: expect.any(AbortSignal), skipAuthenticationRecovery: true });
  expect(hook.result.current.uncertain).toBe(false);
});
test('reservation dispatch uses unitId only and rejects duplicate synchronous submits', async () => {
  let complete!: (id: string) => void;
  vi.mocked(reservations.createReservation).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  const hook = renderHook(useCustomerAction, { wrapper });
  let first!: Promise<unknown>;
  await act(async () => { first = hook.result.current.create(id); await hook.result.current.create(id); });
  expect(reservations.createReservation).toHaveBeenCalledExactlyOnceWith({ body: { unitId: id } }, { signal: expect.any(AbortSignal) });
  await act(async () => { complete(id); await first; });
  expect(hook.result.current.succeeded).toBe(true);
});
test('an uncertain reservation write stays blocked without an automatic retry', async () => {
  vi.mocked(reservations.createReservation).mockRejectedValue(new ApiError('network'));
  const hook = renderHook(useCustomerAction, { wrapper });
  await act(async () => { await hook.result.current.create(id); });
  expect(hook.result.current.uncertain).toBe(true);
  await act(async () => { await hook.result.current.create(id); });
  expect(reservations.createReservation).toHaveBeenCalledTimes(1);
});
test('a malformed created identifier remains uncertain instead of navigating to fabricated detail', async () => {
  vi.mocked(reservations.createReservation).mockResolvedValue('not-an-id');
  const hook = renderHook(useCustomerAction, { wrapper });
  await act(async () => { await hook.result.current.create(id); });
  expect(hook.result.current.uncertain).toBe(true);
  expect(hook.result.current.succeeded).toBeUndefined();
});
test('unmount aborts a private mutation and rejects its late success', async () => {
  let complete!: (id: string) => void;
  vi.mocked(reservations.cancelReservation).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  const hook = renderHook(useCustomerAction, { wrapper });
  let work!: ReturnType<typeof hook.result.current.cancel>;
  act(() => { work = hook.result.current.cancel(id); });
  const signal = vi.mocked(reservations.cancelReservation).mock.calls[0]![1]!.signal!;
  hook.unmount(); expect(signal.aborted).toBe(true);
  complete(id); expect((await work).ok).toBe(false);
});
test('a stale actor generation cannot dispatch a write or acknowledge a late result', async () => {
  vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 2, revision: 0 });
  const hook = renderHook(useCustomerAction, { wrapper });
  await act(async () => { await hook.result.current.create(id); });
  expect(reservations.createReservation).not.toHaveBeenCalled(); expect(hook.result.current.isCurrent()).toBe(false);
});
