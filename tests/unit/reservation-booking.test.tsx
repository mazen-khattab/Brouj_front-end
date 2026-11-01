import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { bookingInput, bookingValues, validateBooking } from '../../src/Account/reservationBooking';
import { useReservationBookingController } from '../../src/Hooks/useReservationBooking';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { ApiError } from '../../src/Types/failures';
import * as reservations from '../../src/Services/Reservations';
import { sessionBoundary } from '../../src/Security/sessionBoundary';

vi.mock('../../src/Services/Reservations', () => ({ createReservation: vi.fn() }));
const id = '50000000-0000-4000-8000-000000000001';
const values = {
  ...bookingValues(), fullName: '  First Second Third Family  ', phone: '01000000000', identityNumber: '00000000000001',
  email: ' guest@example.test ', password: ' guest password ', ageGroup: '28-35', placeOfResidence: ' Cairo ',
  preferredFinancialBracket: '500000', preferredRepaymentPeriod: '9',
};
const body = bookingInput(id, values, false);
function customer(): AuthValue {
  return {
    status: 'customer', actor: 'customer', generation: 1, pending: false, automaticRefresh: true, logoutRequired: true,
    profile: { id, fName: 'First', lName: 'Second Third Family', phone: values.phone, identityNumber: values.identityNumber, email: 'profile@example.test' },
    registerCustomer: vi.fn(), loginCustomer: vi.fn(), loginStaff: vi.fn(), logout: vi.fn(), retryBootstrap: vi.fn(), reloadIdentity: vi.fn(),
  };
}
function wrapper(auth: AuthValue) {
  return ({ children }: { children: ReactNode }) => <AuthContext value={auth}>{children}</AuthContext>;
}
afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks(); });

test('booking validates exact options, four-part names and numeric identity without using profile preferences', () => {
  expect(validateBooking(values, true)).toEqual([]);
  expect(validateBooking({ ...values, email: '', password: '' }, false)).toEqual([]);
  expect(validateBooking({ ...values, fullName: 'Only Two', identityNumber: '١'.repeat(14), ageGroup: '20-30', preferredFinancialBracket: '1', preferredRepaymentPeriod: '18' }, false).map((issue) => issue.field))
    .toEqual(['fullName', 'identityNumber', 'ageGroup', 'preferredFinancialBracket', 'preferredRepaymentPeriod']);
  const auth = customer();
  const initial = bookingValues(auth.actor === 'customer' ? auth.profile : undefined);
  expect(initial.ageGroup).toBe('');
  expect(initial.placeOfResidence).toBe('');
});

test('request body contains numeric EGP/month preferences and guest-only unmodified credentials', () => {
  expect(body).toEqual({ unitId: id, fullName: 'First Second Third Family', phone: values.phone, identityNumber: '00000000000001', ageGroup: '28-35', placeOfResidence: 'Cairo', preferredFinancialBracket: 500000, preferredRepaymentPeriod: 9 });
  expect(bookingInput(id, values, true)).toEqual({ ...body, email: 'guest@example.test', password: ' guest password ' });
});

test('complete reservation payload is forwarded once and uncertain outcomes block replay', async () => {
  vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 1, revision: 0 });
  let reject!: (error: Error) => void;
  vi.mocked(reservations.createReservation).mockReturnValue(new Promise((_, no) => { reject = no; }));
  const hook = renderHook(useReservationBookingController, { wrapper: wrapper(customer()) });
  let work!: ReturnType<typeof hook.result.current.submit>;
  await act(async () => { work = hook.result.current.submit(body, vi.fn()); await hook.result.current.submit(body, vi.fn()); });
  expect(reservations.createReservation).toHaveBeenCalledExactlyOnceWith({ body }, { signal: expect.any(AbortSignal) });
  await act(async () => { reject(new ApiError('network')); await work; });
  expect(hook.result.current.uncertain).toBe(true);
  await act(async () => { await hook.result.current.submit(body, vi.fn()); });
  expect(reservations.createReservation).toHaveBeenCalledTimes(1);
});

test('guest registration precedes reservation, and a rejected registration cannot reserve', async () => {
  const base = customer();
  const register = vi.fn().mockRejectedValueOnce(new ApiError('transport', { status: 409 })).mockImplementation(async () => {
    vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 2, revision: 0 });
  });
  const guest: AuthValue = { ...base, status: 'anonymous', actor: null, logoutRequired: false, registerCustomer: register };
  const hook = renderHook(useReservationBookingController, { wrapper: wrapper(guest) });
  const clear = vi.fn();
  await act(async () => { await hook.result.current.submit(bookingInput(id, values, true), clear); });
  expect(reservations.createReservation).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
  expect(hook.result.current.registrationFailure).toBe(true);
  vi.mocked(reservations.createReservation).mockResolvedValue(id);
  await act(async () => { await hook.result.current.submit(bookingInput(id, values, true), clear); });
  expect(register).toHaveBeenLastCalledWith({ fName: 'First', lName: 'Second Third Family', phone: values.phone, identityNumber: values.identityNumber, email: 'guest@example.test', password: values.password }, expect.any(AbortSignal));
  expect(clear).toHaveBeenCalledOnce();
  expect(reservations.createReservation).toHaveBeenCalledOnce();
});

test('unmount aborts an in-flight reservation and cannot acknowledge a late success', async () => {
  vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 1, revision: 0 });
  let resolve!: (value: string) => void;
  vi.mocked(reservations.createReservation).mockReturnValue(new Promise((yes) => { resolve = yes; }));
  const hook = renderHook(useReservationBookingController, { wrapper: wrapper(customer()) });
  let work!: ReturnType<typeof hook.result.current.submit>;
  act(() => { work = hook.result.current.submit(body, vi.fn()); });
  const signal = vi.mocked(reservations.createReservation).mock.calls[0]![1]!.signal!;
  hook.unmount();
  expect(signal.aborted).toBe(true);
  resolve(id);
  expect(await work).toBeUndefined();
});

test('a malformed success remains uncertain instead of returning a reservation URL', async () => {
  vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 1, revision: 0 });
  vi.mocked(reservations.createReservation).mockResolvedValue('bad-id');
  const hook = renderHook(useReservationBookingController, { wrapper: wrapper(customer()) });
  let result: Awaited<ReturnType<typeof hook.result.current.submit>>;
  await act(async () => { result = await hook.result.current.submit(body, vi.fn()); });
  expect(result!).not.toHaveProperty('id');
  expect(hook.result.current.uncertain).toBe(true);
});

test('an identity change aborts the previous customer request and rejects its late result', async () => {
  let auth = customer();
  let generation = 1;
  vi.spyOn(sessionBoundary, 'stamp').mockImplementation(() => ({ generation, revision: 0 }));
  let resolve!: (value: string) => void;
  vi.mocked(reservations.createReservation).mockReturnValue(new Promise((yes) => { resolve = yes; }));
  const hook = renderHook(useReservationBookingController, {
    wrapper: ({ children }: { children: ReactNode }) => <AuthContext value={auth}>{children}</AuthContext>,
  });
  let work!: ReturnType<typeof hook.result.current.submit>;
  act(() => { work = hook.result.current.submit(body, vi.fn()); });
  const signal = vi.mocked(reservations.createReservation).mock.calls[0]![1]!.signal!;
  generation = 2;
  auth = { ...customer(), generation };
  hook.rerender();
  expect(signal.aborted).toBe(true);
  await act(async () => { resolve(id); expect(await work).toBeUndefined(); });
  expect(hook.result.current.failure).toBeUndefined();
  expect(hook.result.current.pending).toBe(false);
});

