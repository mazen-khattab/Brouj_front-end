import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useBlocker } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dialog } from "../Components/Dialog";
import { Button } from "../Components/Button";

import { GuardContext } from "./editorDraft";

/** Both local hierarchy changes and router navigation consult the same in-memory drafts. */
export function EditorGuardProvider({ pending, children }: { pending: boolean; children: ReactNode }) {
  const { t } = useTranslation("timePlans");
  const dirty = useRef(new Set<string>());
  const [dirtyCount, setDirtyCount] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [next, setNext] = useState<(() => void) | null>(null);
  const pendingRef = useRef(pending);
  useLayoutEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  // The router keeps its blocker callback between commits. Read the latest lock, not an older render.
  const blocker = useBlocker(() => pendingRef.current || dirty.current.size > 0);
  const mark = useCallback((id: string, value: boolean) => {
    if (value) {
      dirty.current.add(id);
    } else {
      dirty.current.delete(id);
    }
    setDirtyCount(dirty.current.size);
  }, []);
  useEffect(() => {
    function unload(event: BeforeUnloadEvent) {
      if (pending || dirty.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [pending, dirtyCount]);

  function transition(callback: () => void) {
    if (pending) {
      return;
    }
    if (dirty.current.size) {
      setNext(() => callback);
    } else {
      callback();
    }
  }

  function discard() {
    if (pending) {
      return;
    }
    dirty.current.clear();
    setDirtyCount(0);
    setEpoch((value) => value + 1);
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else {
      next?.();
    }
    setNext(null);
  }

  function close() {
    if (pending) {
      return;
    }
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    setNext(null);
  }

  return (
    <GuardContext value={{ epoch, mark, transition }}>
      {children}
      <Dialog
        open={Boolean(next) || blocker.state === "blocked"}
        title={t("discardTitle")}
        description={t(pending ? "wait" : "discardDescription")}
        pending={pending}
        onClose={close}
      >
        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={discard}>
            {t("discard")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={close}>
            {t("keepEditing")}
          </Button>
        </div>
      </Dialog>
    </GuardContext>
  );
}
