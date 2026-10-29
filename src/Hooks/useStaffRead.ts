import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { ApiError } from "../Types/failures";
import { sessionBoundary } from "../Security/sessionBoundary";
import type { CatalogueRead } from "./useCatalogueRead";

export interface StaffRead<T> {
  result: CatalogueRead<T>;
  reload: (signal?: AbortSignal) => Promise<T>;
}

/** Awaitable private reads let an operation hold its write lock through the authoritative refresh. */
export function useStaffRead<T>(key: string, load: (signal: AbortSignal) => Promise<T>): StaffRead<T> {
  const auth = useAuth();
  const generation = auth.generation;
  const staff = auth.actor === "staff";
  const active = useRef(false);
  const latest = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [stored, setStored] = useState<{ key: string; result: CatalogueRead<T> }>();
  const target = useRef({ key, load, generation, staff });
  useLayoutEffect(() => {
    target.current = { key, load, generation, staff };
  }, [key, load, generation, staff]);
  const reload = useCallback(async (external?: AbortSignal) => {
    // A failed operation may retain this handle while filters change. Always read the current query.
    const expected = target.current;
    const { key: readKey, load: readLoad, generation: readGeneration, staff: readStaff } = expected;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const sequence = ++latest.current;
    const cancel = () => request.abort();
    external?.addEventListener("abort", cancel, { once: true });
    if (external?.aborted) {
      request.abort();
    }
    setStored({ key: readKey, result: { status: "loading" } });
    function current() {
      return (
        active.current &&
        target.current === expected &&
        !request.signal.aborted &&
        latest.current === sequence &&
        (sessionBoundary.stamp()?.generation ?? readGeneration) === readGeneration
      );
    }
    try {
      if (!readStaff) {
        throw new ApiError("transport", { status: 403 });
      }
      if (request.signal.aborted) {
        throw new ApiError("canceled");
      }
      const data = await readLoad(request.signal);
      if (!current()) {
        throw new ApiError("canceled");
      }
      setStored({ key: readKey, result: { status: "success", data } });
      return data;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("unknown");
      if (current()) {
        setStored({ key: readKey, result: { status: "error", failure } });
      }
      throw failure;
    } finally {
      external?.removeEventListener("abort", cancel);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    let subscribed = true;
    void Promise.resolve()
      .then(() => {
        if (subscribed) {
          return reload();
        }
      })
      .catch(() => {});
    return () => {
      subscribed = false;
      active.current = false;
      controller.current?.abort();
    };
  }, [reload, key, load, generation, staff]);
  return { result: stored?.key === key ? stored.result : { status: "loading" }, reload };
}
