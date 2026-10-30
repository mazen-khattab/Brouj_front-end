import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { HomeContext } from './HomeContext';
import { useCatalogueRead } from '../Hooks/useCatalogueRead';
import { useCatalogueInvalidation } from '../Catalogue/invalidation';
import { getProjects } from '../Services/Projects';
import { getActiveTermsAndConditions } from '../Services/Terms';
import { ProjectType } from '../Types/contracts';

export function HomeProvider({ children }: { children: ReactNode }) {
  const [page, changePage] = useState(1);
  const loadProjects = useCallback((signal: AbortSignal) => getProjects({
    query: { projectType: ProjectType.Initiative, pageNumber: page, pageSize: 3 },
  }, { signal }), [page]);
  const loadTerms = useCallback((signal: AbortSignal) => getActiveTermsAndConditions({ signal }), []);
  // These reads stay independent: a missing terms version must not hide the projects.
  const { result: projects, reload: reloadProjects } = useCatalogueRead(`home-projects:${page}`, loadProjects);
  const { result: terms, reload: reloadTerms } = useCatalogueRead('home-terms', loadTerms);
  const reload = useCallback(() => {
    reloadProjects();
    reloadTerms();
  }, [reloadProjects, reloadTerms]);
  useCatalogueInvalidation(reload);

  return <HomeContext value={{
    projects, terms, page, changePage, reloadProjects, reloadTerms,
  }}>{children}</HomeContext>;
}
