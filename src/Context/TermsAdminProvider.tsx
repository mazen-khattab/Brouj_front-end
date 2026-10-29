import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { TermsAdminContext } from "./TermsAdminContext";
import { useGovernanceResource } from "../Hooks/useGovernanceResource";
import * as terms from "../Services/Terms";
import { termsInput } from "../Governance/policy";
import type { GovernanceFields } from "../Governance/policy";
import { invalidateCatalogue } from "../Catalogue/invalidation";
import { isGuid } from "../Catalogue/query";
import { ApiError } from "../Types/failures";

export function TermsAdminProvider({ scope, id, children }: { scope: string; id?: string | undefined; children: ReactNode }) {
  const [page, setPage] = useState(1);
  const load = useCallback(async (signal: AbortSignal) => {
    if (id && !isGuid(id)) {
      throw new ApiError("transport", { status: 404 });
    }
    const result = await terms.getTermsAndConditionsVersions({ query: { pageNumber: page, pageSize: 20 } }, { signal });
    if (!signal.aborted && page > Math.max(1, result.totalPages)) {
      setPage(Math.max(1, result.totalPages));
    }
    const detail = id ? await terms.getTermsAndConditionsById({ id }, { signal }) : null;
    if (detail && detail.id !== id) {
      throw new ApiError("transport", { status: 200 });
    }
    return { page: result, detail };
  }, [page, id]);
  const resource = useGovernanceResource(`${scope}:${page}`, load);

  async function create(values: GovernanceFields) {
    return resource.run({
      id: "create",
      write: (signal) => terms.createTermsAndConditionsVersion({ body: termsInput(values) }, { signal }),
      refresh: async (createdId, signal) => {
        await terms.getTermsAndConditionsById({ id: createdId }, { signal });
        await resource.read.reload(signal);
      },
      reconcile: (signal) => resource.read.reload(signal),
    });
  }

  async function activate(targetId: string) {
    if (resource.snapshot?.detail?.id !== targetId) {
      return undefined;
    }
    return resource.run({
      id: targetId,
      write: (signal) => terms.activateTermsAndConditions({ id: targetId }, { signal }),
      refresh: async (_returnedId, signal) => {
        // Public terms subscribe to the same in-memory invalidation boundary.
        invalidateCatalogue();
        await resource.read.reload(signal);
      },
      reconcile: async (signal) => {
        invalidateCatalogue();
        await resource.read.reload(signal);
      },
    });
  }

  return <TermsAdminContext value={{ ...resource, page, setPage, create, activate }}>{children}</TermsAdminContext>;
}
