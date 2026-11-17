import { createContext } from "react";
import type { ResourceRead } from "../../Hooks/useResourceRead";
import type { PaginationResult, ProjectListDto, TermsDto } from "../../Types/contracts";

export interface HomeData {
  projects: ResourceRead<PaginationResult<ProjectListDto>>;
  terms: ResourceRead<TermsDto>;
  page: number;
  changePage: (page: number) => void;
  reloadProjects: () => void;
  reloadTerms: () => void;
}

export const HomeContext = createContext<HomeData | null>(null);
