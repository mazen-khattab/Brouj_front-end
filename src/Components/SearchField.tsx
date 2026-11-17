import { useEffect, useState } from "react";
import { Input } from "./Fields";

export function SearchField({
  value,
  onCommit,
  label,
  id,
  autoFocus = false,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  id: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [observed, setObserved] = useState(value);
  if (observed !== value) {
    setObserved(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft.trim() === value) {
      return;
    }
    const timer = window.setTimeout(() => onCommit(draft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value, onCommit]);

  return (
    <Input
      id={id}
      type="search"
      label={label}
      maxLength={100}
      value={draft}
      autoFocus={autoFocus}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
