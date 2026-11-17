import { getProjects } from "../../../Services/Projects";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../../Realtime/publicContentInvalidation";
import { useProjectEditor } from "./EditorContext";
import { routePaths } from "../../../Router/browserPaths";
import { DataTable } from "../../../Components/DataTable";
import { Input } from "../../../Components/Fields";
import { Pagination } from "../../../Components/Pagination";
import { Loading, ErrorPanel } from "../../../Components/Feedback";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import { AdminActionFeedback } from "./Feedback";
import ProjectForm from "./ProjectForm";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";

interface Row {
  id: string;
  name: string;
  parent: string;
}

export default function ProjectList() {
  const { t } = useTranslation("admin");
  const { scope } = useProjectEditor();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const create = params.get("create") === "1";
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const queryArgs = { pageNumber: page, pageSize: 20, search: query };
      const result = await getProjects({ query: queryArgs }, { signal });
      return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.name, parent: row.areaName })) };
    },
    [page, query],
  );
  const read = useResourceRead(`${scope}:project:${page}:${query}`, load);
  usePublicContentInvalidation(read.reload);

  async function refresh() {
    await load(new AbortController().signal);
    read.reload();
  }

  function changePage(next: number) {
    const updated = new URLSearchParams(params);
    updated.set("page", String(next));
    setParams(updated, { preventScrollReset: true });
  }

  if (create) {
    return (
      <section className={panel}>
        <AdminActionFeedback refresh={refresh} />
        <ProjectForm refresh={refresh} />
        <Link to={pathname}>{t("backToList")}</Link>
      </section>
    );
  }
  return (
    <section className={`${panel} overflow-hidden`} aria-label={t("records")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{t("records")}</h2>
        <Link className="rounded-ui bg-primary px-5 py-3 text-white" to={`${pathname}?create=1`}>
          {t("createRecord")}
        </Link>
      </div>
      <Input
        id={`search-project`}
        label={t("search")}
        value={search}
        maxLength={100}
        onChange={(event) => {
          setSearch(event.target.value);
          changePage(1);
        }}
      />
      {read.result.status === "loading" && <Loading />}
      {read.result.status === "error" && (
        <ErrorPanel title={t("loadFailed")} description={t(apiFailureMessage(read.result.failure).key, { ns: "errors" })} onRetry={read.reload} />
      )}
      {read.result.status === "success" && (
        <>
          <DataTable
            caption={t("activeRecords")}
            scrollLabel={t("records")}
            rows={[...read.result.data.items]}
            rowKey={(row) => row.id}
            columns={[
              {
                id: "name",
                header: t("fields.name"),
                render: (row) => (
                  <Link className="block max-w-80 break-words underline" to={routePaths.admin.project(row.id)}>
                    {row.name}
                  </Link>
                ),
              },
              { id: "parent", header: t("parent"), render: (row: Row) => <span className="block max-w-64 break-words">{row.parent}</span> },
              {
                id: "edit",
                header: t("actions"),
                render: (row) => (
                  <Link className="underline" to={routePaths.admin.project(row.id)}>
                    {t("editRecord")}
                  </Link>
                ),
              },
            ]}
          />
          <Pagination page={page} totalPages={read.result.data.totalPages} onPageChange={changePage} />
        </>
      )}
    </section>
  );
}
