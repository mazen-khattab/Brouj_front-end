import type { Query } from "./query";

export type TypeFilterKey = "all" | "0" | "1";
export type TypeFilterMemory = Partial<Record<TypeFilterKey, Query>>;

export function typeFilterKey(type: Query["projectType"]): TypeFilterKey {
  return type === 0 ? "0" : type === 1 ? "1" : "all";
}

/** Each collection starts independently; a remembered URL snapshot restores its own paging too. */
export function queryForType(type: Query["projectType"], memory: TypeFilterMemory): Query {
  return { ...(memory[typeFilterKey(type)] ?? { pageNumber: 1, pageSize: 12 }), projectType: type ?? null };
}

export function activeProjectFilters(query: Query): number {
  return [query.search?.trim(), query.cityId, query.areaId].filter(Boolean).length;
}
