import { useCallback, useEffect, useReducer, useState } from "react";
import { ApiError } from "../Types/failures";

export type ResourceRead<T> = { status: "loading" } | { status: "idle" } | { status: "success"; data: T } | { status: "error"; failure: ApiError };

/** One bounded read, with immediate stale-data hiding and cancellation/latest-response protection. */
export function useResourceRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  const [stored, setStored] = useState<{ key: string; revision: number; result: ResourceRead<T> }>();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    // Also catches a synchronous loader exception without blocking React rendering.
    void Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) throw new ApiError("canceled");
        return load(controller.signal);
      })
      .then(
        (data) => {
          if (active && !controller.signal.aborted) setStored({ key, revision, result: { status: "success", data } });
        },
        (error: unknown) => {
          if (active && !controller.signal.aborted)
            setStored({ key, revision, result: { status: "error", failure: error instanceof ApiError ? error : new ApiError("unknown") } });
        },
      );
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, revision, load, enabled]);

  const result: ResourceRead<T> = !enabled
    ? { status: "idle" }
    : stored?.key === key && stored.revision === revision
      ? stored.result
      : { status: "loading" };
  return { result, reload: useCallback(() => refresh(), []) };
}
