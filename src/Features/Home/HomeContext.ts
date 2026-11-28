import { createContext } from "react";
import type { ResourceRead } from "../../Hooks/useResourceRead";
import type { PaginationResult, ProjectListDto } from "../../Types/contracts";
import type { ProjectType } from "../../Types/contracts";

export interface HomeCollection {
  result: ResourceRead<PaginationResult<ProjectListDto>>;
  page: number;
  changePage: (page: number) => void;
  reload: () => void;
}

export interface HomeData {
  collections: Record<ProjectType, HomeCollection>;
}

export const HomeContext = createContext<HomeData | null>(null);
