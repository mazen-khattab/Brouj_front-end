import { StrictMode, useRef } from "react";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { AuthContext } from "../../src/Context/AuthContext";
import type { AuthValue } from "../../src/Context/AuthContext";
import { canComplete, canConvert, customerOperation, readOperationsQuery, writeOperationsQuery } from "../../src/AdminOperations/policy";
import { useStaffOperation } from "../../src/Hooks/useStaffOperation";
import { useStaffRead } from "../../src/Hooks/useStaffRead";
import { useCustomerOperations } from "../../src/Context/CustomerOperationsContext";
import { CustomerOperationsProvider } from "../../src/Context/CustomerOperationsProvider";
import { useReservationsAdmin } from "../../src/Context/ReservationsAdminContext";
import { ReservationsAdminProvider } from "../../src/Context/ReservationsAdminProvider";
import { useOrdersAdmin } from "../../src/Context/OrdersAdminContext";
import { OrdersAdminProvider } from "../../src/Context/OrdersAdminProvider";
import { sessionBoundary } from "../../src/Security/sessionBoundary";
import { ApiError } from "../../src/Types/failures";
import * as customers from "../../src/Services/CustomersAdmin";
import * as reservations from "../../src/Services/Reservations";
import * as orders from "../../src/Services/Orders";
import type { CustomerDto, OrderDto, ReservationDto } from "../../src/Types/contracts";

const id = "10000000-0000-4000-8000-000000000001";
const orderId = "20000000-0000-4000-8000-000000000001";
const auth: AuthValue = {
  status: "staff",
  actor: "staff",
  role: 1,
  profile: { id, name: "Staff", email: "staff@example.test", phone: "01000000000", role: 1, deletedAt: null },
  generation: 1,
  pending: false,
  automaticRefresh: true,
  logoutRequired: true,
  loginCustomer: vi.fn(),
  loginStaff: vi.fn(),
  registerCustomer: vi.fn(),
  logout: vi.fn(),
  retryBootstrap: vi.fn(),
  reloadIdentity: vi.fn(),
};
const customer: CustomerDto = { id, fName: "Synthetic", lName: "Customer", email: "fixture@example.test", phone: "01000000000", deletedAt: null };
const reservation: ReservationDto = {
  id,
  unitId: id,
  number: "R-TEST",
  unitNumber: "A-1",
  projectName: "Supplied project",
  status: 0,
  reservationDate: "2026-10-29T10:00:00Z",
  cancelledAt: null,
  orderId: null,
};
const order: OrderDto = {
  id: orderId,
  reservationId: id,
  unitId: id,
  number: "O-TEST",
  unitNumber: "A-1",
  projectName: "Supplied project",
  status: 0,
  totalPrice: 4321.25,
  completedAt: null,
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthContext value={auth}>{children}</AuthContext>;
}

function useActions() {
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const first = useStaffOperation("first", gate);
  const second = useStaffOperation("second", gate);
  return { first, second };
}

afterEach(() => vi.restoreAllMocks());

test.each([
  [0, null, true],
  [0, orderId, false],
  [1, null, false],
  [2, null, false],
])("conversion eligibility follows reservation state %s and its linked order", (status, linked, expected) => {
  expect(canConvert({ ...reservation, status: status as 0 | 1 | 2, orderId: linked as string | null })).toBe(expected);
});

test.each([0, 1, 2, 3])("only Pending orders offer the initiative completion flow (%s)", (status) =>
  expect(canComplete({ ...order, status: status as 0 | 1 | 2 | 3 })).toBe(status === 0),
);

test("customer operation and approved queries preserve the real soft-delete and filter contracts", () => {
  expect(customerOperation(customer)).toBe("deletion");
  expect(customerOperation({ ...customer, deletedAt: "2026-10-29T10:00:00Z" })).toBe("restoration");
  const input = new URLSearchParams("pageNumber=2&pageSize=100&status=3&isDeleted=true&dateFrom=2020&search=private@example.test&extra=1");
  const customerQuery = readOperationsQuery(input, "customers");
  expect(customerQuery).toEqual({ pageNumber: 2, pageSize: 100, status: null, isDeleted: true });
  expect(writeOperationsQuery(customerQuery, "customers").toString()).toBe("pageNumber=2&pageSize=100&isDeleted=true");
  expect(readOperationsQuery(input, "reservations").status).toBeNull();
  expect(readOperationsQuery(input, "orders").status).toBe(3);
  expect(writeOperationsQuery(readOperationsQuery(input, "orders"), "orders").toString()).toBe("pageNumber=2&pageSize=100&status=3");
});

test("invalid query values fall back to bounded defaults and cannot carry unsupported filters", () => {
  expect(readOperationsQuery(new URLSearchParams("pageNumber=-1&pageSize=101&status=1.5&isDeleted=1"), "customers")).toEqual({
    pageNumber: 1,
    pageSize: 20,
    status: null,
    isDeleted: null,
  });
  expect(readOperationsQuery(new URLSearchParams("pageNumber=2147483648&pageSize=0&status=999"), "reservations")).toEqual({
    pageNumber: 1,
    pageSize: 20,
    status: null,
    isDeleted: null,
  });
});

test("related operations share a synchronous lock through the complete follow-up read", async () => {
  const hook = renderHook(useActions, { wrapper });
  let finish!: (id: string) => void;
  let finishRead!: () => void;
  const write = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finishRead = resolve;
      }),
  );
  const job = { id, write, refresh, reconcile: vi.fn() };
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = hook.result.current.first.run(job);
    await hook.result.current.first.run(job);
    await hook.result.current.second.run(job);
  });
  expect(write).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(id);
    await Promise.resolve();
  });
  expect(hook.result.current.first.pending).toBe(true);
  expect(hook.result.current.second.pending).toBe(false);
  await act(async () => {
    await hook.result.current.second.run(job);
    finishRead();
    await pending;
  });
  expect(write).toHaveBeenCalledTimes(1);
  expect(hook.result.current.first.succeeded).toBe(true);
});

test.each([403, 404, 409])("a definitive %s reconciles current data without replaying a write", async (status) => {
  const hook = renderHook(useActions, { wrapper });
  const write = vi.fn().mockRejectedValue(new ApiError("transport", { status }));
  const reconcile = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    await hook.result.current.first.run({ id, write, reconcile, refresh: vi.fn() });
  });
  expect(write).toHaveBeenCalledTimes(1);
  expect(reconcile).toHaveBeenCalledTimes(1);
  expect(hook.result.current.first.failure?.status).toBe(status);
  expect(hook.result.current.first.blocked).toBe(false);
});

test("429 remains explicit and manually retryable without a follow-up read or automatic write", async () => {
  const hook = renderHook(useActions, { wrapper });
  const write = vi.fn().mockRejectedValue(new ApiError("transport", { status: 429, retryAfter: 3 }));
  const reconcile = vi.fn();
  await act(async () => {
    await hook.result.current.first.run({ id, write, reconcile, refresh: vi.fn() });
  });
  expect(write).toHaveBeenCalledTimes(1);
  expect(reconcile).not.toHaveBeenCalled();
  expect(hook.result.current.first.failure?.retryAfter).toBe(3);
});

test("uncertain writes block related operations until an explicit successful reconciliation", async () => {
  const hook = renderHook(useActions, { wrapper });
  const write = vi.fn().mockRejectedValue(new ApiError("network"));
  const reconcile = vi.fn().mockRejectedValue(new ApiError("network"));
  const job = { id, write, reconcile, refresh: vi.fn() };
  await act(async () => {
    await hook.result.current.first.run(job);
    await hook.result.current.second.run(job);
  });
  expect(hook.result.current.first.uncertain).toBe(true);
  expect(write).toHaveBeenCalledTimes(1);
  await act(async () => {
    await hook.result.current.first.check();
  });
  expect(hook.result.current.first.blocked).toBe(true);
  reconcile.mockResolvedValue(undefined);
  await act(async () => {
    await hook.result.current.first.check();
  });
  expect(hook.result.current.first.blocked).toBe(false);
  expect(write).toHaveBeenCalledTimes(1);
});

test("an acknowledged write with a failed read checks the known returned ID instead of resending", async () => {
  const hook = renderHook(useActions, { wrapper });
  const write = vi.fn().mockResolvedValue(orderId);
  const refresh = vi.fn().mockRejectedValue(new ApiError("transport", { status: 503 }));
  await act(async () => {
    await hook.result.current.first.run({ id, write, refresh, reconcile: vi.fn() });
  });
  expect(hook.result.current.first.uncertain).toBe(true);
  refresh.mockResolvedValue(undefined);
  await act(async () => {
    await hook.result.current.first.check();
  });
  expect(refresh).toHaveBeenLastCalledWith(orderId, expect.any(AbortSignal));
  expect(write).toHaveBeenCalledTimes(1);
});

test("malformed returned IDs are uncertain and do not start authoritative reads", async () => {
  const hook = renderHook(useActions, { wrapper });
  const refresh = vi.fn();
  await act(async () => {
    await hook.result.current.first.run({ id, write: async () => "malformed", refresh, reconcile: vi.fn() });
  });
  expect(refresh).not.toHaveBeenCalled();
  expect(hook.result.current.first.blocked).toBe(true);
});

test("an identity generation change during a write discards its result before any follow-up read", async () => {
  const hook = renderHook(useActions, { wrapper });
  let finish!: (id: string) => void;
  const write = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const refresh = vi.fn();
  let pending!: Promise<unknown>;
  act(() => {
    pending = hook.result.current.first.run({ id, write, refresh, reconcile: vi.fn() });
  });
  vi.spyOn(sessionBoundary, "stamp").mockReturnValue({ generation: 2, revision: 0 });
  await act(async () => {
    finish(id);
    expect(await pending).toBeUndefined();
  });
  expect(refresh).not.toHaveBeenCalled();
  expect(hook.result.current.first.succeeded).toBe(false);
});

test("a permission failure on refresh discards the previous private DTO instead of keeping it in read state", async () => {
  const load = vi.fn().mockResolvedValue(customer);
  const hook = renderHook(() => useStaffRead("private", load), { wrapper });
  await waitFor(() => expect(hook.result.current.result.status).toBe("success"));
  load.mockRejectedValue(new ApiError("transport", { status: 403 }));
  await act(async () => {
    await expect(hook.result.current.reload()).rejects.toMatchObject({ status: 403 });
  });
  expect(hook.result.current.result).toMatchObject({ status: "error", failure: { status: 403 } });
  expect(hook.result.current.result).not.toHaveProperty("data");
});

test("an earlier reload handle refreshes the latest query after a blocked operation outlives its filters", async () => {
  const first = vi.fn(async () => "first");
  const second = vi.fn(async () => "second");
  const hook = renderHook(({ key, load }) => useStaffRead(key, load), { wrapper, initialProps: { key: "first-filter", load: first } });
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: "success", data: "first" }));
  const savedReload = hook.result.current.reload;
  hook.rerender({ key: "second-filter", load: second });
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: "success", data: "second" }));
  await act(async () => {
    await savedReload();
  });
  expect(hook.result.current.result).toEqual({ status: "success", data: "second" });
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(2);
});

test("unmount aborts a write and late actor-generation results cannot refresh or acknowledge", async () => {
  const hook = renderHook(useActions, { wrapper });
  let finish!: (id: string) => void;
  let signal!: AbortSignal;
  const write = vi.fn((value: AbortSignal) => {
    signal = value;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  });
  const refresh = vi.fn();
  let pending!: Promise<unknown>;
  act(() => {
    pending = hook.result.current.first.run({ id, write, refresh, reconcile: vi.fn() });
  });
  hook.unmount();
  expect(signal.aborted).toBe(true);
  finish(id);
  expect(await pending).toBeUndefined();
  expect(refresh).not.toHaveBeenCalled();
  const stale = renderHook(useActions, { wrapper });
  vi.spyOn(sessionBoundary, "stamp").mockReturnValue({ generation: 2, revision: 0 });
  await act(async () => {
    await stale.result.current.first.run({ id, write, refresh, reconcile: vi.fn() });
  });
  expect(write).toHaveBeenCalledTimes(1);
});

test("private reads suppress the StrictMode setup replay and reject a canceled or obsolete result", async () => {
  const initial = vi.fn().mockResolvedValue("initial");
  function strict({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <AuthContext value={auth}>{children}</AuthContext>
      </StrictMode>
    );
  }
  const hook = renderHook(({ key, load }) => useStaffRead(key, load), { wrapper: strict, initialProps: { key: "one", load: initial } });
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: "success", data: "initial" }));
  expect(initial).toHaveBeenCalledTimes(1);
  let finish!: (value: string) => void;
  const slow = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  hook.rerender({ key: "slow", load: slow });
  await waitFor(() => expect(slow).toHaveBeenCalledTimes(1));
  const fresh = vi.fn().mockResolvedValue("fresh");
  hook.rerender({ key: "fresh", load: fresh });
  await waitFor(() => expect(hook.result.current.result).toEqual({ status: "success", data: "fresh" }));
  await act(async () => {
    finish("obsolete");
  });
  expect(hook.result.current.result).toEqual({ status: "success", data: "fresh" });
});

test("customer list uses only approved fields and soft-delete/restore have separate bodyless states", async () => {
  let current = customer;
  const list = vi
    .spyOn(customers, "getCustomers")
    .mockImplementation(async () => ({ items: [current], pageNumber: 1, pageSize: 100, totalCount: 1, totalPages: 1 }));
  vi.spyOn(customers, "getCustomerById").mockImplementation(async () => current);
  const remove = vi.spyOn(customers, "softDeleteCustomer").mockImplementation(async () => {
    current = { ...customer, deletedAt: "2026-10-29T10:00:00Z" };
    return id;
  });
  const restore = vi.spyOn(customers, "restoreCustomer").mockImplementation(async () => {
    current = customer;
    return id;
  });
  function provider({ children }: { children: ReactNode }) {
    return (
      <AuthContext value={auth}>
        <MemoryRouter initialEntries={["/?pageSize=100&dateFrom=2020&extra=1"]}>
          <CustomerOperationsProvider id={undefined} scope="customer-list">
            {children}
          </CustomerOperationsProvider>
        </MemoryRouter>
      </AuthContext>
    );
  }
  const hook = renderHook(useCustomerOperations, { wrapper: provider });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  expect(list).toHaveBeenLastCalledWith({ query: { pageNumber: 1, pageSize: 100, isDeleted: null } }, { signal: expect.any(AbortSignal) });
  await act(async () => {
    await hook.result.current.remove(id);
  });
  expect(remove).toHaveBeenCalledExactlyOnceWith({ id }, { signal: expect.any(AbortSignal) });
  expect(hook.result.current.deletion.succeeded).toBe(true);
  await act(async () => {
    await hook.result.current.restore(id);
  });
  expect(restore).toHaveBeenCalledExactlyOnceWith({ id }, { signal: expect.any(AbortSignal) });
  expect(hook.result.current.restoration.succeeded).toBe(true);
  expect(hook.result.current.active).toBe("restoration");
});

test("conversion uses the staff reservation read and fetches the returned order without a supplied body", async () => {
  let current = reservation;
  const detail = vi.spyOn(reservations, "getReservationDetails").mockImplementation(async () => current);
  const mine = vi.spyOn(reservations, "getMyReservations");
  const convert = vi.spyOn(orders, "createOrderFromReservation").mockImplementation(async () => {
    current = { ...reservation, status: 2, orderId };
    return orderId;
  });
  const getOrder = vi.spyOn(orders, "getOrderById").mockResolvedValue(order);
  function provider({ children }: { children: ReactNode }) {
    return (
      <AuthContext value={auth}>
        <MemoryRouter>
          <ReservationsAdminProvider id={id} scope="reservation-detail">
            {children}
          </ReservationsAdminProvider>
        </MemoryRouter>
      </AuthContext>
    );
  }
  const hook = renderHook(useReservationsAdmin, { wrapper: provider });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => {
    await hook.result.current.convert(id);
  });
  expect(convert).toHaveBeenCalledExactlyOnceWith({ reservationId: id }, { signal: expect.any(AbortSignal) });
  expect(detail).toHaveBeenCalledTimes(2);
  expect(mine).not.toHaveBeenCalled();
  expect(getOrder).toHaveBeenCalledExactlyOnceWith({ id: orderId }, { signal: expect.any(AbortSignal) });
  expect(hook.result.current.conversion.succeeded).toBe(true);
});

test("completion re-reads the server order state and never supplies prices or statuses", async () => {
  let current = order;
  const get = vi.spyOn(orders, "getOrderById").mockImplementation(async () => current);
  const complete = vi.spyOn(orders, "completeInitiativeOrder").mockImplementation(async () => {
    current = { ...order, status: 2, completedAt: "2026-10-29T10:00:00Z" };
    return orderId;
  });
  function provider({ children }: { children: ReactNode }) {
    return (
      <AuthContext value={auth}>
        <MemoryRouter>
          <OrdersAdminProvider id={orderId} scope="order-detail">
            {children}
          </OrdersAdminProvider>
        </MemoryRouter>
      </AuthContext>
    );
  }
  const hook = renderHook(useOrdersAdmin, { wrapper: provider });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => {
    await hook.result.current.complete(orderId);
  });
  expect(complete).toHaveBeenCalledExactlyOnceWith({ id: orderId }, { signal: expect.any(AbortSignal) });
  expect(get).toHaveBeenCalledTimes(2);
  expect(hook.result.current.completion.succeeded).toBe(true);
});
