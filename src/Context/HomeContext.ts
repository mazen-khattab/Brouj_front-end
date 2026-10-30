import { createContext } from 'react';
import type { CatalogueRead } from '../Hooks/useCatalogueRead';
import type { PaginationResult, ProjectListDto, TermsDto } from '../Types/contracts';

export interface HomeData {
  projects: CatalogueRead<PaginationResult<ProjectListDto>>;
  terms: CatalogueRead<TermsDto>;
  page: number;
  changePage: (page: number) => void;
  reloadProjects: () => void;
  reloadTerms: () => void;
}

export const HomeContext = createContext<HomeData | null>(null);
