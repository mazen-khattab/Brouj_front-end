import { createContext, useContext } from "react";
import type { PaginationResult, StageTemplateListDto, ItemTemplateListDto } from "../Types/contracts";
import type { StaffRead } from "../Hooks/useStaffRead";
import type { StaffOperation } from "../Hooks/useStaffOperation";
import type { TemplateKind, TemplateCommand, TemplateRecord } from "../Planning/commands";

export interface TemplateSnapshot {
  page: PaginationResult<StageTemplateListDto | ItemTemplateListDto>;
  detail: TemplateRecord | null;
  missing: boolean;
}
export interface TemplatesValue {
  scope: string;
  kind: TemplateKind;
  selectedId: string;
  search: string;
  page: number;
  active: string;
  setSearch: (value: string) => void;
  setPage: (value: number) => void;
  setActive: (value: string) => void;
  read: StaffRead<TemplateSnapshot>;
  snapshot: TemplateSnapshot | undefined;
  action: StaffOperation;
  lastAction: string;
  run: (label: string, command: TemplateCommand) => Promise<string | undefined>;
}
export const TemplatesContext = createContext<TemplatesValue | null>(null);

export function useTemplates() {
  const value = useContext(TemplatesContext);
  if (!value) {
    throw new Error("Templates provider required.");
  }
  return value;
}
