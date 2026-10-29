import { OrderStatus, ReservationStatus } from "../Types/contracts";
import type { CustomerDto, OrderDto, ReservationDto } from "../Types/contracts";

export type OperationsKind = "customers" | "reservations" | "orders";
export interface OperationsQuery {
  pageNumber: number;
  pageSize: number;
  status: number | null;
  isDeleted: boolean | null;
}

export function canConvert(reservation: ReservationDto) {
  return reservation.status === ReservationStatus.Processing && reservation.orderId === null;
}

/** Only initiative creation produces Pending orders. The DTO omits project type; the handler remains authoritative. */
export function canComplete(order: OrderDto) {
  return order.status === OrderStatus.Pending;
}

export function customerOperation(customer: CustomerDto) {
  return customer.deletedAt === null ? "deletion" : "restoration";
}

export function readOperationsQuery(params: URLSearchParams, kind: OperationsKind): OperationsQuery {
  function positive(key: string, fallback: number, max: number) {
    const raw = params.get(key) ?? "";
    const value = Number(raw);
    return /^\d+$/.test(raw) && value > 0 && value <= max ? value : fallback;
  }
  const status = params.get("status");
  return {
    pageNumber: positive("pageNumber", 1, 2147483647),
    pageSize: positive("pageSize", 20, 100),
    status:
      kind !== "customers" && status !== null && /^[0-3]$/.test(status) && Number(status) <= (kind === "reservations" ? 2 : 3)
        ? Number(status)
        : null,
    isDeleted: kind === "customers" && ["true", "false"].includes(params.get("isDeleted") ?? "") ? params.get("isDeleted") === "true" : null,
  };
}

/** Customer search stays in memory instead of adding personal search text to SPA history. */
export function writeOperationsQuery(query: OperationsQuery, kind: OperationsKind) {
  const params = new URLSearchParams();
  if (query.pageNumber !== 1) {
    params.set("pageNumber", String(query.pageNumber));
  }
  if (query.pageSize !== 20) {
    params.set("pageSize", String(query.pageSize));
  }
  if (kind !== "customers" && query.status !== null) {
    params.set("status", String(query.status));
  }
  if (kind === "customers" && query.isDeleted !== null) {
    params.set("isDeleted", String(query.isDeleted));
  }
  return params;
}
