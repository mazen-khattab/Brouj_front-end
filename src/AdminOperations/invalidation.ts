import { useEffect } from "react";
import type { OperationsKind } from "./policy";

const changes = new EventTarget();
interface Change {
  kinds: OperationsKind[];
  source: string;
}

export function invalidateOperations(kinds: OperationsKind[], source: string) {
  changes.dispatchEvent(new CustomEvent<Change>("changed", { detail: { kinds, source } }));
}

/** Other mounted views refresh; the initiating provider already awaits its own authoritative read. */
export function useOperationsInvalidation(kind: OperationsKind, scope: string, reload: () => Promise<unknown>) {
  useEffect(() => {
    function changed(event: Event) {
      const { kinds, source } = (event as CustomEvent<Change>).detail;
      if (source !== scope && kinds.includes(kind)) {
        void reload().catch(() => {});
      }
    }
    changes.addEventListener("changed", changed);
    return () => changes.removeEventListener("changed", changed);
  }, [kind, scope, reload]);
}
