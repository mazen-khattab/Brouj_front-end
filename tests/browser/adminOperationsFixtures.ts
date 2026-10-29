import type { BrowserContext } from "@playwright/test";
import { routingServer } from "./routingFixtures";
import { sessionCors } from "./sessionFixtures";
import type { CustomerDto, OrderDto, ReservationDto } from "../../src/Types/contracts";

export const operationsIds = {
  customer: "a1000000-0000-4000-8000-000000000001",
  deletedCustomer: "a1000000-0000-4000-8000-000000000002",
  reservation: "b1000000-0000-4000-8000-000000000001",
  confirmed: "b1000000-0000-4000-8000-000000000002",
  cancelled: "b1000000-0000-4000-8000-000000000003",
  order: "c1000000-0000-4000-8000-000000000001",
  regular: "c1000000-0000-4000-8000-000000000002",
  completed: "c1000000-0000-4000-8000-000000000003",
  competitor: "c1000000-0000-4000-8000-000000000004",
  created: "c1000000-0000-4000-8000-000000000005",
  unit: "d1000000-0000-4000-8000-000000000001",
};
export const syntheticCustomer: CustomerDto = {
  id: operationsIds.customer,
  fName: "Synthetic",
  lName: "Customer",
  phone: "01000000000",
  email: "fixture-customer@example.test",
  deletedAt: null,
};
export const syntheticReservation: ReservationDto = {
  id: operationsIds.reservation,
  unitId: operationsIds.unit,
  unitNumber: "A-204",
  projectName: "Synthetic initiative project",
  number: "R-OPEN",
  status: 0,
  reservationDate: "2026-10-29T10:00:00Z",
  cancelledAt: null,
  orderId: null,
};
export const syntheticOrder: OrderDto = {
  id: operationsIds.order,
  reservationId: operationsIds.confirmed,
  unitId: operationsIds.unit,
  unitNumber: "A-204",
  projectName: "Synthetic initiative project",
  number: "O-PENDING",
  status: 0,
  totalPrice: 987654.32,
  completedAt: null,
};

export async function adminOperationsServer(context: BrowserContext, actor: "admin" | "superAdmin" = "admin") {
  const session = await routingServer(context, actor);
  const customers = new Map<string, CustomerDto>([
    [operationsIds.customer, { ...syntheticCustomer }],
    [operationsIds.deletedCustomer, { ...syntheticCustomer, id: operationsIds.deletedCustomer, fName: "Deleted", deletedAt: "2026-10-28T10:00:00Z" }],
  ]);
  const reservations = new Map<string, ReservationDto>([
    [operationsIds.reservation, { ...syntheticReservation }],
    [operationsIds.confirmed, { ...syntheticReservation, id: operationsIds.confirmed, number: "R-LINKED", status: 2, orderId: operationsIds.order }],
    [
      operationsIds.cancelled,
      { ...syntheticReservation, id: operationsIds.cancelled, number: "R-CANCELLED", status: 1, cancelledAt: "2026-10-29T11:00:00Z" },
    ],
  ]);
  const orders = new Map<string, OrderDto>([
    [operationsIds.order, { ...syntheticOrder }],
    [
      operationsIds.regular,
      {
        ...syntheticOrder,
        id: operationsIds.regular,
        reservationId: "b1000000-0000-4000-8000-000000000004",
        unitId: "d1000000-0000-4000-8000-000000000002",
        number: "O-REGULAR",
        status: 1,
        projectName: "Synthetic regular project",
      },
    ],
    [
      operationsIds.completed,
      {
        ...syntheticOrder,
        id: operationsIds.completed,
        reservationId: "b1000000-0000-4000-8000-000000000005",
        unitId: "d1000000-0000-4000-8000-000000000003",
        number: "O-COMPLETED",
        status: 2,
        completedAt: "2026-10-28T10:00:00Z",
      },
    ],
    [
      operationsIds.competitor,
      { ...syntheticOrder, id: operationsIds.competitor, reservationId: "b1000000-0000-4000-8000-000000000006", number: "O-COMPETING", status: 0 },
    ],
  ]);
  const state = {
    readStatus: 0,
    writeStatus: 0,
    delayWrite: 0,
    failOrderRead: false,
    afterWriteReadFailure: false,
    commitOnError: false,
    staleConversion: false,
    staleCompletion: false,
    malformedId: false,
    extraCustomers: 0,
  };
  const calls: { url: URL; method: string; bodyBytes: number }[] = [];
  const cors = {
    ...sessionCors,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, X-CSRF-TOKEN",
  };
  await context.route(/https:\/\/localhost:7249\/api\/v1\/admin\/(customers|reservations|orders)(?:\/|\?|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    calls.push({ url, method, bodyBytes: request.postDataBuffer()?.byteLength ?? 0 });
    const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number) =>
      route.fulfill({ status, headers: { ...cors, ...(status === 429 ? { "retry-after": "1" } : {}) }, json: { status } });
    const parts = url.pathname.replace("/api/v1/admin/", "").split("/");
    const kind = parts[0]!,
      id = parts[1],
      action = parts[2];
    if (method === "GET") {
      if (state.readStatus) {
        return fail(state.readStatus);
      }
      if (kind === "orders" && id && state.failOrderRead) {
        return fail(503);
      }
      const page = <T>(items: T[]) => {
        const pageNumber = Number(url.searchParams.get("pageNumber") ?? 1),
          pageSize = Number(url.searchParams.get("pageSize") ?? 20);
        return ok({
          items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          totalCount: items.length,
          totalPages: Math.ceil(items.length / pageSize),
          pageNumber,
          pageSize,
        });
      };
      if (kind === "customers") {
        if (id) {
          return customers.has(id) ? ok(customers.get(id)) : fail(404);
        }
        const search = url.searchParams.get("search")?.toLowerCase() ?? "";
        const rows = [
          ...customers.values(),
          ...Array.from({ length: state.extraCustomers }, (_, i) => ({
            ...syntheticCustomer,
            id: `a2000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
            fName: `Extra ${i}`,
          })),
        ];
        return page(
          rows.filter(
            (row) =>
              `${row.fName} ${row.lName} ${row.email}`.toLowerCase().includes(search) &&
              (!url.searchParams.has("isDeleted") || String(row.deletedAt !== null) === url.searchParams.get("isDeleted")),
          ),
        );
      }
      if (kind === "reservations") {
        if (id) {
          return reservations.has(id) ? ok(reservations.get(id)) : fail(404);
        }
        return page(
          [...reservations.values()].filter((row) => !url.searchParams.has("status") || String(row.status) === url.searchParams.get("status")),
        );
      }
      if (kind === "orders") {
        if (id) {
          return orders.has(id) ? ok(orders.get(id)) : fail(404);
        }
        return page([...orders.values()].filter((row) => !url.searchParams.has("status") || String(row.status) === url.searchParams.get("status")));
      }
      return fail(404);
    }
    if (state.delayWrite) {
      await new Promise((resolve) => setTimeout(resolve, state.delayWrite));
    }
    if (!id) {
      return fail(404);
    }
    const error = state.writeStatus;
    state.writeStatus = 0;

    function convert() {
      const original = reservations.get(id!)!;
      reservations.set(id!, { ...original, status: 2, orderId: operationsIds.created });
      orders.set(operationsIds.created, { ...syntheticOrder, id: operationsIds.created, reservationId: id!, number: "O-CREATED" });
    }

    function complete() {
      const target = orders.get(id!)!;
      for (const [key, value] of orders) {
        if (value.unitId === target.unitId) {
          orders.set(key, { ...value, status: key === id ? 2 : 3, completedAt: key === id ? "2026-10-29T12:00:00Z" : null });
        }
      }
    }

    if (error) {
      if (state.commitOnError || (error === 409 && state.staleConversion && action === "order")) {
        if (kind === "reservations" && action === "order") {
          convert();
        }
        if (kind === "orders" && action === "complete") {
          complete();
        }
        if (kind === "customers") {
          customers.set(id, { ...customers.get(id)!, deletedAt: action === "restore" ? null : "2026-10-29T12:00:00Z" });
        }
      }
      if (error === 409 && state.staleCompletion && action === "complete") {
        complete();
      }
      return fail(error);
    }
    let returned = id;
    if (kind === "customers") {
      if (!customers.has(id)) {
        return fail(404);
      }
      customers.set(id, { ...customers.get(id)!, deletedAt: method === "DELETE" ? "2026-10-29T12:00:00Z" : null });
    } else if (kind === "reservations" && action === "order") {
      const current = reservations.get(id);
      if (!current || current.status !== 0 || current.orderId) {
        return fail(409);
      }
      convert();
      returned = operationsIds.created;
    } else if (kind === "orders" && action === "complete") {
      const current = orders.get(id);
      if (!current) {
        return fail(404);
      }
      if (current.status !== 0 || current.id === operationsIds.regular) {
        return fail(409);
      }
      complete();
    } else {
      return fail(405);
    }
    if (state.afterWriteReadFailure) {
      state.readStatus = 503;
    }
    return ok(state.malformedId ? "malformed-reference" : returned);
  });
  return { state, calls, customers, reservations, orders, session };
}
