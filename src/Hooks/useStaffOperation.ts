import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useAuth } from "./useAuth";
import { sessionBoundary } from "../Security/sessionBoundary";
import { ApiError } from "../Types/failures";
import { uncertainWrite } from "../Account/policy";
import { isGuid } from "../Catalogue/query";

export interface StaffWriteGate {
  locked: boolean;
  unresolved: Set<string>;
}
export interface StaffOperationState {
  pending: boolean;
  targetId?: string;
  failure?: ApiError | undefined;
  blocked: boolean;
  uncertain: boolean;
  succeeded: boolean;
}
export interface StaffOperation extends StaffOperationState {
  check: () => Promise<void>;
}
export interface StaffJob {
  id: string;
  write: (signal: AbortSignal) => Promise<string>;
  refresh: (returnedId: string, signal: AbortSignal) => Promise<unknown>;
  reconcile: (signal: AbortSignal) => Promise<unknown>;
}

/** Each operation has its own feedback; related operations share a synchronous gate against conflicting writes. */
export function useStaffOperation(name: string, gate: RefObject<StaffWriteGate>) {
  const auth = useAuth();
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const reconcile = useRef<((signal: AbortSignal) => Promise<unknown>) | null>(null);
  const [state, setState] = useState<StaffOperationState>({ pending: false, blocked: false, uncertain: false, succeeded: false });
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  function current() {
    return active.current && auth.actor === "staff" && (sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation;
  }

  async function run(job: StaffJob): Promise<string | undefined> {
    if (!current() || gate.current.locked || gate.current.unresolved.size) {
      return undefined;
    }
    gate.current.locked = true;
    const request = new AbortController();
    controller.current = request;
    reconcile.current = job.reconcile;
    setState({ pending: true, targetId: job.id, blocked: false, uncertain: false, succeeded: false });
    let acknowledged = false;
    try {
      const id = await job.write(request.signal);
      if (!current() || request.signal.aborted) {
        return undefined;
      }
      if (!isGuid(id)) {
        throw new ApiError("transport", { status: 200 });
      }
      acknowledged = true;
      // If the write succeeded but a read fails, an explicit check must use this known result, not send the write again.
      reconcile.current = (signal) => job.refresh(id, signal);
      await job.refresh(id, request.signal);
      if (!current() || request.signal.aborted) {
        return undefined;
      }
      setState({ pending: false, targetId: job.id, blocked: false, uncertain: false, succeeded: true });
      return id;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("unknown");
      if (!current() || request.signal.aborted) {
        return undefined;
      }
      const uncertain = acknowledged || uncertainWrite(failure);
      let blocked = uncertain;
      if (!acknowledged && [403, 404, 409].includes(failure.status ?? 0)) {
        // Permissions and business eligibility may have changed since the row was loaded.
        try {
          await job.reconcile(request.signal);
        } catch {
          blocked = true;
        }
      }
      if (!current() || request.signal.aborted) {
        return undefined;
      }
      if (blocked) {
        gate.current.unresolved.add(name);
      }
      setState({ pending: false, targetId: job.id, blocked, uncertain, succeeded: false, failure });
      return undefined;
    } finally {
      gate.current.locked = false;
      if (controller.current === request) {
        controller.current = null;
      }
    }
  }

  async function check() {
    if (!current() || gate.current.locked || !reconcile.current) {
      return;
    }
    gate.current.locked = true;
    const request = new AbortController();
    controller.current = request;
    setState((previous) => ({ ...previous, pending: true }));
    try {
      await reconcile.current(request.signal);
      if (current() && !request.signal.aborted) {
        gate.current.unresolved.delete(name);
        setState((previous) => ({ ...previous, pending: false, blocked: false, uncertain: false, succeeded: false, failure: undefined }));
      }
    } catch (error) {
      if (current() && !request.signal.aborted) {
        gate.current.unresolved.add(name);
        setState((previous) => ({
          ...previous,
          pending: false,
          blocked: true,
          failure: error instanceof ApiError ? error : new ApiError("unknown"),
        }));
      }
    } finally {
      gate.current.locked = false;
      if (controller.current === request) {
        controller.current = null;
      }
    }
  }

  return { ...state, run, check };
}
