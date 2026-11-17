import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../Components/Feedback";
import { MediaPlaceholder } from "../../../Components/MediaGallery";
import { PageSizeSelect } from "../../../Components/PageSizeSelect";
import { Pagination } from "../../../Components/Pagination";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import { ProjectFacts } from "./Facts";
import type { ListData } from "./ListContext";
import { useList } from "./ListContext";

function Cards({ data }: { data: ListData }) {
  const card = "grid min-w-0 content-start gap-6 rounded-ui border border-accent/50 bg-ivory p-5 text-primary shadow-panel sm:p-6";
  const link =
    "text-xl font-medium text-primary underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary-light hover:decoration-accent hover:underline-offset-6";

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
      <Link
        className="inline-flex items-center gap-1.5 text-sm text-muted underline decoration-accent/40 underline-offset-4 transition-all hover:text-primary hover:decoration-accent"
        to={routePaths.area(item.areaId)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent shrink-0">
          <path
            fillRule="evenodd"
            d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.36 7.587a15.82 15.82 0 002.273 1.765 11.253 11.253 0 001.04.573l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>{item.areaName}</span>
      </Link>
      {/* Keep the full price on its own row when cards share space with the filters. */}
      <div className="[&_dl>div:first-child]:col-span-full">
        <ProjectFacts project={item} />
      </div>
    </article>
  ));
}
export function Listing({ sidebar = false }: { sidebar?: boolean }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const { result, reload, update } = useList();
  return (
    <PublicReadPanel result={result} reload={reload}>
      {(data) => (
        <section className="grid gap-6" aria-live="polite">
          <p className="text-sm text-accent-light">
            {t("results", {
              value: formatNumber(data.page.totalCount, locale),
            })}
          </p>
          {data.page.items.length ? (
            <div className={`grid gap-5 md:grid-cols-2 ${sidebar ? "lg:grid-cols-1 xl:grid-cols-2" : "xl:grid-cols-3"}`}>
              <Cards data={data} />
            </div>
          ) : (
            <div className="rounded-ui bg-ivory p-5 text-primary">
              <EmptyState title={t("empty")} description={t("emptyDescription")} />
            </div>
          )}
          <div
            role="group"
            aria-label={t("resultControls")}
            className="flex flex-wrap items-end justify-between gap-6 rounded-ui border border-accent/35 bg-primary-deep p-5"
          >
            <PageSizeSelect pageSize={data.page.pageSize} onChange={(pageSize) => update({ pageSize })} />
            <Pagination
              page={data.page.pageNumber}
              totalPages={data.page.totalPages}
              onPageChange={(pageNumber) => update({ pageNumber })}
              className="grow pt-0! max-sm:grid max-sm:grid-cols-2 max-sm:[&>span]:col-span-2 max-sm:[&>span]:row-start-1 max-sm:[&>span]:text-center"
            />
          </div>
        </section>
      )}
    </PublicReadPanel>
  );
}
