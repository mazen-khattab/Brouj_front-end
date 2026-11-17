import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { AreaListDto, PaginationResult } from "../../../Types/contracts";
import type { Query } from "./query";
export interface ListData {
  page: PaginationResult<AreaListDto>;
}
export const ListContext = createContext<{
  params: Query;
  result: ResourceRead<ListData>;
  reload: () => void;
  update: (changes: Partial<Query>, replace?: boolean) => void;
} | null>(null);
export function useList() {
  const value = useContext(ListContext);
  if (!value) throw new Error("Areas ListProvider required.");
  return value;
}
