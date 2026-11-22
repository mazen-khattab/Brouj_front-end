import { createContext } from "react";
import type { ResourceRead } from "../../Hooks/useResourceRead";
import type { PaginationResult, ProjectListDto, TermsDto } from "../../Types/contracts";
import type { ProjectType } from "../../Types/contracts";

export interface HomeCollection {
  result: ResourceRead<PaginationResult<ProjectListDto>>;
  page: number;
  changePage: (page: number) => void;
  reload: () => void;
}

export interface HomeData {
  collections: Record<ProjectType, HomeCollection>;
  terms: ResourceRead<TermsDto>;
  reloadTerms: () => void;
}

export const HomeContext = createContext<HomeData | null>(null);
