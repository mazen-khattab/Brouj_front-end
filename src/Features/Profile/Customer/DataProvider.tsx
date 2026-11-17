import type { ReactNode } from "react";
import { useCallback } from "react";
import { useAuth } from "../../../Hooks/useAuth";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { getCurrentCustomer } from "../../../Services/CustomerProfile";
import { ApiError } from "../../../Types/failures";
import { ProfileDataContext } from "./DataContext";

export function ProfileDataProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { reloadIdentity } = auth;
  const allowed = auth.actor === "customer";
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!allowed) throw new ApiError("transport", { status: 403 });
      try {
        return await getCurrentCustomer({ signal });
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status ?? 0)) await reloadIdentity();
        throw error;
      }
    },
    [allowed, reloadIdentity],
  );
  const scope = auth.actor ? [auth.actor, auth.profile.id, auth.generation].join(":") : "anonymous";
  const read = useResourceRead("profile:" + scope, load, allowed);
  return <ProfileDataContext value={read}>{children}</ProfileDataContext>;
}
