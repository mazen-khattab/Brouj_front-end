import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useActivityLogs } from "../../Context/ActivityLogsContext";
import { useLocale } from "../../Hooks/useLocale";
import { formatDateTime } from "../../i18n/format";
import { auditText } from "../../Governance/policy";
import type { ActivityLogDto } from "../../Types/contracts";
import { routePaths } from "../../Router/routePaths";
import { GovernanceRead, GovernanceForm, governancePanel } from "../../Components/Governance/Shared";
import { DataTable } from "../../Components/DataTable";
import { Pagination } from "../../Components/Pagination";
import { Button } from "../../Components/Button";
import { Facts } from "../../Components/Catalogue/PropertyFacts";
import { EditorGuardProvider } from "../../Planning/EditorGuard";

export default function AuditWorkspace() {
  const context = useActivityLogs();
  const { t } = useTranslation("governance");
  const { locale } = useLocale();
  const { logId } = useParams();
  const data = context.read.result.status === "success" ? context.read.result.data : undefined;

  function text(value: unknown) {
    return auditText(value) ?? t("unavailable");
  }

  function time(value: unknown) {
    try {
      return typeof value === "string" ? formatDateTime(value, locale) : t("unavailable");
    } catch {
      return t("unavailable");
    }
  }

  function action(row: ActivityLogDto) {
    return typeof row.action === "number" && [0, 1, 2].includes(row.action) ? t(`action.${row.action}`) : t("unavailable");
  }

  return <EditorGuardProvider pending={false}>
    {!logId && <section className={governancePanel}>
      <GovernanceForm id="audit-filters" title={t("filters")} kind="auditFilters" initial={{ userId: "", entityType: "", action: "", dateFrom: "", dateTo: "" }}
        disabled={context.read.result.status === "loading"} pending={false} onSave={async (values) => { context.apply({ ...values }); return "applied"; }} />
    </section>}
    <GovernanceRead result={context.read.result} reload={context.read.reload} />
    {data && <section className={governancePanel}>
      <Button variant="secondary" onClick={() => void context.read.reload().catch(() => {})}>{t("refresh")}</Button>
      {data.detail ? <>
        <h2 className="text-2xl font-medium">{t("auditDetail")}</h2>
        <div data-private><Facts items={[
          { label: t("actorId"), value: <bdi dir="ltr">{text(data.detail.userId)}</bdi> },
          { label: t("fields.entityType"), value: <bdi dir="auto">{text(data.detail.entityType)}</bdi> },
          { label: t("resourceId"), value: <bdi dir="ltr">{text(data.detail.entityId)}</bdi> },
          { label: t("fields.action"), value: action(data.detail) },
          { label: t("time"), value: time(data.detail.createdAt) },
        ]} /></div>
        <p className="text-sm text-muted">{t("auditBoundary")}</p>
      </> : <>
        <DataTable caption={t("auditCaption")} scrollLabel={t("auditTable")} rows={[...data.page.items]} rowKey={(row) => row.id} columns={[
          { id: "time", header: t("time"), render: (row) => <Link className="underline" to={routePaths.admin.activityLog(row.id)}>{time(row.createdAt)}</Link> },
          { id: "actor", header: t("actorId"), render: (row) => <bdi dir="ltr" data-private>{text(row.userId)}</bdi> },
          { id: "type", header: t("fields.entityType"), render: (row) => <bdi dir="auto" data-private className="block max-w-64 [overflow-wrap:anywhere]">{text(row.entityType)}</bdi> },
          { id: "resource", header: t("resourceId"), render: (row) => <bdi dir="ltr" data-private>{text(row.entityId)}</bdi> },
          { id: "action", header: t("fields.action"), render: action },
        ]} />
        <Pagination page={context.page} totalPages={data.page.totalPages} onPageChange={context.setPage} />
      </>}
    </section>}
  </EditorGuardProvider>;
}
