import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../../Components/Button";
import { DataTable } from "../../../Components/DataTable";
import { Facts } from "../../../Components/Facts";
import { Pagination } from "../../../Components/Pagination";
import { governancePanel, StaffWorkspaceConfirm, StaffWorkspaceRead } from "../../../Components/StaffWorkspace";
import { EditorGuardProvider } from "../../../Forms/EditorGuard";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import { useTermsAdmin } from "./TermsAdminContext";

import { VersionForm } from "./VersionForm";

import { WriteFeedback } from "./Feedback";

export default function TermsWorkspace() {
  const context = useTermsAdmin();
  const { t } = useTranslation("governance");
  const { locale } = useLocale();
  const [search] = useSearchParams();
  const [created, setCreated] = useState("");
  const data = context.snapshot;
  const disabled = context.action.pending || context.action.blocked || context.read.result.status !== "success";
  return (
    <EditorGuardProvider pending={context.action.pending}>
      <WriteFeedback action={context.action} />
      <StaffWorkspaceRead result={context.read.result} reload={context.read.reload} />
      {data && (
        <>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-ui bg-primary px-5 py-3 text-white" to={`${routePaths.admin.terms}?create=1`}>
              {t("createTerms")}
            </Link>
            <Button variant="secondary" disabled={context.action.pending} onClick={() => void context.read.reload().catch(() => {})}>
              {t("refresh")}
            </Button>
            <Link className="self-center underline" to={routePaths.terms}>
              {t("publicTerms")}
            </Link>
          </div>
          {search.has("create") && (
            <section className={governancePanel}>
              <VersionForm
                id="terms-create"
                title={t("createTerms")}
                initial={{ title: "", versionNumber: "", effectiveDate: "", content: "" }}
                disabled={disabled}
                pending={context.action.pending}
                failure={context.action.failure}
                onSave={context.create}
                onSaved={setCreated}
                resetOnSuccess
              />
              {created && (
                <Link className="underline" to={routePaths.admin.term(created)}>
                  {t("viewCreated")}
                </Link>
              )}
            </section>
          )}
          {data.detail ? (
            <article className={governancePanel}>
              <h2 dir="auto" className="text-2xl font-medium [overflow-wrap:anywhere]">
                {data.detail.title}
              </h2>
              <Facts
                items={[
                  { label: t("fields.versionNumber"), value: data.detail.versionNumber },
                  { label: t("fields.effectiveDate"), value: formatDateTime(data.detail.effectiveDate, locale) },
                  { label: t("state"), value: t(data.detail.isActive ? "active" : "inactive") },
                ]}
              />
              <div dir="auto" className="whitespace-pre-wrap leading-9 [overflow-wrap:anywhere]">
                {data.detail.content}
              </div>
              <p className="text-sm text-muted">{t("immutableTerms")}</p>
              {!data.detail.isActive && (
                <StaffWorkspaceConfirm
                  title={t("activateTerms")}
                  description={t("activateDescription")}
                  pending={context.action.pending}
                  disabled={disabled}
                  onConfirm={() => context.activate(data.detail!.id)}
                >
                  {t("activateTerms")}
                </StaffWorkspaceConfirm>
              )}
            </article>
          ) : (
            <section className={governancePanel}>
              <DataTable
                caption={t("termsCaption")}
                scrollLabel={t("termsTable")}
                rows={[...data.page.items]}
                rowKey={(row) => row.id}
                pending={context.read.result.status !== "success"}
                columns={[
                  {
                    id: "title",
                    header: t("fields.title"),
                    render: (row) => (
                      <Link dir="auto" className="block max-w-72 underline [overflow-wrap:anywhere]" to={routePaths.admin.term(row.id)}>
                        {row.title}
                      </Link>
                    ),
                  },
                  { id: "version", header: t("fields.versionNumber"), render: (row) => row.versionNumber },
                  { id: "date", header: t("fields.effectiveDate"), render: (row) => formatDateTime(row.effectiveDate, locale) },
                  { id: "active", header: t("state"), render: (row) => t(row.isActive ? "active" : "inactive") },
                ]}
              />
              <Pagination page={context.page} totalPages={data.page.totalPages} pending={disabled} onPageChange={context.setPage} />
            </section>
          )}
        </>
      )}
    </EditorGuardProvider>
  );
}
