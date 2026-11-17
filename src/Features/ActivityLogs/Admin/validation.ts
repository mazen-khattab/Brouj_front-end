import { isGuid } from "../../../Services/identifiers";
import { validDateTime } from "../../../Validation/dateTime";
import type { AuditFilters } from "./types";
export function validateAuditFilters(values: AuditFilters) {
  return [
    ...(values.userId && !isGuid(values.userId) ? ["userId"] : []),
    ...(values.entityType.length > 128 ? ["entityType"] : []),
    ...(values.action && !/^[012]$/.test(values.action) ? ["action"] : []),
    ...(values.dateFrom && !validDateTime(values.dateFrom) ? ["dateFrom"] : []),
    ...(values.dateTo && (!validDateTime(values.dateTo) || (values.dateFrom && Date.parse(values.dateTo) < Date.parse(values.dateFrom)))
      ? ["dateTo"]
      : []),
  ];
}
