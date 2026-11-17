import type { OrderDto } from "../../../Types/contracts";
import { OrderStatus } from "../../../Types/contracts";

/** Only initiative creation produces Pending orders. The DTO omits project type; the handler remains authoritative. */
export function canComplete(order: OrderDto) {
  return order.status === OrderStatus.Pending;
}
