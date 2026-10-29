import { useCallback, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useStaffRead } from "./useStaffRead";
import { useStaffOperation } from "./useStaffOperation";
import { ApiError } from "../Types/failures";
import type { StaffJob } from "./useStaffOperation";

/** A route-local resource retains drafts through refreshes and clears protected data after denial. */
export function useGovernanceResource<T>(scope: string, load: (signal: AbortSignal) => Promise<T>) {
  const { reloadIdentity, retryBootstrap } = useAuth();
  const [snapshot, setSnapshot] = useState<T>();
  const latest = useRef(0);
  const revalidate = useCallback(async () => {
    try {
      await reloadIdentity();
    } catch {
      // A profile outage after a permission rejection cannot leave a stale privileged identity visible.
      await retryBootstrap();
    }
  }, [reloadIdentity, retryBootstrap]);
  const checkedLoad = useCallback(async (signal: AbortSignal) => {
    const sequence = ++latest.current;
    try {
      const result = await load(signal);
      if (!signal.aborted && sequence === latest.current) {
        setSnapshot(result);
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status ?? 0) && !signal.aborted) {
        if (sequence === latest.current) {
          setSnapshot(undefined);
        }
        await revalidate();
      }
      throw error;
    }
  }, [load, revalidate]);
  const read = useStaffRead(scope, checkedLoad);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const action = useStaffOperation("governance", gate);

  async function run(job: StaffJob) {
    if (read.result.status !== "success") {
      return undefined;
    }
    return action.run({
      ...job,
      write: async (signal) => {
        try {
          return await job.write(signal);
        } catch (error) {
          if (error instanceof ApiError && (error.status === 403 || (error.status === 401 && error.featureCode !== 1)) && !signal.aborted) {
            await revalidate();
          }
          throw error;
        }
      },
    });
  }

  const denied = read.result.status === "error" && [401, 403].includes(read.result.failure.status ?? 0);
  return { read, snapshot: denied ? undefined : read.result.status === "success" ? read.result.data : snapshot, action, run };
}
