import type { ReactNode } from "react";
import { useCallback } from "react";
import { useAuth } from "../../../Hooks/useAuth";
import { useStaffResource } from "../../../Hooks/useStaffResource";
import { changeUserPassword, getCurrentUser } from "../../../Services/StaffProfile";
import { StaffAccountContext } from "./StaffAccountContext";
import type { PasswordValues } from "./types";

export function StaffAccountProvider({ scope, children }: { scope: string; children: ReactNode }) {
  const auth = useAuth();
  const load = useCallback((signal: AbortSignal) => getCurrentUser({ signal }), []);
  const resource = useStaffResource(scope, load);

  async function refresh(signal: AbortSignal) {
    await resource.read.reload(signal);
    await auth.reloadIdentity();
  }

  async function changePassword(values: PasswordValues) {
    return resource.run({
      id: "password",
      // Wrong-current-password is a business 401, so it must not rotate cookies or replay credentials.
      write: (signal) =>
        changeUserPassword(
          { body: { currentPassword: values.currentPassword!, newPassword: values.newPassword! } },
          { signal, skipAuthenticationRecovery: true },
        ),
      refresh: (_returnedId, signal) => refresh(signal),
      reconcile: refresh,
    });
  }

  return <StaffAccountContext value={{ ...resource, changePassword }}>{children}</StaffAccountContext>;
}
