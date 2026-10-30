import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useHome } from "../../Hooks/useHome";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";
import { CatalogueFeedback } from "../Catalogue/CatalogueFeedback";
import { MediaPlaceholder } from "../Catalogue/MediaGallery";
import { EmptyState } from "../Feedback";

export const initiativeProjectsPath = `${routePaths.projects}?projectType=${ProjectType.Initiative}`;

export function InitiativeProjects() {
  const { t } = useTranslation("home");
  const { locale } = useLocale();
  const { projects, reloadProjects, page, changePage } = useHome();
  const totalPages = projects.status === "success" ? projects.data.totalPages : 0;
  const loading = projects.status === "loading";

  return (
    <section id="initiatives" aria-labelledby="initiatives-title" className="home-section">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="home-eyebrow">{t("projects.eyebrow")}</p>
          <h2 id="initiatives-title" className="home-title">
            {t("projects.title")}
          </h2>
          <p className="mt-3 max-w-xl leading-8 text-white/75">{t("projects.description")}</p>
        </div>
        <Link to={initiativeProjectsPath} className="home-outline-link">
          {t("seeAll")}
        </Link>
      </div>
      <div role="region" aria-roledescription={t("projects.carousel")} aria-label={t("projects.title")}>
        <div id="initiative-slides" aria-live="polite" aria-atomic="true" aria-busy={loading}>
          <CatalogueFeedback result={projects} reload={reloadProjects}>
            {(data) => {
              // The API applies the filter before paging; also keep regular projects out of this section.
              const initiatives = data.items.filter((item) => item.projectType === ProjectType.Initiative);
              return initiatives.length ? (
                <div key={page} className="grid gap-5 motion-safe:animate-fade-in md:grid-cols-3">
                  {initiatives.map((project) => (
                    <article key={project.id} className="group min-w-0 overflow-hidden rounded-ui border border-accent/35 bg-ivory text-primary">
                      <Link to={routePaths.project(project.id)} className="block no-underline" aria-labelledby={`project-${project.id}`}>
                        <div className="relative h-56 overflow-hidden p-3 [&>div]:transition-transform group-hover:[&>div]:scale-[1.02]">
                          <MediaPlaceholder />
                        </div>
                        <div className="px-6 pb-7 pt-4">
                          <p className="text-xs tracking-wide text-muted rtl:tracking-normal">{t("projects.category")}</p>
                          <h3 id={`project-${project.id}`} dir="auto" className="mt-3 text-xl font-medium leading-8">
                            {project.name}
                          </h3>
                          <p dir="auto" className="mt-2 text-sm text-muted">
                            {project.areaName}
                          </p>
                          <div className="mt-6 flex items-center justify-between gap-3 border-t border-primary/15 pt-5 text-sm">
                            <span>{t("projects.area", { value: formatNumber(project.size, locale) })}</span>
                            <span className="font-medium underline decoration-accent underline-offset-4">{t("projects.details")}</span>
                          </div>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title={t("projects.empty")} description={t("projects.emptyDescription")} />
              );
            }}
          </CatalogueFeedback>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <p role="status" className="text-sm text-accent-light">
            {totalPages > 0
              ? t("projects.position", {
                  current: formatNumber(page, locale),
                  total: formatNumber(totalPages, locale),
                })
              : t("projects.collection")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="home-carousel-control"
              aria-label={t("projects.previous")}
              aria-controls="initiative-slides"
              disabled={page <= 1 || loading}
              onClick={() => changePage(page - 1)}
            >
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ←
              </span>
            </button>
            <button
              type="button"
              className="home-carousel-control"
              aria-label={t("projects.next")}
              aria-controls="initiative-slides"
              disabled={loading || page >= totalPages}
              onClick={() => changePage(page + 1)}
            >
              <span aria-hidden="true" className="rtl:-scale-x-100">
                →
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
