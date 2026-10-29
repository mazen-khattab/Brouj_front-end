import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCities } from "../../Services/Cities";
import { getAreas } from "../../Services/Areas";
import { getProjects } from "../../Services/Projects";
import { getUnitsByProject } from "../../Services/Units";
import { useCatalogueRead } from "../../Hooks/useCatalogueRead";
import { useCatalogueInvalidation } from "../../Catalogue/invalidation";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";
import { detailPath } from "../../AdminCatalogue/model";
import type { Kind } from "../../AdminCatalogue/model";
import { DataTable } from "../../Components/DataTable";
import { Input } from "../../Components/Fields";
import { Pagination } from "../../Components/Pagination";
import { Loading, ErrorPanel } from "../../Components/Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { accountPanel } from "../../Components/Account/AccountFeedback";
import { AdminActionFeedback } from "../../Components/AdminCatalogue/Shared";
import CatalogueForm from "./CatalogueForm";

interface Row {
  id: string;
  name: string;
  parent: string;
}

export default function CatalogueList({ kind, projectId = "" }: { kind: Kind; projectId?: string }) {
  const { t } = useTranslation("admin");
  const { scope } = useAdminCatalogue();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get(kind === "unit" ? "unitPage" : "page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const create = params.get(kind === "unit" ? "createUnit" : "create") === "1";
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const queryArgs = { pageNumber: page, pageSize: 20, search: query };
      switch (kind) {
        case "city": {
          const result = await getCities({ query: queryArgs }, { signal });
          return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.name, parent: "" })) };
        }
        case "area": {
          const result = await getAreas({ query: queryArgs }, { signal });
          return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.name, parent: row.cityName })) };
        }
        case "project": {
          const result = await getProjects({ query: queryArgs }, { signal });
          return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.name, parent: row.areaName })) };
        }
        case "unit": {
          const result = await getUnitsByProject({ projectId, query: queryArgs }, { signal });
          return { ...result, items: result.items.map((row): Row => ({ id: row.id, name: row.number, parent: "" })) };
        }
      }
    },
    [kind, projectId, page, query],
  );
  const read = useCatalogueRead(`${scope}:${kind}:${projectId}:${page}:${query}`, load);
  useCatalogueInvalidation(read.reload);

  async function refresh() {
    await load(new AbortController().signal);
    read.reload();
  }

  function changePage(next: number) {
    const updated = new URLSearchParams(params);
    updated.set(kind === "unit" ? "unitPage" : "page", String(next));
    setParams(updated, { preventScrollReset: true });
  }

  if (create) {
    return (
      <section className={accountPanel}>
        <AdminActionFeedback refresh={refresh} />
        <CatalogueForm kind={kind} projectId={projectId} refresh={refresh} />
        <Link to={pathname}>{t("backToList")}</Link>
      </section>
    );
  }
  return (
    <section className={`${accountPanel} overflow-hidden`} aria-label={t(kind === "unit" ? "units" : "records")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{t(kind === "unit" ? "units" : "records")}</h2>
        <Link className="rounded-ui bg-primary px-5 py-3 text-white" to={`${pathname}?${kind === "unit" ? "createUnit" : "create"}=1`}>
          {t("createRecord")}
        </Link>
      </div>
      <Input
        id={`search-${kind}`}
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
            caption={t("activeCatalogue")}
            scrollLabel={t("records")}
            rows={[...read.result.data.items]}
            rowKey={(row) => row.id}
            columns={[
              {
                id: "name",
                header: t(kind === "unit" ? "fields.number" : "fields.name"),
                render: (row) => (
                  <Link className="block max-w-80 break-words underline" to={detailPath(kind, row.id, projectId)}>
                    {row.name}
                  </Link>
                ),
              },
              ...(kind === "area" || kind === "project"
                ? [{ id: "parent", header: t("parent"), render: (row: Row) => <span className="block max-w-64 break-words">{row.parent}</span> }]
                : []),
              {
                id: "edit",
                header: t("actions"),
                render: (row) => (
                  <Link className="underline" to={detailPath(kind, row.id, projectId)}>
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
