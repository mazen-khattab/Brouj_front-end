import type { CustomerDto } from "../../../Types/contracts";

export function customerOperation(customer: CustomerDto) {
  return customer.deletedAt === null ? "deletion" : "restoration";
}
