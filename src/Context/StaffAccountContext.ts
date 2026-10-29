import { createContext, useContext } from "react";
import type { useGovernanceResource } from "../Hooks/useGovernanceResource";
import type { UserDto } from "../Types/contracts";
import type { GovernanceFields } from "../Governance/policy";

export interface StaffAccountValue extends Omit<ReturnType<typeof useGovernanceResource<UserDto>>, "run"> {
  changePassword: (values: GovernanceFields) => Promise<string | undefined>;
}
export const StaffAccountContext = createContext<StaffAccountValue | null>(null);

export function useStaffAccount() {
  const value = useContext(StaffAccountContext);
  if (!value) {
    throw new Error("Staff account provider required.");
  }
  return value;
}
