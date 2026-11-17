import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { EmptyState } from "../../../Components/Feedback";
import { PageSizeSelect } from "../../../Components/PageSizeSelect";
import { Pagination } from "../../../Components/Pagination";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import type { ListData } from "./ListContext";
import { useList } from "./ListContext";

function Cards({ data }: { data: ListData }) {
  const { t } = useTranslation("catalogue");
  const card = "grid min-w-0 content-start gap-6 rounded-ui border border-accent/50 bg-ivory p-5 text-primary shadow-panel sm:p-6";
  const link =
    "text-xl font-medium text-primary underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary-light hover:decoration-accent hover:underline-offset-6";

  return data.page.items.map((item) => (
    <article key={item.id} className={card}>
      <div aria-hidden="true" className="h-px w-12 bg-accent" />
      <h2>
        <Link className={link} to={routePaths.area(item.id)}>
          {item.name}
        </Link>
      </h2>
      <p className="text-muted">{item.cityName}</p>
      <p className="text-sm text-muted">{t("viewProjects")}</p>
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
