import { getUnitsByProject } from "../../Services/Units";
import { ProjectSelector } from "./ProjectSelector";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCatalogueRead } from "../../Hooks/useCatalogueRead";
import { useCatalogueInvalidation } from "../../Catalogue/invalidation";
import { useUnitEditor } from "./EditorContext";
import { routePaths } from "../../Router/browserPaths";
import { DataTable } from "../../Components/DataTable";
import { Input } from "../../Components/Fields";
import { Pagination } from "../../Components/Pagination";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { AdminActionFeedback } from "./Feedback";
import UnitForm from "./UnitForm";

const panel = "grid min-w-0 gap-6 rounded-ui border border-accent/50 bg-surface p-5 shadow-panel sm:p-7";


interface Row {
  id: string;
  name: string;
}

export default function UnitList() {
  const { t } = useTranslation("admin");
  const { scope } = useUnitEditor();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const projectId = params.get("projectId") ?? "";
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
      const result = await getUnitsByProject({ projectId, query: queryArgs }, { signal });
      return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.number })) };
    },
    [projectId, page, query],
  );
  const read = useCatalogueRead(`${scope}:unit:${projectId}:${page}:${query}`, load, Boolean(projectId));
  useCatalogueInvalidation(read.reload);

  async function refresh() {
    if (projectId) await load(new AbortController().signal);
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
        <UnitForm projectId={projectId} refresh={refresh} />
        <Link to={pathname + (projectId ? `?projectId=${encodeURIComponent(projectId)}` : "")}>{t("backToList")}</Link>
      </section>
    );
  }
  return (
    <section className={`${panel} overflow-hidden`} aria-label={t("units")}>
      <ProjectSelector label={t("filterByProject")} value={projectId} disabled={false} onChange={(value) => { const next = new URLSearchParams(params); next.set("projectId", value); next.delete("page"); setParams(next); }} />
      {!projectId && <p>{t("selectProjectForUnits")}</p>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{t("units")}</h2>
        <Link className="rounded-ui bg-primary px-5 py-3 text-white" to={`${pathname}?create=1&projectId=${encodeURIComponent(projectId)}`}>
          {t("createRecord")}
        </Link>
      </div>
      <Input
        id={`search-unit`}
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
                header: t("fields.number"),
                render: (row) => (
                  <Link className="block max-w-80 break-words underline" to={routePaths.admin.unit(projectId, row.id)}>
                    {row.name}
                  </Link>
                ),
              },
              {
                id: "edit",
                header: t("actions"),
                render: (row) => (
                  <Link className="underline" to={routePaths.admin.unit(projectId, row.id)}>
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
