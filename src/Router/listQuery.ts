export interface ListQuery {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
}
function positive(value: string | null, fallback: number, maximum: number) {
  return value && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= maximum ? Number(value) : fallback;
}
export function readListQuery(search: URLSearchParams): ListQuery {
  const query: ListQuery = { pageNumber: positive(search.get("pageNumber"), 1, 2_147_483_647), pageSize: positive(search.get("pageSize"), 12, 100) };
  const text = search.get("search")?.trim().slice(0, 100);
  if (text) query.search = text;
  return query;
}
export function writeListQuery(query: ListQuery) {
  const search = new URLSearchParams();
  if (query.search) search.set("search", query.search);
  if (query.pageNumber !== 1) search.set("pageNumber", String(query.pageNumber));
  if (query.pageSize !== 12) search.set("pageSize", String(query.pageSize));
  return search;
}
