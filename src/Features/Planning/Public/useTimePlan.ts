import { useCallback, useContext } from "react";
import { AuthContext } from "../../../Context/AuthContext";
import { useRealtimeReload } from "../../../Hooks/useRealtimeReload";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { getProjectTimePlan } from "../../../Services/TimePlans";
import { isGuid } from "../../../Services/identifiers";
import { ApiError } from "../../../Types/failures";
export function useTimePlan(projectId: string | undefined) {
  const auth = useContext(AuthContext);
  const scope = auth?.actor ? [auth.actor, auth.profile.id, auth.generation].join(":") : "anonymous";
  const load = useCallback(
    (signal: AbortSignal) => {
      if (!isGuid(projectId)) throw new ApiError("transport", { status: 404 });
      return getProjectTimePlan({ projectId }, { signal });
    },
    [projectId],
  );
  const read = useResourceRead(["public-plan", scope, projectId].join(":"), load);
  useRealtimeReload(auth?.actor ? "timePlan" : undefined, [scope, projectId].join(":"), read.result.status === "loading", read.reload, projectId);
  return read;
}
