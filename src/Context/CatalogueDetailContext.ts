import { createContext } from "react";
import type { AreaDto, CityDto, ProjectDto, TermsDto, UnitDto } from "../Types/contracts";
import type { CatalogueRead } from "../Hooks/useCatalogueRead";
export type CatalogueDetailData =
  | { kind: "city"; value: CityDto }
  | { kind: "area"; value: AreaDto }
  | { kind: "project"; value: ProjectDto }
  | { kind: "unit"; value: UnitDto }
  | { kind: "terms"; value: TermsDto };
export const CatalogueDetailContext = createContext<{ result: CatalogueRead<CatalogueDetailData>; reload: () => void } | null>(null);
