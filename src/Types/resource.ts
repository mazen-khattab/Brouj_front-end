import type { PaginationResult } from "./contracts";
import type { StaffRead } from "../Hooks/useStaffRead";

export type ResourceData<T> = { list: true; page: PaginationResult<T> } | { list: false; record: T };
export type ResourceCollectionRead<T> = StaffRead<ResourceData<T>>;
