import { useCallback } from "react";
import { usePublicContentInvalidation } from "../Realtime/publicContentInvalidation";
import { getProjectById } from "../Services/Projects";
import { isGuid } from "../Services/identifiers";
import { ApiError } from "../Types/failures";
import { useResourceRead } from "./useResourceRead";

export function usePublicProject(id: string | undefined) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!isGuid(id)) throw new ApiError("transport", { status: 404 });
      return getProjectById({ id }, { signal });
    },
    [id],
  );
  const read = useResourceRead(["project", id].join(":"), load);
  usePublicContentInvalidation(read.reload);
  return read;
}
