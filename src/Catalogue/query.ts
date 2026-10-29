import type { GetProjectsParameters } from '../Types/contracts';

export type CatalogueQuery = Required<Pick<GetProjectsParameters, 'pageNumber' | 'pageSize'>> & GetProjectsParameters;
export const isGuid = (value: string | undefined): value is string => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
function positive(value: string | null, fallback: number, maximum: number) {
  return value && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= maximum ? Number(value) : fallback;
}
/** Ignore unsupported fields; URL filters never become arbitrary API query properties. */
export function readCatalogueQuery(search: URLSearchParams, projectFilters: boolean): CatalogueQuery {
  const query: CatalogueQuery = { pageNumber: positive(search.get('pageNumber'), 1, 2_147_483_647), pageSize: positive(search.get('pageSize'), 12, 100) };
  const text = search.get('search')?.trim().slice(0, 100);
  if (text) query.search = text;
  if (projectFilters) {
    for (const key of ['cityId', 'areaId'] as const) { const value = search.get(key); if (value && isGuid(value)) query[key] = value; }
    const type = search.get('projectType');
    if (type === '0' || type === '1') query.projectType = Number(type) as 0 | 1;
  }
  return query;
}
export function writeCatalogueQuery(query: CatalogueQuery): URLSearchParams {
  const search = new URLSearchParams();
  if (query.search) search.set('search', query.search);
  for (const key of ['cityId', 'areaId', 'projectType'] as const) if (query[key] !== undefined && query[key] !== null) search.set(key, String(query[key]));
  if (query.pageNumber !== 1) search.set('pageNumber', String(query.pageNumber));
  if (query.pageSize !== 12) search.set('pageSize', String(query.pageSize));
  return search;
}
