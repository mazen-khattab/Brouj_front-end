import { StrictMode, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthContext } from '../../src/Context/AuthContext';
import type { AuthValue } from '../../src/Context/AuthContext';
import { RealtimeProvider } from '../../src/Context/RealtimeProvider';
import { RealtimeContext } from '../../src/Context/RealtimeContext';
import { AccountDataProvider } from '../../src/Context/AccountDataProvider';
import type { AccountData } from '../../src/Context/AccountDataContext';
import { useAccountData } from '../../src/Hooks/useAccount';
import { useRealtimeReload } from '../../src/Hooks/useRealtimeReload';
import { createDisabledRealtimeAdapter } from '../../src/Realtime/disabledAdapter';
import { createRealtimeSession } from '../../src/Realtime/session';
import { createReloadQueue } from '../../src/Realtime/reloadQueue';
import { createFakeRealtimeAdapter } from '../fixtures/fakeRealtimeAdapter';
import type { RealtimeFeature } from '../../src/Realtime/types';
import { ReservationsAdminProvider } from '../../src/Context/ReservationsAdminProvider';
import { useReservationsAdmin } from '../../src/Context/ReservationsAdminContext';
import { OrdersAdminProvider } from '../../src/Context/OrdersAdminProvider';
import { useOrdersAdmin } from '../../src/Context/OrdersAdminContext';
import { TimePlanProvider } from '../../src/Context/TimePlanProvider';
import { useTimePlan } from '../../src/Context/TimePlanContext';
import { sessionBoundary } from '../../src/Security/sessionBoundary';
import * as reservations from '../../src/Services/Reservations';
import * as orders from '../../src/Services/Orders';
import * as plans from '../../src/Services/TimePlans';
import * as projects from '../../src/Services/Projects';
import { catalogueIds, catalogueProject } from '../browser/catalogueFixtures';
import { planningPlan } from '../browser/planningFixtures';
import type { OrderDto, ReservationDto, PaginationResult } from '../../src/Types/contracts';
import { ApiError } from '../../src/Types/failures';

const id = catalogueIds.project;
const otherId = '99999999-0000-4000-8000-000000000001';
const staff: AuthValue = {
  status: 'staff', actor: 'staff', role: 1,
  profile: { id, name: 'Synthetic staff', email: 'staff@example.test', phone: '01000000000', role: 1, deletedAt: null },
  generation: 1, pending: false, automaticRefresh: true, logoutRequired: true,
  loginCustomer: vi.fn(), registerCustomer: vi.fn(), loginStaff: vi.fn(), logout: vi.fn(), retryBootstrap: vi.fn(), reloadIdentity: vi.fn(),
};
const customer: AuthValue = {
  ...staff, status: 'customer', actor: 'customer',
  profile: { id, fName: 'Synthetic', lName: 'Customer', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' },
};
const anonymous: AuthValue = { ...staff, status: 'anonymous', actor: null, generation: 2, logoutRequired: false };
const reservation: ReservationDto = {
  id, unitId: id, number: 'R-SYNTHETIC', unitNumber: 'A-1', projectName: 'Supplied name', status: 0,
  reservationDate: '2026-10-29T12:00:00Z', cancelledAt: null, orderId: null,
};
const order: OrderDto = {
  id, reservationId: id, unitId: id, number: 'O-SYNTHETIC', unitNumber: 'A-1', projectName: 'Supplied name',
  status: 0, totalPrice: 4321.25, completedAt: null,
};

function page<T>(record: T): PaginationResult<T> {
  return { items: [record], pageNumber: 2, pageSize: 1, totalCount: 3, totalPages: 3 };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function emit(fake: ReturnType<typeof createFakeRealtimeAdapter>, feature: RealtimeFeature, resourceId?: string) {
  await act(async () => { fake.emit(resourceId ? { feature, resourceId } : { feature }); });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('disabled adapter performs no network, schedules no timers and never claims a connection', async () => {
  const fetch = vi.fn();
  const socket = vi.fn();
  const timer = vi.spyOn(globalThis, 'setTimeout');
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('WebSocket', socket);
  vi.stubGlobal('EventSource', socket);
  const adapter = createDisabledRealtimeAdapter();
  const event = vi.fn();
  const status = vi.fn();
  const offEvent = adapter.subscribeEvents(event);
  const offStatus = adapter.subscribeStatus(status);
  await adapter.start();
  await adapter.stop();
  offEvent();
  offStatus();
  expect(adapter.getStatus()).toBe('disabled');
  expect([fetch, socket, timer, event, status].every((mock) => mock.mock.calls.length === 0)).toBe(true);
});

test('fake adapter has explicit start/stop and unsubscribe contracts', () => {
  const fake = createFakeRealtimeAdapter();
  const event = vi.fn();
  const status = vi.fn();
  const offEvent = fake.adapter.subscribeEvents(event);
  const offStatus = fake.adapter.subscribeStatus(status);
  fake.adapter.start();
  fake.emit({ feature: 'orders' });
  expect(event).toHaveBeenCalledOnce();
  expect(status.mock.calls.flat()).toEqual(['connecting', 'connected']);
  offEvent();
  offStatus();
  fake.emit({ feature: 'orders' });
  fake.adapter.stop();
  expect(event).toHaveBeenCalledOnce();
  expect(fake.inspect()).toEqual({ starts: 1, stops: 1, eventListeners: 0, statusListeners: 0 });
});

test('session resynchronizes once after reconnect and rejects captured callbacks after cleanup/restart', () => {
  const fake = createFakeRealtimeAdapter();
  const session = createRealtimeSession(fake.adapter, () => true);
  const event = vi.fn();
  const status = vi.fn();
  const offEvent = session.subscribeEvents(event);
  const offStatus = session.subscribeStatus(status);
  const stop = session.start();
  expect(event).not.toHaveBeenCalled();
  fake.setStatus('reconnecting');
  fake.setStatus('connected');
  fake.setStatus('connected');
  expect(event.mock.calls.flat()).toEqual([{ feature: 'reservations' }, { feature: 'orders' }, { feature: 'timePlan' }]);
  const stale = fake.captureEvents()[0]!;
  const staleStatus = fake.captureStatuses()[0]!;
  stop();
  const stopAgain = session.start();
  stale({ feature: 'orders' });
  staleStatus('reconnecting');
  expect(session.getStatus()).toBe('connected');
  expect(event).toHaveBeenCalledTimes(3);
  offEvent();
  offStatus();
  fake.emit({ feature: 'orders' });
  expect(event).toHaveBeenCalledTimes(3);
  stopAgain();
  expect(fake.inspect().eventListeners).toBe(0);
});

test('session contains synchronous/async start and stop failures without leaking subscriptions', async () => {
  for (const asynchronous of [false, true]) {
    const fake = createFakeRealtimeAdapter();
    const fail = () => {
      if (asynchronous) {
        return Promise.reject(new Error('Synthetic transport failure'));
      }
      throw new Error('Synthetic transport failure');
    };
    fake.adapter.start = fail;
    fake.adapter.stop = fail;
    const session = createRealtimeSession(fake.adapter, () => true);
    const stop = session.start();
    await Promise.resolve();
    expect(session.getStatus()).toBe('disconnected');
    stop();
    await Promise.resolve();
    expect(fake.inspect().eventListeners).toBe(0);
  }
});

test('queue coalesces a burst, retains one trailing reload, and discards obsolete queued work', async () => {
  const reload = vi.fn();
  const queue = createReloadQueue(reload);
  queue.request();
  queue.request();
  await Promise.resolve();
  expect(reload).not.toHaveBeenCalled();
  queue.setLoading(false);
  await Promise.resolve();
  expect(reload).toHaveBeenCalledOnce();
  queue.setLoading(true);
  for (let count = 0; count < 20; count += 1) {
    queue.request();
  }
  await Promise.resolve();
  expect(reload).toHaveBeenCalledOnce();
  queue.setLoading(false);
  await Promise.resolve();
  expect(reload).toHaveBeenCalledTimes(2);
  queue.setLoading(false);
  queue.request();
  queue.dispose();
  await Promise.resolve();
  expect(reload).toHaveBeenCalledTimes(2);
});

test('fast awaitable reads release the queue even if React never paints loading; rejected reads permit later retries', async () => {
  const reload = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue(null);
  const queue = createReloadQueue(reload);
  queue.setLoading(false);
  for (let count = 1; count <= 3; count += 1) {
    queue.request();
    await act(async () => {});
    expect(reload).toHaveBeenCalledTimes(count);
  }
  queue.dispose();
});

test('a completed older read cannot release the lock held by the next pending read', async () => {
  const first = deferred<void>();
  const second = deferred<void>();
  const reload = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(undefined);
  const queue = createReloadQueue(reload);
  queue.setLoading(false);
  queue.request();
  await Promise.resolve();
  queue.setLoading(true);
  queue.request();
  // The feature can paint its completed result before its awaiting caller settles.
  queue.setLoading(false);
  await Promise.resolve();
  expect(reload).toHaveBeenCalledTimes(2);
  await act(async () => { first.resolve(); });
  queue.request();
  await Promise.resolve();
  expect(reload).toHaveBeenCalledTimes(2);
  await act(async () => { second.resolve(); });
  expect(reload).toHaveBeenCalledTimes(3);
  queue.dispose();
});

test('StrictMode remount keeps one listener, unmount stops, and anonymous mode never starts the fake', async () => {
  const fake = createFakeRealtimeAdapter();
  const factory = vi.fn(() => fake.adapter);
  let identity: AuthValue = staff;
  function wrapper({ children }: { children: ReactNode }) {
    return <StrictMode><AuthContext value={identity}><RealtimeProvider adapterFactory={factory}>{children}</RealtimeProvider></AuthContext></StrictMode>;
  }
  const reload = vi.fn();
  const hook = renderHook(() => {
    const session = useContext(RealtimeContext)!;
    useRealtimeReload('orders', 'route', false, reload);
    return useSyncExternalStore(session.subscribeStatus, session.getStatus);
  }, { wrapper, reactStrictMode: true });
  expect(hook.result.current).toBe('connected');
  expect(fake.inspect()).toEqual({ starts: 2, stops: 1, eventListeners: 1, statusListeners: 1 });
  await emit(fake, 'orders');
  expect(reload).toHaveBeenCalledOnce();
  identity = anonymous;
  hook.rerender();
  expect(hook.result.current).toBe('disabled');
  expect(fake.inspect().stops).toBe(2);
  const starts = fake.inspect().starts;
  await emit(fake, 'orders');
  expect(reload).toHaveBeenCalledOnce();
  expect(fake.inspect().starts).toBe(starts);
  hook.unmount();
  expect(fake.inspect().eventListeners).toBe(0);
});

test.each([
  ['reservations', 'reservations'], ['reservation', 'reservations'], ['orders', 'orders'], ['order', 'orders'], ['plan', 'timePlan'],
] as const)('fake %s invalidation reloads the mounted customer context through its service with the current query/id', async (kind, feature) => {
  const reads = {
    reservations: vi.spyOn(reservations, 'getMyReservations').mockResolvedValue(page(reservation)),
    reservation: vi.spyOn(reservations, 'getReservationById').mockResolvedValue(reservation),
    orders: vi.spyOn(orders, 'getMyOrders').mockResolvedValue(page(order)),
    order: vi.spyOn(orders, 'getOrderById').mockResolvedValue(order),
    plan: vi.spyOn(plans, 'getProjectTimePlan').mockResolvedValue(planningPlan),
  };
  const read = reads[kind];
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={customer}><RealtimeProvider adapterFactory={factory}>
      <MemoryRouter initialEntries={['/?pageNumber=2&pageSize=1&status=0']}><AccountDataProvider kind={kind} id={id}>{children}</AccountDataProvider></MemoryRouter>
    </RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useAccountData, { wrapper });
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  const args = read.mock.calls[0]![0];
  await emit(fake, feature === 'orders' ? 'reservations' : 'orders', id);
  expect(read).toHaveBeenCalledOnce();
  if (kind === 'order' || kind === 'reservation' || kind === 'plan') {
    await emit(fake, feature, otherId);
    expect(read).toHaveBeenCalledOnce();
  }
  await emit(fake, feature, id);
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(2);
  expect(read.mock.calls[1]![0]).toEqual(args);
  await act(async () => { fake.setStatus('reconnecting'); fake.setStatus('connected'); fake.setStatus('connected'); });
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(3);
  hook.unmount();
  await emit(fake, feature);
  expect(read).toHaveBeenCalledTimes(3);
});

test('bursts during a pending customer read coalesce; hints cannot supply authoritative business values', async () => {
  const response = deferred<OrderDto>();
  const read = vi.spyOn(orders, 'getOrderById').mockReturnValueOnce(response.promise).mockResolvedValue({ ...order, totalPrice: 9000 });
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={customer}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <AccountDataProvider kind="order" id={id}>{children}</AccountDataProvider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useAccountData, { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledOnce());
  await act(async () => {
    for (let count = 0; count < 20; count += 1) {
      fake.emit(Object.assign({ feature: 'orders' as const, resourceId: id }, { totalPrice: 1, status: 3 }));
    }
  });
  expect(read).toHaveBeenCalledOnce();
  expect(hook.result.current.result.status).toBe('loading');
  await act(async () => { response.resolve(order); });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  expect(hook.result.current.result).toEqual({ status: 'success', data: { kind: 'order', value: { ...order, totalPrice: 9000 } } });
});

test('filter changes cancel obsolete reads, retain current filters and route remounts do not retain invalidations', async () => {
  const pending = deferred<PaginationResult<ReservationDto>>();
  const read = vi.spyOn(reservations, 'getMyReservations').mockReturnValueOnce(pending.promise).mockResolvedValue(page(reservation));
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  let mounted = true;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={customer}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      {mounted ? <AccountDataProvider kind="reservations">{children}</AccountDataProvider> : null}
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(() => ({ ...useAccountData(), navigate: useNavigate() }), { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledOnce());
  await emit(fake, 'reservations');
  const obsolete = read.mock.calls[0]![1]!.signal!;
  await act(async () => { hook.result.current.navigate('/?pageNumber=2&pageSize=1&status=1'); });
  expect(obsolete.aborted).toBe(true);
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  await act(async () => { pending.resolve(page({ ...reservation, number: 'Obsolete' })); });
  await emit(fake, 'reservations');
  expect(read.mock.calls.at(-1)![0]).toEqual({ query: { pageNumber: 2, pageSize: 1, status: 1 } });
  const before = read.mock.calls.length;
  mounted = false;
  hook.rerender();
  await emit(fake, 'reservations');
  expect(read).toHaveBeenCalledTimes(before);
  mounted = true;
  hook.rerender();
  await waitFor(() => expect(read).toHaveBeenCalledTimes(before + 1));
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  await emit(fake, 'reservations');
  expect(read).toHaveBeenCalledTimes(before + 2);
});

test('actor switch/logout rejects captured events, cancels old reads and never repopulates another actor', async () => {
  const pending = deferred<OrderDto>();
  const read = vi.spyOn(orders, 'getOrderById').mockReturnValueOnce(pending.promise).mockResolvedValue({ ...order, number: 'Current actor' });
  const first = createFakeRealtimeAdapter();
  const second = createFakeRealtimeAdapter();
  let identity: AuthValue = customer;
  const factory = () => identity.generation === 1 ? first.adapter : second.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={identity}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <AccountDataProvider kind="order" id={id}>{children}</AccountDataProvider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useAccountData, { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledOnce());
  const oldSignal = read.mock.calls[0]![1]!.signal!;
  const stale = first.captureEvents()[0]!;
  const staleStatus = first.captureStatuses()[0]!;
  identity = { ...customer, generation: 2, profile: { ...customer.profile, id: otherId } } as AuthValue;
  hook.rerender();
  expect(oldSignal.aborted).toBe(true);
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  await act(async () => { pending.resolve({ ...order, number: 'Old private record' }); stale({ feature: 'orders' }); staleStatus('connected'); });
  expect(read).toHaveBeenCalledTimes(2);
  expect(hook.result.current.result).toEqual({ status: 'success', data: { kind: 'order', value: { ...order, number: 'Current actor' } } });
  const secondStale = second.captureEvents()[0]!;
  identity = { ...anonymous, generation: 3 };
  hook.rerender();
  await act(async () => { secondStale({ feature: 'orders' }); });
  expect(hook.result.current.result.status).toBe('idle');
  expect(read).toHaveBeenCalledTimes(2);
  expect(first.inspect().stops).toBe(1);
  expect(second.inspect().stops).toBe(1);
});

test('generation invalidation blocks both transport callbacks and an already queued reload before React commits', async () => {
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  const stamp = vi.spyOn(sessionBoundary, 'stamp').mockReturnValue({ generation: 1, revision: 1 });
  const reload = vi.fn();
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={staff}><RealtimeProvider adapterFactory={factory}>{children}</RealtimeProvider></AuthContext>;
  }
  renderHook(() => useRealtimeReload('orders', 'route', false, reload), { wrapper });
  await act(async () => {
    fake.emit({ feature: 'orders' });
    stamp.mockReturnValue({ generation: 2, revision: 2 });
  });
  expect(reload).not.toHaveBeenCalled();
  await emit(fake, 'orders');
  expect(reload).not.toHaveBeenCalled();
});

test.each(['reservations', 'orders', 'timePlan'] as const)('staff %s context reloads through the current service, including reconnect', async (feature) => {
  const reservationRead = vi.spyOn(reservations, 'getReservations').mockResolvedValue(page(reservation));
  const orderRead = vi.spyOn(orders, 'getOrders').mockResolvedValue(page(order));
  const planRead = vi.spyOn(plans, 'getProjectTimePlan').mockResolvedValue({ ...planningPlan, projectId: id });
  vi.spyOn(projects, 'getProjectById').mockResolvedValue(catalogueProject);
  const read = feature === 'reservations' ? reservationRead : feature === 'orders' ? orderRead : planRead;
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  const Provider = feature === 'reservations' ? ReservationsAdminProvider : OrdersAdminProvider;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={staff}><RealtimeProvider adapterFactory={factory}><MemoryRouter initialEntries={['/?pageNumber=2&pageSize=1&status=0']}>
      {feature === 'timePlan' ? <TimePlanProvider projectId={id} scope="actor:plan">{children}</TimePlanProvider> : <Provider scope="actor:list" id={undefined}>{children}</Provider>}
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const useValue = feature === 'reservations' ? useReservationsAdmin : feature === 'orders' ? useOrdersAdmin : useTimePlan;
  const hook = renderHook(() => useValue().read.result, { wrapper });
  await waitFor(() => expect(hook.result.current.status).toBe('success'));
  await emit(fake, feature, id);
  await waitFor(() => expect(hook.result.current.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(2);
  expect(read.mock.calls[1]![0]).toEqual(read.mock.calls[0]![0]);
  await act(async () => { fake.setStatus('disconnected'); fake.setStatus('connected'); });
  await waitFor(() => expect(hook.result.current.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(3);
});

test('failed staff reload keeps the safe error state and a later hint can retry without replaying a mutation', async () => {
  const read = vi.spyOn(orders, 'getOrders').mockResolvedValueOnce(page(order)).mockRejectedValueOnce(new ApiError('network')).mockResolvedValue(page(order));
  const write = vi.spyOn(orders, 'completeInitiativeOrder');
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={staff}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <OrdersAdminProvider scope="actor:list" id={undefined}>{children}</OrdersAdminProvider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useOrdersAdmin, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe('success'));
  await emit(fake, 'orders');
  await waitFor(() => expect(hook.result.current.read.result.status).toBe('error'));
  await emit(fake, 'orders');
  await waitFor(() => expect(hook.result.current.read.result.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(3);
  expect(write).not.toHaveBeenCalled();
});

test('profile readers have no real-time feature subscription', async () => {
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  const reload = vi.fn();
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={customer}><RealtimeProvider adapterFactory={factory}>{children}</RealtimeProvider></AuthContext>;
  }
  renderHook(() => useRealtimeReload(undefined, 'profile' satisfies AccountData['kind'], false, reload), { wrapper });
  await emit(fake, 'orders');
  expect(reload).not.toHaveBeenCalled();
});

test.each(['reservations', 'orders'] as const)('staff %s detail ignores other IDs and reloads the same record', async (feature) => {
  const reservationRead = vi.spyOn(reservations, 'getReservationDetails').mockResolvedValue(reservation);
  const orderRead = vi.spyOn(orders, 'getOrderById').mockResolvedValue(order);
  const read = feature === 'reservations' ? reservationRead : orderRead;
  const Provider = feature === 'reservations' ? ReservationsAdminProvider : OrdersAdminProvider;
  const useValue = feature === 'reservations' ? useReservationsAdmin : useOrdersAdmin;
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={staff}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <Provider scope="actor:detail" id={id}>{children}</Provider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(() => useValue().read.result, { wrapper });
  await waitFor(() => expect(hook.result.current.status).toBe('success'));
  await emit(fake, feature, otherId);
  expect(read).toHaveBeenCalledOnce();
  await emit(fake, feature, id.toUpperCase());
  await waitFor(() => expect(hook.result.current.status).toBe('success'));
  expect(read).toHaveBeenCalledTimes(2);
  expect(read.mock.calls.at(-1)![0]).toEqual({ id });
});

test('staff hints while a read is pending keep one trailing read without aborting the current request', async () => {
  const response = deferred<PaginationResult<OrderDto>>();
  const read = vi.spyOn(orders, 'getOrders').mockResolvedValueOnce(page(order)).mockReturnValueOnce(response.promise).mockResolvedValue(page(order));
  const fake = createFakeRealtimeAdapter();
  const factory = () => fake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={staff}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <OrdersAdminProvider scope="actor:list" id={undefined}>{children}</OrdersAdminProvider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useOrdersAdmin, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe('success'));
  await emit(fake, 'orders');
  const current = read.mock.calls[1]![1]!.signal!;
  for (let count = 0; count < 10; count += 1) {
    await emit(fake, 'orders');
  }
  expect(current.aborted).toBe(false);
  expect(read).toHaveBeenCalledTimes(2);
  await act(async () => { response.resolve(page(order)); });
  await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(hook.result.current.read.result.status).toBe('success'));
});

test('customer-to-staff switch discards old pending plan data and old reconnect events', async () => {
  const pending = deferred<typeof planningPlan>();
  const read = vi.spyOn(plans, 'getProjectTimePlan').mockReturnValueOnce(pending.promise).mockResolvedValue({ ...planningPlan, name: 'Staff authoritative plan' });
  const customerFake = createFakeRealtimeAdapter();
  const staffFake = createFakeRealtimeAdapter();
  let identity: AuthValue = customer;
  const factory = () => identity.actor === 'customer' ? customerFake.adapter : staffFake.adapter;
  function wrapper({ children }: { children: ReactNode }) {
    return <AuthContext value={identity}><RealtimeProvider adapterFactory={factory}><MemoryRouter>
      <AccountDataProvider kind="plan" id={id}>{children}</AccountDataProvider>
    </MemoryRouter></RealtimeProvider></AuthContext>;
  }
  const hook = renderHook(useAccountData, { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalledOnce());
  const oldSignal = read.mock.calls[0]![1]!.signal!;
  const staleStatus = customerFake.captureStatuses()[0]!;
  identity = { ...staff, generation: 2 };
  hook.rerender();
  expect(oldSignal.aborted).toBe(true);
  await waitFor(() => expect(hook.result.current.result.status).toBe('success'));
  await act(async () => {
    staleStatus('reconnecting');
    staleStatus('connected');
    pending.resolve({ ...planningPlan, name: 'Old customer-only snapshot' });
  });
  expect(read).toHaveBeenCalledTimes(2);
  expect(hook.result.current.result).toEqual({ status: 'success', data: { kind: 'plan', value: { ...planningPlan, name: 'Staff authoritative plan' } } });
});
