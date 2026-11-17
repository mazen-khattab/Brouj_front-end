import type { ReactNode } from "react";
import { useCallback } from "react";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { getActiveTermsAndConditions } from "../../../Services/Terms";
import { TermsContext } from "./TermsContext";
export function TermsProvider({ children }: { children: ReactNode }) {
  const load = useCallback((signal: AbortSignal) => getActiveTermsAndConditions({ signal }), []);
  const read = useResourceRead("public-terms", load);
  usePublicContentInvalidation(read.reload);
  return <TermsContext value={read}>{children}</TermsContext>;
}
