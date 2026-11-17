import { ApiError } from "../../../Types/failures";
import { isGuid } from "../../../Services/identifiers";
import type { ReorderItemInput } from "../../../Types/contracts";

export function ordered<T extends { sortOrder: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function moveRows<T>(rows: readonly T[], index: number, direction: -1 | 1): T[] {
  const result = [...rows];
  if (index < 0 || index >= rows.length || index + direction < 0 || index + direction >= rows.length) {
    throw new ApiError("transport", { status: 400 });
  }
  [result[index], result[index + direction]] = [result[index + direction]!, result[index]!];
  return result;
}




export function orderingInput(rows: readonly { id: string }[]): ReorderItemInput[] {
  return rows.map((row, index) => ({ id: row.id, sortOrder: index + 1 }));
}

export function assertCompleteOrdering(rows: readonly { id: string }[], input: readonly ReorderItemInput[]) {
  const ids = input.map((row) => row.id);
  if (
    input.length > 1000 ||
    ids.length !== rows.length ||
    new Set(ids).size !== ids.length ||
    rows.some((row) => !ids.includes(row.id)) ||
    input.some((row) => !isGuid(row.id)) ||
    [...input].sort((a, b) => a.sortOrder - b.sortOrder).some((row, index) => row.sortOrder !== index + 1)
  ) {
    throw new ApiError("transport", { status: 400 });
  }
}
