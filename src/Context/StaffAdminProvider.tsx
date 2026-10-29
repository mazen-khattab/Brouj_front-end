import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StaffAdminContext } from "./StaffAdminContext";
import type { StaffCommand } from "./StaffAdminContext";
import { useGovernanceResource } from "../Hooks/useGovernanceResource";
import { useAuth } from "../Hooks/useAuth";
import * as staff from "../Services/StaffAdmin";
import { createStaffInput, staffInput } from "../Governance/policy";
import { isGuid } from "../Catalogue/query";
import { ApiError } from "../Types/failures";

export function StaffAdminProvider({ scope, id, children }: { scope: string; id?: string | undefined; children: ReactNode }) {
  const auth = useAuth();
  const allowed = auth.actor === "staff" && auth.role === 0;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [deleted, setDeleted] = useState("");
  useEffect(() => {
    if (search === query) {
      return;
    }
    const timeout = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  }, [search, query]);
  const load = useCallback(async (signal: AbortSignal) => {
    if (!allowed) {
      throw new ApiError("transport", { status: 403 });
    }
    if (id && !isGuid(id)) {
      throw new ApiError("transport", { status: 404 });
    }
    const result = await staff.getUsers({ query: {
      pageNumber: page, pageSize: 20, search: query, role: role === "" ? null : Number(role) as 0 | 1,
      isDeleted: deleted === "" ? null : deleted === "true",
    } }, { signal });
    if (!signal.aborted && page > Math.max(1, result.totalPages)) {
      setPage(Math.max(1, result.totalPages));
    }
    const detail = id ? await staff.getUserById({ id }, { signal }) : null;
    if (detail && detail.id !== id) {
      throw new ApiError("transport", { status: 200 });
    }
    return { page: result, detail };
  }, [allowed, page, id, query, role, deleted]);
  const resource = useGovernanceResource(`${scope}:${page}:${query}:${role}:${deleted}`, load);

  async function refresh(signal: AbortSignal) {
    await resource.read.reload(signal);
    await auth.reloadIdentity();
  }

  async function execute(command: StaffCommand) {
    if (!allowed || (command.kind !== "create" && !resource.snapshot?.detail)) {
      return undefined;
    }
    return resource.run({
      id: command.kind,
      write: (signal) => {
        if (command.kind === "create") {
          return staff.createUser({ body: createStaffInput(command.values) }, { signal });
        }
        const targetId = resource.snapshot!.detail!.id;
        if (command.kind === "update") {
          return staff.updateUser({ id: targetId, body: staffInput(command.values) }, { signal });
        }
        return command.kind === "delete" ? staff.softDeleteUser({ id: targetId }, { signal }) : staff.restoreUser({ id: targetId }, { signal });
      },
      refresh: async (returnedId, signal) => {
        if (command.kind === "create") {
          await staff.getUserById({ id: returnedId }, { signal });
        }
        await refresh(signal);
      },
      reconcile: refresh,
    });
  }

  return <StaffAdminContext value={{ ...resource, page, setPage, search, setSearch, role, deleted,
    filter: (field, value) => { (field === "role" ? setRole : setDeleted)(value); setPage(1); }, execute,
  }}>{children}</StaffAdminContext>;
}
