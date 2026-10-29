import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTemplates } from "../../Context/TemplatesContext";
import { EditorGuardProvider } from "../../Planning/EditorGuard";
import { useEditorGuard } from "../../Planning/editorDraft";
import { ConfirmButton, PlanningFeedback, PlanningForm, PlanningRead } from "../../Components/Planning/Shared";
import { planningPanel } from "../../Components/Planning/classes";
import { TemplateAssignments } from "../../Components/Planning/TemplateAssignments";
import { Input, Select } from "../../Components/Fields";
import { Button } from "../../Components/Button";
import { DataTable } from "../../Components/DataTable";
import { Pagination } from "../../Components/Pagination";
import { Alert } from "../../Components/Feedback";
import { routePaths } from "../../Router/routePaths";

function Workspace() {
  const { t } = useTranslation("timePlans");
  const context = useTemplates();
  const { snapshot, read, action, lastAction, run, selectedId, kind } = context;
  const guard = useEditorGuard();
  const navigate = useNavigate();
  const root = kind === "stage" ? routePaths.admin.stageTemplates : routePaths.admin.itemTemplates;
  const detail = snapshot?.detail;
  const disabled = action.pending || action.blocked || read.result.status !== "success";
  const [createdId, setCreatedId] = useState("");
  useEffect(() => {
    // Navigation happens after the form has accepted its draft and the pending lock has committed.
    if (createdId && !action.pending) {
      navigate(`${root}?id=${encodeURIComponent(createdId)}`);
    }
  }, [createdId, action.pending, navigate, root]);
  return (
    <div className="grid min-w-0 gap-7">
      <PlanningFeedback action={action} />
      <PlanningRead result={read.result} reload={read.reload} retained={Boolean(snapshot)} />
      <section className={planningPanel}>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="templates-search"
            label={t("searchTemplates")}
            value={context.search}
            disabled={action.pending}
            maxLength={100}
            onChange={(event) => context.setSearch(event.target.value)}
          />
          <Select
            id="templates-state"
            label={t("activeState")}
            value={context.active}
            disabled={action.pending}
            onChange={(event) => context.setActive(event.target.value)}
          >
            <option value="">{t("all")}</option>
            <option value="true">{t("active")}</option>
            <option value="false">{t("inactive")}</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link className="underline" to={`${root}?create=1`}>
            {t("createTemplate")}
          </Link>
          <Button variant="secondary" disabled={action.pending} onClick={() => void read.reload().catch(() => {})}>
            {t("refresh")}
          </Button>
        </div>
        {snapshot && (
          <>
            <DataTable
              caption={t(kind === "stage" ? "stageTemplates" : "itemTemplates")}
              scrollLabel={t("templatesList")}
              rows={[...snapshot.page.items]}
              rowKey={(row) => row.id}
              columns={[
                {
                  id: "name",
                  header: t("fields.name"),
                  render: (row) => (
                    <Link className="underline whitespace-normal break-words" dir="auto" to={`${root}?id=${encodeURIComponent(row.id)}`}>
                      {row.name}
                    </Link>
                  ),
                },
                { id: "code", header: t("fields.code"), render: (row) => <bdi dir="ltr">{row.code}</bdi> },
                { id: "active", header: t("activeState"), render: (row) => t(row.isActive ? "active" : "inactive") },
              ]}
            />
            <Pagination
              page={context.page}
              totalPages={snapshot.page.totalPages}
              pending={action.pending || read.result.status === "loading"}
              onPageChange={context.setPage}
            />
          </>
        )}
      </section>
      {snapshot?.missing && <Alert tone="error">{t("missingTemplate")}</Alert>}
      {snapshot && !snapshot.missing && (!selectedId || detail) && (
        <section className={planningPanel} aria-label={t("templateEditor")}>
          <PlanningForm
            key={`${detail?.id ?? "create"}:${guard.epoch}`}
            id="template"
            title={t(detail ? "editTemplate" : "createTemplate")}
            initial={{ name: detail?.name ?? "", code: detail?.code ?? "" }}
            disabled={disabled}
            pending={action.pending && lastAction === "template"}
            failure={lastAction === "template" ? action.failure : undefined}
            onSave={(value) => run("template", { kind: detail ? "update" : "create", input: { name: value.name!, code: value.code! } })}
            onSaved={(id) => {
              if (!detail) {
                setCreatedId(id);
              }
            }}
          />
          {detail && (
            <>
              <p>
                {t("activeState")}: {t(detail.isActive ? "active" : "inactive")}
              </p>
              <div className="flex flex-wrap gap-3">
                <ConfirmButton
                  title={t(detail.isActive ? "deactivateTemplate" : "activateTemplate")}
                  description={t("activationDescription")}
                  disabled={disabled}
                  pending={action.pending}
                  onConfirm={() => run("active", { kind: "active", isActive: !detail.isActive })}
                >
                  {t(detail.isActive ? "deactivateTemplate" : "activateTemplate")}
                </ConfirmButton>
                <ConfirmButton
                  title={t("deleteTemplate")}
                  description={t("deleteTemplateDescription")}
                  disabled={disabled}
                  pending={action.pending}
                  onConfirm={() => run("delete-template", { kind: "delete" })}
                >
                  {t("deleteTemplate")}
                </ConfirmButton>
              </div>
              {kind === "stage" && "items" in detail && (
                <TemplateAssignments key={`${detail.id}:${guard.epoch}`} source={detail} disabled={disabled} />
              )}
            </>
          )}
          {selectedId && !detail && <p>{t("templateDeleted")}</p>}
        </section>
      )}
      {snapshot && selectedId && !detail && !snapshot.missing && <Alert tone="success">{t("templateDeleted")}</Alert>}
    </div>
  );
}

export default function TemplatesWorkspace() {
  const { action } = useTemplates();
  return (
    <EditorGuardProvider pending={action.pending}>
      <Workspace />
    </EditorGuardProvider>
  );
}
