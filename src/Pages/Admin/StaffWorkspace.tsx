import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStaffAdmin } from "../../Context/StaffAdminContext";
import { routePaths } from "../../Router/routePaths";
import { GovernanceRead, GovernanceFeedback, GovernanceForm, GovernanceConfirm, governancePanel } from "../../Components/Governance/Shared";
import { DataTable } from "../../Components/DataTable";
import { Pagination } from "../../Components/Pagination";
import { Button } from "../../Components/Button";
import { Input, Select } from "../../Components/Fields";
import { Facts } from "../../Components/Catalogue/PropertyFacts";
import { EditorGuardProvider } from "../../Planning/EditorGuard";

export default function StaffWorkspace() {
  const context = useStaffAdmin();
  const { t } = useTranslation("governance");
  const [search] = useSearchParams();
  const [created, setCreated] = useState("");
  const data = context.snapshot;
  const detail = data?.detail;
  const disabled = context.action.pending || context.action.blocked || context.read.result.status !== "success";
  return <EditorGuardProvider pending={context.action.pending}>
    <GovernanceFeedback action={context.action} />
    <GovernanceRead result={context.read.result} reload={context.read.reload} />
    {data && <>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-ui bg-primary px-5 py-3 text-white" to={`${routePaths.admin.staff}?create=1`}>{t("createStaff")}</Link>
        <Button variant="secondary" disabled={context.action.pending} onClick={() => void context.read.reload().catch(() => {})}>{t("refresh")}</Button>
      </div>
      <p className="max-w-3xl text-sm text-muted">{t("staffRules")}</p>
      {search.has("create") && <section className={governancePanel}>
        <GovernanceForm id="staff-create" title={t("createStaff")} kind="createStaff" initial={{ name: "", email: "", phone: "", role: "1", password: "" }}
          disabled={disabled} pending={context.action.pending} failure={context.action.failure} onSave={(values) => context.execute({ kind: "create", values })}
          onSaved={setCreated} resetOnSuccess confirm={t("createStaffDescription")} />
        {created && <Link className="underline" to={routePaths.admin.staffUser(created)}>{t("viewCreated")}</Link>}
      </section>}
      {detail ? <section className={governancePanel}>
        <div data-private><Facts items={[
          { label: t("fields.name"), value: <bdi dir="auto">{detail.name}</bdi> },
          { label: t("fields.email"), value: <bdi dir="ltr">{detail.email}</bdi> },
          { label: t("fields.phone"), value: <bdi dir="ltr">{detail.phone}</bdi> },
          { label: t("fields.role"), value: t(`role.${detail.role}`) },
          { label: t("state"), value: t(detail.deletedAt === null ? "active" : "deleted") },
        ]} /></div>
        {detail.deletedAt === null && <GovernanceForm id={`staff-update-${detail.id}`} title={t("updateStaff")} kind="updateStaff"
          initial={{ name: detail.name, email: detail.email, phone: detail.phone, role: String(detail.role) }} disabled={disabled} pending={context.action.pending}
          failure={context.action.failure} onSave={(values) => context.execute({ kind: "update", values })} confirm={t("updateStaffDescription")} />}
        <GovernanceConfirm title={t(detail.deletedAt === null ? "deleteStaff" : "restoreStaff")} description={t(detail.deletedAt === null ? "deleteDescription" : "restoreDescription")}
          pending={context.action.pending} disabled={disabled} onConfirm={() => context.execute({ kind: detail.deletedAt === null ? "delete" : "restore" })}>
          {t(detail.deletedAt === null ? "deleteStaff" : "restoreStaff")}
        </GovernanceConfirm>
      </section> : <>
        <section className={`${governancePanel} bg-accent-light`} aria-label={t("filters")}>
          <fieldset disabled={context.action.pending} className="grid gap-5 md:grid-cols-3">
            <Input id="staff-search" label={t("searchStaff")} value={context.search} maxLength={100} onChange={(event) => context.setSearch(event.target.value)} />
            <Select id="staff-role" label={t("fields.role")} value={context.role} onChange={(event) => context.filter("role", event.target.value)}>
              <option value="">{t("all")}</option><option value="0">{t("role.0")}</option><option value="1">{t("role.1")}</option>
            </Select>
            <Select id="staff-deleted" label={t("state")} value={context.deleted} onChange={(event) => context.filter("deleted", event.target.value)}>
              <option value="">{t("all")}</option><option value="false">{t("active")}</option><option value="true">{t("deleted")}</option>
            </Select>
          </fieldset>
        </section>
        <section className={governancePanel}>
          <DataTable caption={t("staffCaption")} scrollLabel={t("staffTable")} rows={[...data.page.items]} rowKey={(row) => row.id} pending={context.read.result.status !== "success"} columns={[
            { id: "name", header: t("fields.name"), render: (row) => <Link className="block max-w-64 underline [overflow-wrap:anywhere]" to={routePaths.admin.staffUser(row.id)}><bdi data-private dir="auto">{row.name}</bdi></Link> },
            { id: "email", header: t("fields.email"), render: (row) => <bdi data-private dir="ltr">{row.email}</bdi> },
            { id: "phone", header: t("fields.phone"), render: (row) => <bdi data-private dir="ltr">{row.phone}</bdi> },
            { id: "role", header: t("fields.role"), render: (row) => t(`role.${row.role}`) },
            { id: "state", header: t("state"), render: (row) => t(row.deletedAt === null ? "active" : "deleted") },
          ]} />
          <Pagination page={context.page} totalPages={data.page.totalPages} pending={disabled} onPageChange={context.setPage} />
        </section>
      </>}
    </>}
  </EditorGuardProvider>;
}
