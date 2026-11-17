import { createContext, useContext } from "react";
import type { ResourceRead } from "../../../Hooks/useResourceRead";
import type { CurrentCustomerDto } from "../../../Types/contracts";
export const ProfileDataContext = createContext<{ result: ResourceRead<CurrentCustomerDto>; reload: () => void } | null>(null);
export function useProfileData() {
  const value = useContext(ProfileDataContext);
  if (!value) throw new Error("ProfileDataProvider required.");
  return value;
}
