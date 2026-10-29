import { useCallback, useEffect, useRef, useState } from "react";
import { readRecord } from "../AdminCatalogue/model";
import type { Kind, RecordData } from "../AdminCatalogue/model";
import { ApiError } from "../Types/failures";
import { sessionBoundary } from "../Security/sessionBoundary";
import { isGuid } from "../Catalogue/query";

/** Keep the editor mounted during refresh so conflicts and read outages cannot erase its draft. */
export function useAdminRecord(kind: Kind, id: string, projectId: string, generation: number) {
  const [data, setData] = useState<RecordData>();
  const [failure, setFailure] = useState<ApiError>();
  const [pending, setPending] = useState(true);
  const active = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const latest = useRef(0);
  const reload = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const sequence = ++latest.current;
    setPending(true);
    try {
      if (!isGuid(id) || (kind === "unit" && !isGuid(projectId))) {
        throw new ApiError("transport", { status: 404 });
      }
      const value = await readRecord(kind, id, projectId, request.signal);
      if (
        !active.current ||
        request.signal.aborted ||
        sequence !== latest.current ||
        (sessionBoundary.stamp()?.generation ?? generation) !== generation
      ) {
        throw new ApiError("canceled");
      }
      setData(value);
      setFailure(undefined);
      return value;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("unknown");
      if (active.current && !request.signal.aborted && sequence === latest.current) {
        setFailure(failure);
      }
      throw failure;
    } finally {
      if (active.current && !request.signal.aborted && sequence === latest.current) {
        setPending(false);
      }
    }
  }, [kind, id, projectId, generation]);
  useEffect(() => {
    active.current = true;
    void Promise.resolve()
      .then(reload)
      .catch(() => {
        /* The localized read panel displays failures. */
      });
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [reload]);
  return { data, failure, pending, reload };
}
