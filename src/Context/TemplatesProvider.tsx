import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TemplatesContext } from "./TemplatesContext";
import type { TemplateSnapshot } from "./TemplatesContext";
import { useStaffRead } from "../Hooks/useStaffRead";
import { useStaffOperation } from "../Hooks/useStaffOperation";
import * as services from "../Services/Templates";
import { executeTemplate } from "../Planning/commands";
import type { TemplateKind, TemplateCommand } from "../Planning/commands";
import { ApiError } from "../Types/failures";
import { isGuid } from "../Catalogue/query";
import { useAuth } from "../Hooks/useAuth";
import { sessionBoundary } from "../Security/sessionBoundary";

export function TemplatesProvider({
  kind,
  selectedId,
  scope,
  children,
}: {
  kind: TemplateKind;
  selectedId: string;
  scope: string;
  children: ReactNode;
}) {
  const { generation } = useAuth();
  const [snapshot, setSnapshot] = useState<TemplateSnapshot>();
  const [lastAction, setLastAction] = useState("");
  const [search, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActiveValue] = useState("");
  const removed = useRef(false);
  useEffect(() => {
    // Initial search is already applied. A timer for it could undo a quick move to the next page.
    if (search === query) {
      return;
    }
    const timeout = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, query]);
  const load = useCallback(
    async (signal: AbortSignal): Promise<TemplateSnapshot> => {
      function keep(data: TemplateSnapshot) {
        if (!signal.aborted && (sessionBoundary.stamp()?.generation ?? generation) === generation) {
          setSnapshot(data);
        }
        return data;
      }
      const queryArgs = { pageNumber: page, pageSize: 20, search: query, isActive: active === "" ? null : active === "true" };
      const result =
        kind === "stage"
          ? await services.getStageTemplates({ query: queryArgs }, { signal })
          : await services.getItemTemplates({ query: queryArgs }, { signal });
      if (!signal.aborted && page > Math.max(1, result.totalPages)) {
        setPage(Math.max(1, result.totalPages));
      }
      let detail = null;
      let missing = false;
      if (selectedId && !removed.current) {
        if (!isGuid(selectedId)) {
          return keep({ page: result, detail: null, missing: true });
        }
        try {
          detail =
            kind === "stage"
              ? await services.getStageTemplateById({ id: selectedId }, { signal })
              : await services.getItemTemplateById({ id: selectedId }, { signal });
          if (detail.id !== selectedId) {
            throw new ApiError("transport", { status: 200 });
          }
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) {
            throw error;
          }
          missing = true;
        }
      }
      return keep({ page: result, detail, missing });
    },
    [kind, page, query, active, selectedId, generation],
  );
  const read = useStaffRead(`${scope}:${page}:${query}:${active}`, load);
  const gate = useRef({ locked: false, unresolved: new Set<string>() });
  const action = useStaffOperation("templates", gate);

  async function refresh(signal: AbortSignal) {
    const data = await read.reload(signal);
    setSnapshot(data);
  }

  async function run(label: string, command: TemplateCommand) {
    if (read.result.status !== "success" || !snapshot) {
      return undefined;
    }
    setLastAction(label);
    return action.run({
      id: label,
      write: (signal) => executeTemplate(kind, command, snapshot.detail, signal),
      refresh: async (id, signal) => {
        if (command.kind === "create") {
          if (kind === "stage") {
            await services.getStageTemplateById({ id }, { signal });
          } else {
            await services.getItemTemplateById({ id }, { signal });
          }
        }
        if (command.kind === "delete") {
          removed.current = true;
        }
        await refresh(signal);
      },
      reconcile: refresh,
    });
  }

  const forbidden = read.result.status === "error" && [401, 403].includes(read.result.failure.status ?? 0);
  return (
    <TemplatesContext
      value={{
        scope,
        kind,
        selectedId,
        search,
        page,
        active,
        setSearch: setSearchValue,
        setPage,
        setActive: (value) => {
          setActiveValue(value);
          setPage(1);
        },
        read,
        snapshot: forbidden ? undefined : snapshot,
        action,
        lastAction,
        run,
      }}
    >
      {children}
    </TemplatesContext>
  );
}
