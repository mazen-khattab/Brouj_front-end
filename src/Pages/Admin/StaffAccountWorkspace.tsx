import { useTranslation } from "react-i18next";
import { useStaffAccount } from "../../Context/StaffAccountContext";
import { GovernanceRead, GovernanceFeedback, GovernanceForm, governancePanel } from "../../Components/Governance/Shared";
import { Facts } from "../../Components/Catalogue/PropertyFacts";
import { EditorGuardProvider } from "../../Planning/EditorGuard";

export default function StaffAccountWorkspace() {
  const context = useStaffAccount();
  const { t } = useTranslation("governance");
  const profile = context.snapshot;
  return <EditorGuardProvider pending={context.action.pending}>
    <GovernanceFeedback action={context.action} password />
    <GovernanceRead result={context.read.result} reload={context.read.reload} />
    {profile && <>
      <section className={governancePanel}>
        <h2 className="text-2xl font-medium">{t("staffAccount")}</h2>
        <div data-private><Facts items={[
          { label: t("fields.name"), value: <bdi dir="auto">{profile.name}</bdi> },
          { label: t("fields.email"), value: <bdi dir="ltr">{profile.email}</bdi> },
          { label: t("fields.phone"), value: <bdi dir="ltr">{profile.phone}</bdi> },
          { label: t("fields.role"), value: t(`role.${profile.role}`) },
        ]} /></div>
        <p className="text-sm text-muted">{t("profileBoundary")}</p>
      </section>
      <section className={governancePanel}>
        <GovernanceForm id="staff-password" title={t("changePassword")} kind="password" initial={{ currentPassword: "", newPassword: "" }}
          disabled={context.action.pending || context.action.blocked || context.read.result.status !== "success"} pending={context.action.pending}
          failure={context.action.failure} onSave={context.changePassword} resetOnSuccess />
        <p className="text-sm text-muted">{t("passwordBoundary")}</p>
      </section>
    </>}
  </EditorGuardProvider>;
}
