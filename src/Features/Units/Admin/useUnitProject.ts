import { useCallback } from "react";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { getProjectById } from "../../../Services/Projects";

export function useUnitProject(scope: string, projectId: string) {
  const load = useCallback((signal: AbortSignal) => getProjectById({ id: projectId }, { signal }), [projectId]);
  return useResourceRead(`${scope}:parent:${projectId}`, load, Boolean(projectId));
}
