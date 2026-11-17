import type { ReactNode } from "react";
import { useCallback } from "react";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { getCityById } from "../../../Services/Cities";
import { isGuid } from "../../../Services/identifiers";
import { ApiError } from "../../../Types/failures";
import { DetailContext } from "./DetailContext";
export function DetailProvider({ id, children }: { id: string | undefined; children: ReactNode }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!isGuid(id)) throw new ApiError("transport", { status: 404 });
      return getCityById({ id }, { signal });
    },
    [id],
  );
  const read = useResourceRead(["city", id].join(":"), load);
  usePublicContentInvalidation(read.reload);
  return <DetailContext value={read}>{children}</DetailContext>;
}
