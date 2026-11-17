import { createContext, useContext } from "react";
import type { useStaffResource } from "../../../Hooks/useStaffResource";
import type { UserDto } from "../../../Types/contracts";
import type { PasswordValues } from "./types";

export interface StaffAccountValue extends Omit<ReturnType<typeof useStaffResource<UserDto>>, "run"> {
  changePassword: (values: PasswordValues) => Promise<string | undefined>;
}
export const StaffAccountContext = createContext<StaffAccountValue | null>(null);

export function useStaffAccount() {
  const value = useContext(StaffAccountContext);
  if (!value) {
    throw new Error("Staff account provider required.");
  }
  return value;
}
