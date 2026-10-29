import type { PaginationResult } from "../Types/contracts";
import type { StaffRead } from "../Hooks/useStaffRead";
import type { useOperationsQuery } from "../Hooks/useOperationsQuery";

export type OperationsData<T> = { list: true; page: PaginationResult<T> } | { list: false; record: T };
export type OperationsRead<T> = StaffRead<OperationsData<T>>;
export type OperationsFilters = ReturnType<typeof useOperationsQuery>;
