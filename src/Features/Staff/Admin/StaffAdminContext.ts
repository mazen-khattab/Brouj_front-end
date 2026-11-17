import { createContext, useContext } from "react";
import type { useStaffResource } from "../../../Hooks/useStaffResource";
import type { PaginationResult, UserDto } from "../../../Types/contracts";
import type { CreateStaffValues, StaffValues } from "./types";

export interface StaffSnapshot {
  page: PaginationResult<UserDto>;
  detail: UserDto | null;
}
export type StaffCommand = { kind: "create"; values: CreateStaffValues } | { kind: "update"; values: StaffValues } | { kind: "delete" | "restore" };
export interface StaffAdminValue extends Omit<ReturnType<typeof useStaffResource<StaffSnapshot>>, "run"> {
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (search: string) => void;
  role: string;
  deleted: string;
  filter: (field: "role" | "deleted", value: string) => void;
  execute: (command: StaffCommand) => Promise<string | undefined>;
}
export const StaffAdminContext = createContext<StaffAdminValue | null>(null);

export function useStaffAdmin() {
  const value = useContext(StaffAdminContext);
  if (!value) {
    throw new Error("Staff admin provider required.");
  }
  return value;
}
