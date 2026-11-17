import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { isGuid } from "../../../Services/identifiers";
import { useAuth } from "../../../Hooks/useAuth";
import { sessionBoundary } from "../../../Security/sessionBoundary";
import * as reservations from "../../../Services/Reservations";
import { uncertainWrite } from "../../../Services/writeOutcome";
import { ApiError } from "../../../Types/failures";
import type { CancellationResult, CancellationState } from "./CancellationContext";
import { CancellationContext } from "./CancellationContext";

export function CancellationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<CancellationState>({ pending: false });
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const locked = useRef(false);
  const unresolved = useRef(false);
  const scope = auth.actor ? `${auth.actor}:${auth.profile.id}:${auth.generation}` : "anonymous";
  const isCurrent = () => active.current && auth.actor === "customer" && (sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [scope]);

  async function cancel(id: string): Promise<CancellationResult> {
    const stamp = sessionBoundary.stamp();
    if (!active.current || auth.actor !== "customer" || locked.current || unresolved.current || (stamp && stamp.generation !== auth.generation)) {
      return { ok: false, failure: new ApiError("canceled"), uncertain: false };
    }
    locked.current = true;
    const request = new AbortController();
    controller.current = request;
    setState({ pending: true });
    try {
      const returnedId = await reservations.cancelReservation({ id }, { signal: request.signal });
      if (!active.current || request.signal.aborted || (stamp && sessionBoundary.stamp()?.generation !== stamp.generation))
        throw new ApiError("canceled");
      if (!isGuid(returnedId)) throw new ApiError("transport", { status: 200 });
      setState({ pending: false, succeeded: true });
      return { ok: true, id: returnedId };
    } catch (error: unknown) {
      const failure = error instanceof ApiError ? error : new ApiError("unknown");
      const uncertain = uncertainWrite(failure);
      if (active.current && !request.signal.aborted) {
        unresolved.current = uncertain;
        setState({ pending: false, failure, uncertain });
      }
      return { ok: false, failure, uncertain };
    } finally {
      locked.current = false;
      if (controller.current === request) controller.current = null;
    }
  }
  return <CancellationContext value={{ ...state, cancel, isCurrent }}>{children}</CancellationContext>;
}
