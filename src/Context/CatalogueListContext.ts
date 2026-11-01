import { createContext } from "react";
import type { AreaListDto, CityDto, PaginationResult, ProjectListDto, UnitListDto } from "../Types/contracts";
import type { CatalogueRead } from "../Hooks/useCatalogueRead";
import type { CatalogueQuery } from "../Catalogue/query";

export type CatalogueListData =
  | { kind: "cities"; page: PaginationResult<CityDto> }
  | { kind: "areas"; page: PaginationResult<AreaListDto> }
  | { kind: "projects"; page: PaginationResult<ProjectListDto> }
  | { kind: "units"; page: PaginationResult<UnitListDto> };
export interface CatalogueListValue {
  params: CatalogueQuery;
  result: CatalogueRead<CatalogueListData>;
  reload: () => void;
  update: (changes: Partial<CatalogueQuery>, replace?: boolean) => void;
}
export const CatalogueListContext = createContext<CatalogueListValue | null>(null);
