import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface GuardValue {
  epoch: number;
  mark: (id: string, value: boolean) => void;
  transition: (next: () => void) => void;
}
export const GuardContext = createContext<GuardValue | null>(null);

export function useEditorGuard() {
  const value = useContext(GuardContext);
  if (!value) {
    throw new Error("Editor guard required.");
  }
  return value;
}

export function useEditorDraft<T>(id: string, initial: T) {
  const { mark } = useEditorGuard();
  const serialized = JSON.stringify(initial);
  const baseline = useRef(serialized);
  const current = useRef(serialized);
  const [value, setValue] = useState(initial);
  useEffect(() => {
    // Reload clean fields, but never erase a draft after a conflict or failed upload.
    if (current.current === baseline.current) {
      baseline.current = serialized;
      current.current = serialized;
      setValue(JSON.parse(serialized) as T);
    }
  }, [serialized]);
  useEffect(() => () => mark(id, false), [id, mark]);

  function update(nextValue: T) {
    current.current = JSON.stringify(nextValue);
    setValue(nextValue);
    mark(id, current.current !== baseline.current);
  }

  function accept() {
    baseline.current = current.current;
    mark(id, false);
  }

  function reset() {
    current.current = serialized;
    baseline.current = serialized;
    setValue(initial);
    mark(id, false);
  }

  return { value, update, accept, reset };
}
