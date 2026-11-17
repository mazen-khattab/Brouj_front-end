import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { PaginationResult, ProjectListDto } from "../../../Types/contracts";
import type { Query } from "./query";
export interface ListData {
  page: PaginationResult<ProjectListDto>;
}
export const ListContext = createContext<{
  params: Query;
  result: ResourceRead<ListData>;
  reload: () => void;
  update: (changes: Partial<Query>, replace?: boolean) => void;
} | null>(null);
export function useList() {
  const value = useContext(ListContext);
  if (!value) throw new Error("Projects ListProvider required.");
  return value;
}
