import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TimePlanContext } from "./TimePlanContext";
import type { PlanSnapshot } from "./TimePlanContext";
import { useStaffRead } from "../Hooks/useStaffRead";
import { useStaffOperation } from "../Hooks/useStaffOperation";
import { getProjectById } from "../Services/Projects";
import { getProjectTimePlan } from "../Services/TimePlans";
import { executePlan } from "../Planning/commands";
import type { PlanCommand } from "../Planning/commands";
import { ApiError } from "../Types/failures";
import { isGuid } from "../Catalogue/query";
import { useAuth } from "../Hooks/useAuth";
import { sessionBoundary } from "../Security/sessionBoundary";
import { useRealtimeReload } from "../Hooks/useRealtimeReload";

export function TimePlanProvider({ projectId, scope, children }: { projectId: string; scope: string; children: ReactNode }) {
  const { generation } = useAuth();
  const [snapshot, setSnapshot] = useState<PlanSnapshot>();
  const [lastAction, setLastAction] = useState("");
  const load = useCallback(
    async (signal: AbortSignal): Promise<PlanSnapshot> => {
      if (!isGuid(projectId)) {
        throw new ApiError("transport", { status: 404 });
      }
      // A missing plan is creatable only after the project itself has been verified.
      const project = await getProjectById({ id: projectId }, { signal });
      if (project.id !== projectId) {
        throw new ApiError("transport", { status: 200 });
      }
      function keep(data: PlanSnapshot) {
        if (!signal.aborted && (sessionBoundary.stamp()?.generation ?? generation) === generation) {
          setSnapshot(data);
        }
        return data;
      }
      try {
        const plan = await getProjectTimePlan({ projectId }, { signal });
        if (!isGuid(plan.id) || plan.projectId !== projectId) {
          throw new ApiError("transport", { status: 200 });
        }
        return keep({ project, plan });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return keep({ project, plan: null });
        }
        throw error;
      }
    },
    [projectId, generation],
  );
  const read = useStaffRead(scope, load);
  useRealtimeReload("timePlan", `${scope}:${projectId}`, read.result.status === "loading", read.reload, projectId);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const action = useStaffOperation("planning", gate);

  async function refresh(signal: AbortSignal) {
    const data = await read.reload(signal);
    setSnapshot(data);
  }

  async function run(label: string, command: PlanCommand) {
    if (read.result.status !== "success" || !snapshot) {
      return undefined;
    }
    setLastAction(label);
    return action.run({
      id: label,
      reconcileOnFailure: command.kind.startsWith("order"),
      write: (signal) => executePlan(command, projectId, snapshot.plan, signal),
      refresh: (_id, signal) => refresh(signal),
      reconcile: refresh,
    });
  }

  const forbidden = read.result.status === "error" && [401, 403, 404].includes(read.result.failure.status ?? 0);
  return <TimePlanContext value={{ scope, read, snapshot: forbidden ? undefined : snapshot, action, lastAction, run }}>{children}</TimePlanContext>;
}
