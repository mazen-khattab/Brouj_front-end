import { useEffect } from "react";
import type { OperationsFilters, OperationsRead } from "../AdminOperations/types";

/** Deletion/filter changes can shrink the last page. Canonical paging avoids an empty stranded page. */
export function useOperationsPageBounds<T>(read: OperationsRead<T>, filters: OperationsFilters) {
  const { result } = read;
  const { pageNumber, update } = filters;
  useEffect(() => {
    if (result.status === "success" && result.data.list && pageNumber > Math.max(1, result.data.page.totalPages)) {
      update({ pageNumber: Math.max(1, result.data.page.totalPages) });
    }
  }, [result, pageNumber, update]);
}
