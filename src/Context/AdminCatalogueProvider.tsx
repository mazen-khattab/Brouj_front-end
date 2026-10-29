import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminCatalogueContext } from "./AdminCatalogueContext";
import { useAuth } from "../Hooks/useAuth";
import { sessionBoundary } from "../Security/sessionBoundary";
import { ApiError } from "../Types/failures";
import { uncertainWrite } from "../Account/policy";
import { isGuid } from "../Catalogue/query";
import { invalidateCatalogue } from "../Catalogue/invalidation";
import { Dialog } from "../Components/Dialog";
import { Button } from "../Components/Button";

export function AdminCatalogueProvider({ children, scope }: { children: ReactNode; scope: string }) {
  const auth = useAuth();
  const { t } = useTranslation("admin");
  const active = useRef(false);
  const lock = useRef(false);
  const unresolved = useRef(false);
  const dirty = useRef(new Set<string>());
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState({
    pending: false,
    blocked: false,
    uncertain: false,
    succeeded: false,
    failure: undefined as ApiError | undefined,
  });
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const currentMode = new URLSearchParams(currentLocation.search);
    const nextMode = new URLSearchParams(nextLocation.search);
    // Paging/search inside this editor retains its drafts. Only a route or create-mode change discards them.
    const leavesEditor =
      currentLocation.pathname !== nextLocation.pathname ||
      currentMode.get("create") !== nextMode.get("create") ||
      currentMode.get("createUnit") !== nextMode.get("createUnit");
    return (lock.current || dirty.current.size > 0) && leavesEditor;
  });
  useEffect(() => {
    active.current = true;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current.size || lock.current) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      active.current = false;
      request.current?.abort();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  function current() {
    return active.current && auth.actor === "staff" && (sessionBoundary.stamp()?.generation ?? auth.generation) === auth.generation;
  }

  async function check(refresh: () => Promise<unknown>) {
    if (lock.current || !current()) {
      return;
    }
    lock.current = true;
    setState((old) => ({ ...old, pending: true }));
    try {
      await refresh();
      if (current()) {
        unresolved.current = false;
        setState({ pending: false, blocked: false, uncertain: false, succeeded: false, failure: undefined });
      }
    } catch (error) {
      if (current()) {
        setState((old) => ({ ...old, pending: false, blocked: true, failure: error instanceof ApiError ? error : new ApiError("unknown") }));
      }
    } finally {
      lock.current = false;
    }
  }

  async function run(work: (signal: AbortSignal) => Promise<string>, refresh: () => Promise<unknown>, conflictRefresh = refresh) {
    if (!current() || lock.current || unresolved.current) {
      return undefined;
    }
    lock.current = true;
    const controller = new AbortController();
    request.current = controller;
    setState({ pending: true, blocked: false, uncertain: false, succeeded: false, failure: undefined });
    try {
      const id = await work(controller.signal);
      if (!current() || controller.signal.aborted) {
        return undefined;
      }
      if (!isGuid(id)) {
        throw new ApiError("transport", { status: 200 });
      }
      invalidateCatalogue();
      // Keep the write lock until the authoritative refresh completes. A read failure must not invite a duplicate write.
      try {
        await refresh();
      } catch (error) {
        unresolved.current = true;
        if (current()) {
          setState({
            pending: false,
            blocked: true,
            uncertain: true,
            succeeded: false,
            failure: error instanceof ApiError ? error : new ApiError("unknown"),
          });
        }
        return undefined;
      }
      if (!current()) {
        return undefined;
      }
      setState({ pending: false, blocked: false, uncertain: false, succeeded: true, failure: undefined });
      return id;
    } catch (error) {
      const failure = error instanceof ApiError ? error : new ApiError("unknown");
      if (!current() || controller.signal.aborted) {
        return undefined;
      }
      let blocked = uncertainWrite(failure);
      if (failure.status === 409) {
        try {
          await conflictRefresh();
        } catch {
          blocked = true;
        }
      }
      unresolved.current = blocked;
      if (current()) {
        setState({ pending: false, blocked, uncertain: uncertainWrite(failure), succeeded: false, failure });
      }
      return undefined;
    } finally {
      lock.current = false;
      if (request.current === controller) {
        request.current = null;
      }
    }
  }

  return (
    <AdminCatalogueContext
      value={{
        ...state,
        scope,
        run,
        check,
        discardDrafts: () => dirty.current.clear(),
        markDirty: (form, value) => {
          if (value) {
            dirty.current.add(form);
          } else {
            dirty.current.delete(form);
          }
        },
      }}
    >
      {children}
      <Dialog
        open={blocker.state === "blocked"}
        title={t("leaveTitle")}
        description={t("leaveDescription")}
        pending={state.pending}
        onClose={() => blocker.reset?.()}
      >
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={state.pending}
            onClick={() => {
              dirty.current.clear();
              blocker.proceed?.();
            }}
          >
            {t("discard")}
          </Button>
          <Button variant="secondary" disabled={state.pending} onClick={() => blocker.reset?.()}>
            {t("stay")}
          </Button>
        </div>
      </Dialog>
    </AdminCatalogueContext>
  );
}
