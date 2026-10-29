import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { CatalogueDetailContext } from './CatalogueDetailContext';
import type { CatalogueDetailData } from './CatalogueDetailContext';
import { getCityById } from '../Services/Cities';
import { getAreaById } from '../Services/Areas';
import { getProjectById } from '../Services/Projects';
import { getUnitById } from '../Services/Units';
import { getActiveTermsAndConditions } from '../Services/Terms';
import { useCatalogueRead } from '../Hooks/useCatalogueRead';
import { isGuid } from '../Catalogue/query';
import { ApiError } from '../Types/failures';

export function CatalogueDetailProvider({ kind, id, projectId, children }: { kind: CatalogueDetailData['kind']; id?: string | undefined; projectId?: string | undefined; children: ReactNode }) {
  const load = useCallback(async (signal: AbortSignal): Promise<CatalogueDetailData> => {
    if (kind !== 'terms' && (!isGuid(id) || (kind === 'unit' && !isGuid(projectId)))) throw new ApiError('transport', { status: 404 });
    switch (kind) {
      case 'city': return { kind, value: await getCityById({ id: id! }, { signal }) };
      case 'area': return { kind, value: await getAreaById({ id: id! }, { signal }) };
      case 'project': return { kind, value: await getProjectById({ id: id! }, { signal }) };
      case 'unit': return { kind, value: await getUnitById({ id: id!, query: { projectId: projectId! } }, { signal }) };
      case 'terms': return { kind, value: await getActiveTermsAndConditions({ signal }) };
    }
  }, [kind, id, projectId]);
  const read = useCatalogueRead(`${kind}:${id ?? ''}:${projectId ?? ''}`, load);
  return <CatalogueDetailContext value={read}>{children}</CatalogueDetailContext>;
}
