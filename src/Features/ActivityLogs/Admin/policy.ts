import { isGuid } from "../../../Services/identifiers";
import type { ActivityLogDto } from "../../../Types/contracts";

/** Audit values are untrusted at runtime. Never stringify objects or traverse unexpected change payloads. */
export function auditText(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value.length > 512 ? `${value.slice(0, 512)}…` : value;
}

export function auditRows(value: unknown): ActivityLogDto[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, 100).filter((row): row is ActivityLogDto => !!row && typeof row === "object" && isGuid(row.id));
}
