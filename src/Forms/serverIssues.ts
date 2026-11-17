import type { ApiFailure } from "../Types/failures";
export type FieldIssue = { field: string; key: string };
export function serverIssues(failure: ApiFailure, fields: readonly string[]): FieldIssue[] {
  return Object.keys(failure.fieldErrors).flatMap((key) => {
    const field = fields.find((field) => field.toLowerCase() === key.split(".").at(-1)?.toLowerCase());
    return field ? [{ field, key: "validation.server" }] : [];
  });
}
