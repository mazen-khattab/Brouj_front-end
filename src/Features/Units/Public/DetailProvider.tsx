import type { ReactNode } from "react";
import { useCallback } from "react";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { getUnitById } from "../../../Services/Units";
import { isGuid } from "../../../Services/identifiers";
import { ApiError } from "../../../Types/failures";
import { DetailContext } from "./DetailContext";
export function DetailProvider({ id, projectId, children }: { id: string | undefined; projectId: string | undefined; children: ReactNode }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!isGuid(id) || !isGuid(projectId)) throw new ApiError("transport", { status: 404 });
      return getUnitById({ id, query: { projectId } }, { signal });
    },
    [id, projectId],
  );
  const read = useResourceRead(["unit", id, projectId].join(":"), load);
  usePublicContentInvalidation(read.reload);
  return <DetailContext value={read}>{children}</DetailContext>;
}
