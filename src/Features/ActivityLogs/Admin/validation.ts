import { isGuid } from "../../../Services/identifiers";
import { toDateTimeOffsetIso } from "../../../utils/dateTimeOffset";
import type { AuditFilters } from "./types";
export function validateAuditFilters(values: AuditFilters) {
  return [
    ...(values.userId && !isGuid(values.userId) ? ["userId"] : []),
    ...(values.entityType.length > 128 ? ["entityType"] : []),
    ...(values.action && !/^[012]$/.test(values.action) ? ["action"] : []),
    ...(values.dateFrom && !toDateTimeOffsetIso(values.dateFrom) ? ["dateFrom"] : []),
    ...(values.dateTo && (!toDateTimeOffsetIso(values.dateTo) || (values.dateFrom && Date.parse(values.dateTo) < Date.parse(values.dateFrom)))
      ? ["dateTo"]
      : []),
  ];
}
