import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { ListQuery as Query } from "../../../Router/listQuery";
import type { CityDto, PaginationResult } from "../../../Types/contracts";
export interface ListData {
  page: PaginationResult<CityDto>;
}
export const ListContext = createContext<{
  params: Query;
  result: ResourceRead<ListData>;
  reload: () => void;
  update: (changes: Partial<Query>, replace?: boolean) => void;
} | null>(null);
export function useList() {
  const value = useContext(ListContext);
  if (!value) throw new Error("Cities ListProvider required.");
  return value;
}
