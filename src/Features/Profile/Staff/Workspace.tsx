import { useTranslation } from "react-i18next";
import { Facts } from "../../../Components/Facts";
import { governancePanel, StaffWorkspaceRead } from "../../../Components/StaffWorkspace";
import { EditorGuardProvider } from "../../../Forms/EditorGuard";
import { useStaffAccount } from "./StaffAccountContext";

import { PasswordForm } from "./PasswordForm";

import { WriteFeedback } from "./Feedback";

export default function StaffAccountWorkspace() {
  const context = useStaffAccount();
  const { t } = useTranslation("governance");
  const profile = context.snapshot;
  return (
    <EditorGuardProvider pending={context.action.pending}>
      <WriteFeedback action={context.action} />
      <StaffWorkspaceRead result={context.read.result} reload={context.read.reload} />
      {profile && (
        <>
          <section className={governancePanel}>
            <h2 className="text-2xl font-medium">{t("staffAccount")}</h2>
            <div data-private>
              <Facts
                items={[
                  { label: t("fields.name"), value: <bdi dir="auto">{profile.name}</bdi> },
                  { label: t("fields.email"), value: <bdi dir="ltr">{profile.email}</bdi> },
                  { label: t("fields.phone"), value: <bdi dir="ltr">{profile.phone}</bdi> },
                  { label: t("fields.role"), value: t(`role.${profile.role}`) },
                ]}
              />
            </div>
            <p className="text-sm text-muted">{t("profileBoundary")}</p>
          </section>
          <section className={governancePanel}>
            <PasswordForm
              id="staff-password"
              title={t("changePassword")}
              initial={{ currentPassword: "", newPassword: "" }}
              disabled={context.action.pending || context.action.blocked || context.read.result.status !== "success"}
              pending={context.action.pending}
              failure={context.action.failure}
              onSave={context.changePassword}
              resetOnSuccess
            />
            <p className="text-sm text-muted">{t("passwordBoundary")}</p>
          </section>
        </>
      )}
    </EditorGuardProvider>
  );
}
