import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CatalogueListContext } from './CatalogueListContext';
import type { CatalogueListData } from './CatalogueListContext';
import { getCities } from '../Services/Cities';
import { getAreasByCity } from '../Services/Areas';
import { getProjects } from '../Services/Projects';
import { getUnitsByProject } from '../Services/Units';
import { useCatalogueRead } from '../Hooks/useCatalogueRead';
import { isGuid, readCatalogueQuery, writeCatalogueQuery } from '../Catalogue/query';
import type { CatalogueQuery } from '../Catalogue/query';
import { ApiError } from '../Types/failures';
import { useCatalogueInvalidation } from '../Catalogue/invalidation';

export function CatalogueListProvider({ kind, scopeId, children }: { kind: CatalogueListData['kind']; scopeId?: string; children: ReactNode }) {
  const [search, setSearch] = useSearchParams();
  const raw = search.toString();
  const params = useMemo(() => readCatalogueQuery(new URLSearchParams(raw), kind === 'projects'), [raw, kind]);
  const canonical = writeCatalogueQuery(params).toString();
  useEffect(() => { if (raw !== canonical) setSearch(canonical, { replace: true, preventScrollReset: true }); }, [raw, canonical, setSearch]);
  const load = useCallback(async (signal: AbortSignal): Promise<CatalogueListData> => {
    if ((kind === 'areas' || kind === 'units' || scopeId) && !isGuid(scopeId)) throw new ApiError('transport', { status: 404 });
    const paging = { pageNumber: params.pageNumber, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) };
    switch (kind) {
      case 'cities': return { kind, page: await getCities({ query: paging }, { signal }) };
      case 'areas': return { kind, page: await getAreasByCity({ cityId: scopeId!, query: paging }, { signal }) };
      case 'projects': return { kind, page: await getProjects({ query: { ...params, ...(scopeId ? { areaId: scopeId } : {}) } }, { signal }) };
      case 'units': return { kind, page: await getUnitsByProject({ projectId: scopeId!, query: paging }, { signal }) };
    }
  }, [kind, params, scopeId]);
  const { result, reload } = useCatalogueRead(`${kind}:${scopeId ?? ''}:${canonical}`, load);
  useCatalogueInvalidation(reload);
  useEffect(() => {
    if (result.status !== 'success') return;
    const last = Math.max(1, result.data.page.totalPages);
    if (params.pageNumber > last) setSearch(writeCatalogueQuery({ ...params, pageNumber: last }), { replace: true, preventScrollReset: true });
  }, [result, params, setSearch]);
  const update = useCallback((changes: Partial<CatalogueQuery>, replace = false) => {
    const next = { ...params, ...changes, pageNumber: changes.pageNumber ?? 1 };
    // A new city starts a new area selection; it must not retain a stale area's constraint.
    if ('cityId' in changes && !('areaId' in changes)) delete next.areaId;
    setSearch(writeCatalogueQuery(next), { replace, preventScrollReset: true });
  }, [params, setSearch]);
  return <CatalogueListContext value={{ params, result, reload, update }}>{children}</CatalogueListContext>;
}
