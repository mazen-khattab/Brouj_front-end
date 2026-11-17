import type { ListQuery } from "../../../Router/listQuery";
import { readListQuery, writeListQuery } from "../../../Router/listQuery";
import { isGuid } from "../../../Services/identifiers";
export interface Query extends ListQuery {
  cityId?: string | null;
  areaId?: string | null;
  projectType?: 0 | 1 | null;
}
export function readQuery(search: URLSearchParams): Query {
  const query: Query = readListQuery(search);
  for (const key of ["cityId", "areaId"] as const) {
    const value = search.get(key);
    if (value && isGuid(value)) query[key] = value;
  }
  const type = search.get("projectType");
  if (type === "0" || type === "1") query.projectType = Number(type) as 0 | 1;
  return query;
}
export function writeQuery(query: Query) {
  // Preserve the existing URL order: text, location/type filters, then paging.
  const search = new URLSearchParams();
  if (query.search) search.set("search", query.search);
  for (const key of ["cityId", "areaId", "projectType"] as const)
    if (query[key] !== undefined && query[key] !== null) search.set(key, String(query[key]));
  const paging = writeListQuery({ pageNumber: query.pageNumber, pageSize: query.pageSize });
  for (const [key, value] of paging) search.set(key, value);
  return search;
}
