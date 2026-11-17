import { useEffect } from "react";
import type { ResourceCollectionRead } from "../Types/resource";

/** Deletion/filter changes can shrink the last page. Canonical paging avoids an empty stranded page. */
export function useResourcePageBounds<T>(read: ResourceCollectionRead<T>, filters: { pageNumber: number; update: (change: { pageNumber: number }) => void }) {
  const { result } = read;
  const { pageNumber, update } = filters;
  useEffect(() => {
    if (result.status === "success" && result.data.list && pageNumber > Math.max(1, result.data.page.totalPages)) {
      update({ pageNumber: Math.max(1, result.data.page.totalPages) });
    }
  }, [result, pageNumber, update]);
}
