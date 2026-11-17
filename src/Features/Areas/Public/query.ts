import type { ListQuery } from "../../../Router/listQuery";
import { readListQuery, writeListQuery } from "../../../Router/listQuery";
import { isGuid } from "../../../Services/identifiers";
export interface Query extends ListQuery {
  cityId?: string | null;
}
export function readQuery(search: URLSearchParams): Query {
  const query: Query = readListQuery(search);
  const city = search.get("cityId");
  if (city && isGuid(city)) query.cityId = city;
  return query;
}
export function writeQuery(query: Query) {
  // Preserve the existing URL order: text, location/type filters, then paging.
  const search = new URLSearchParams();
  if (query.search) search.set("search", query.search);
  for (const key of ["cityId"] as const) if (query[key] !== undefined && query[key] !== null) search.set(key, String(query[key]));
  const paging = writeListQuery({ pageNumber: query.pageNumber, pageSize: query.pageSize });
  for (const [key, value] of paging) search.set(key, value);
  return search;
}
