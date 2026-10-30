import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCatalogueList } from "../../Hooks/useCatalogue";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";
import { routePaths } from "../../Router/routePaths";
import { CatalogueFeedback } from "./CatalogueFeedback";
import { MediaPlaceholder } from "./MediaGallery";
import { ProjectFacts, UnitFacts } from "./PropertyFacts";
import { Pagination } from "../Pagination";
import { EmptyState } from "../Feedback";
import type { CatalogueListData } from "../../Context/CatalogueListContext";
import { BidiText } from "../BidiText";
import { CataloguePageSize } from './CataloguePageSize';

function Cards({ data }: { data: CatalogueListData }) {
  const { t } = useTranslation("catalogue");
  const card =
    "grid min-w-0 content-start gap-6 rounded-ui border border-accent/50 bg-ivory p-5 text-primary shadow-panel sm:p-6";
  const link =
    "text-xl font-medium underline decoration-accent underline-offset-8";
  if (data.kind === "cities" || data.kind === "areas")
    return data.page.items.map((item) => (
      <article key={item.id} className={card}>
        <div aria-hidden="true" className="h-px w-12 bg-accent" />
        <h2>
          <Link
            className={link}
            to={
              data.kind === "cities"
                ? routePaths.city(item.id)
                : routePaths.area(item.id)
            }
          >
            {item.name}
          </Link>
        </h2>
        {"cityName" in item && <p className="text-muted">{item.cityName}</p>}
        <p className="text-sm text-muted">
          {t(data.kind === "cities" ? "viewAreas" : "viewProjects")}
        </p>
      </article>
    ));
  if (data.kind === "projects")
    return data.page.items.map((item) => (
      <article key={item.id} className={card}>
        <div className="h-44">
          <MediaPlaceholder />
        </div>
        <h2>
          <Link className={link} to={routePaths.project(item.id)}>
            {item.name}
          </Link>
        </h2>
        <Link className="text-sm underline" to={routePaths.area(item.areaId)}>
          {item.areaName}
        </Link>
        {/* Keep the full price on its own row when cards share space with the filters. */}
        <div className="[&_dl>div:first-child]:col-span-full"><ProjectFacts project={item} /></div>
      </article>
    ));
  return data.page.items.map((item) => (
    <article key={item.id} className={card}>
      <div className="h-44">
        <MediaPlaceholder />
      </div>
      <h3>
        <Link className={link} to={routePaths.unit(item.projectId, item.id)}>
          {t("unitLabel", { number: "" })}
          <BidiText>{item.number}</BidiText>
        </Link>
      </h3>
      <UnitFacts unit={item} />
    </article>
  ));
}
export function CatalogueListing({ sidebar = false }: { sidebar?: boolean }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const { result, reload, update } = useCatalogueList();
  return (
    <CatalogueFeedback result={result} reload={reload}>
      {(data) => (
        <section className="grid gap-6" aria-live="polite">
          <p className="text-sm text-accent-light">
            {t("results", {
              value: formatNumber(data.page.totalCount, locale),
            })}
          </p>
          {data.page.items.length ? (
            <div className={`grid gap-5 md:grid-cols-2 ${sidebar ? 'lg:grid-cols-1 xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
              <Cards data={data} />
            </div>
          ) : (
            <div className="rounded-ui bg-ivory p-5 text-primary">
              <EmptyState
                title={t("empty")}
                description={t("emptyDescription")}
              />
            </div>
          )}
          <div role="group" aria-label={t('resultControls')} className="flex flex-wrap items-end justify-between gap-6 rounded-ui border border-accent/35 bg-primary-deep p-5">
            <CataloguePageSize />
            <Pagination
              page={data.page.pageNumber}
              totalPages={data.page.totalPages}
              onPageChange={(pageNumber) => update({ pageNumber })}
              className="grow pt-0! max-sm:grid max-sm:grid-cols-2 max-sm:[&>span]:col-span-2 max-sm:[&>span]:row-start-1 max-sm:[&>span]:text-center"
            />
          </div>
        </section>
      )}
    </CatalogueFeedback>
  );
}
