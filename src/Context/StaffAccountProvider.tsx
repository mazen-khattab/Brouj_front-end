import { useCallback } from "react";
import type { ReactNode } from "react";
import { StaffAccountContext } from "./StaffAccountContext";
import { useGovernanceResource } from "../Hooks/useGovernanceResource";
import { useAuth } from "../Hooks/useAuth";
import { getCurrentUser, changeUserPassword } from "../Services/StaffProfile";
import type { GovernanceFields } from "../Governance/policy";

export function StaffAccountProvider({ scope, children }: { scope: string; children: ReactNode }) {
  const auth = useAuth();
  const load = useCallback((signal: AbortSignal) => getCurrentUser({ signal }), []);
  const resource = useGovernanceResource(scope, load);

  async function refresh(signal: AbortSignal) {
    await resource.read.reload(signal);
    await auth.reloadIdentity();
  }

  async function changePassword(values: GovernanceFields) {
    return resource.run({
      id: "password",
      // Wrong-current-password is a business 401, so it must not rotate cookies or replay credentials.
      write: (signal) => changeUserPassword({ body: { currentPassword: values.currentPassword!, newPassword: values.newPassword! } }, { signal, skipAuthenticationRecovery: true }),
      refresh: (_returnedId, signal) => refresh(signal),
      reconcile: refresh,
    });
  }

  return <StaffAccountContext value={{ ...resource, changePassword }}>{children}</StaffAccountContext>;
}
