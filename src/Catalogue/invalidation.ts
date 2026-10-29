import { useEffect } from "react";

const changes = new EventTarget();

/** Mounted public/admin views re-read after a write; there is no persistent catalogue cache. */
export function invalidateCatalogue() {
  changes.dispatchEvent(new Event("changed"));
}

export function useCatalogueInvalidation(reload: () => void) {
  useEffect(() => {
    changes.addEventListener("changed", reload);
    return () => changes.removeEventListener("changed", reload);
  }, [reload]);
}
