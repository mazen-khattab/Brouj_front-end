import { ApiError } from "../Types/failures";
import { isGuid } from "../Catalogue/query";
import type { PlanStageItemInput, StageDraftInput, StageTemplateDto, TimePlanInput, ReorderItemInput } from "../Types/contracts";

export type Fields = Record<string, string>;

/** Server field names identify the control; raw server text never becomes product copy. */
export function planningFieldErrors(failure: ApiError | undefined, keys: string[]) {
  const names = Object.keys(failure?.fieldErrors ?? {}).map((key) => key.split(".").at(-1)?.toLowerCase());
  return keys.filter((key) => names.includes(key.toLowerCase()));
}

/** Dates remain explicit offset timestamps; no browser-local timezone or missing date is guessed. */
export function validPlanningDate(value: string) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,7})?(Z|[+-](\d\d):(\d\d))$/.exec(value);
  if (!match || Number(match[1]) < 1 || !Number.isFinite(Date.parse(value))) {
    return false;
  }
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  const hours = Number(match[8] ?? 0),
    minutes = Number(match[9] ?? 0);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3]) &&
    Number(match[4]) < 24 &&
    Number(match[5]) < 60 &&
    Number(match[6]) < 60 &&
    hours <= 14 &&
    minutes < 60 &&
    (hours !== 14 || minutes === 0)
  );
}

export function invalidPlanningFields(values: Fields, completed = false): string[] {
  return Object.entries(values).flatMap(([key, value]) => {
    if (key === "name" || key === "code") {
      return !value.trim() || value.length > (key === "code" ? 64 : 100) ? [key] : [];
    }
    if (key === "description") {
      return value.length > 20000 ? [key] : [];
    }
    if (key === "status") {
      return /^[0-2]$/.test(value) ? [] : [key];
    }
    if (key === "confirmedDate") {
      return (value ? !validPlanningDate(value) : completed || values.status === "2") ? [key] : [];
    }
    return validPlanningDate(value) ? [] : [key];
  });
}

export function planInput(values: Fields): TimePlanInput {
  return { name: values.name!, deliveryDate: values.deliveryDate || null };
}

export function itemInput(values: Fields): PlanStageItemInput {
  return { name: values.name!, dueDate: values.dueDate || null, confirmedDate: values.confirmedDate || null };
}

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

/** Complete sibling membership is checked locally and again by the authoritative server. */
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

export function stageDraft(name: string, deliveryDate: string, rows: readonly Fields[], source?: StageTemplateDto): StageDraftInput {
  if (
    source &&
    (!source.isActive ||
      source.items.some((item) => !item.isActive) ||
      source.items.length !== rows.length ||
      new Set(rows.map((row) => row.itemTemplateId)).size !== rows.length ||
      rows.some((row) => !source.items.some((item) => item.itemTemplateId === row.itemTemplateId)))
  ) {
    throw new ApiError("transport", { status: 409 });
  }
  return {
    stageTemplateId: source?.id ?? null,
    name: source?.name ?? name,
    deliveryDate: deliveryDate || null,
    items: rows.map((row) => ({
      itemTemplateId: source ? row.itemTemplateId! : null,
      name: source?.items.find((item) => item.itemTemplateId === row.itemTemplateId)?.name ?? row.name ?? "",
      dueDate: row.dueDate || null,
      confirmedDate: row.confirmedDate || null,
    })),
  };
}
