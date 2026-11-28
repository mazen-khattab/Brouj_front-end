import type { ReactNode } from "react";
import { usePublicProject } from "../../../Hooks/usePublicProject";
import { DetailContext } from "./DetailContext";
export function DetailProvider({ id, children }: { id: string | undefined; children: ReactNode }) {
  const read = usePublicProject(id);
  return <DetailContext value={read}>{children}</DetailContext>;
}
