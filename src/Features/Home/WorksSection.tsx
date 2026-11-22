import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PublicReadPanel } from "../../Components/PublicReadPanel";
import { useResourceRead } from "../../Hooks/useResourceRead";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";
import { getProjectById } from "../../Services/Projects";
import { isGuid } from "../../Services/identifiers";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";
import { useHome } from "./useHome";
import { ProjectCard, type CardProject } from "./ProjectCard";

const filters = ["all", "current", "previous"] as const;
type Filter = (typeof filters)[number];
function projectIds(value: string | undefined) {
  return [
    ...new Set(
      value
        ?.split(",")
        .map((id) => id.trim())
        .filter(isGuid),
    ),
  ];
}
const published = {
  current: projectIds(import.meta.env.VITE_HOME_CURRENT_PROJECT_IDS),
  previous: projectIds(import.meta.env.VITE_HOME_PREVIOUS_PROJECT_IDS),
};
const pageSize = 3;

export function WorksSection() {
  const { t } = useTranslation("home");
  const { locale } = useLocale();
  const { collections } = useHome();
  const all = collections[ProjectType.Regular];
  const [filter, setFilter] = useState<Filter>("all");
  const [filteredPage, setPage] = useState(1);
  const ids = filter === "all" ? undefined : published[filter];
  const load = useCallback(
    async (signal: AbortSignal) => {
      const slice = ids?.slice((filteredPage - 1) * pageSize, filteredPage * pageSize) ?? [];
      const projects = await Promise.all(slice.map((id) => getProjectById({ id }, { signal })));
      return { items: projects, totalPages: Math.ceil((ids?.length ?? 0) / pageSize) };
    },
    [ids, filteredPage],
  );
  const curated = useResourceRead(`works:${filter}:${filteredPage}`, load, Boolean(ids?.length));
  const { result, reload } = filter === "all" ? all : curated;
  const page = filter === "all" ? all.page : filteredPage;
  const changePage = filter === "all" ? all.changePage : setPage;
  const pages = result.status === "success" ? result.data.totalPages : 0;
  return (
    <section id="regular-projects" className="home-band home-works" aria-labelledby="works-title">
      <div className="home-container">
        <div className="home-section-heading">
          <div>
            <h2 id="works-title" className="home-display">
              {t("regular.title")}
            </h2>
            <p className="home-description">{t("regular.description")}</p>
          </div>
          <Link className="home-text-link" to={`${routePaths.projects}?projectType=${ProjectType.Regular}`}>
            {t("seeAll")}
          </Link>
        </div>
        <div className="home-filters" role="group" aria-label={t("regular.filter")}>
          {filters.map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={key === filter}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
            >
              {t(`regular.${key}`)}
            </button>
          ))}
        </div>
        <div data-reveal>
          {ids?.length === 0 ? (
            <p className="home-empty" role="status">
              {t("regular.unclassified")}
            </p>
          ) : (
            <PublicReadPanel<{ items: ReadonlyArray<CardProject & { projectType: ProjectType }>; totalPages: number }>
              result={result}
              reload={reload}
            >
              {({ items }) => {
                const regular = items.filter((p) => p.projectType === ProjectType.Regular);
                return regular.length ? (
                  <div key={filter + page} className="works-grid">
                    {regular.map((project, index) => (
                      <ProjectCard key={project.id} project={project} index={index + 1} />
                    ))}
                  </div>
                ) : (
                  <p className="home-empty">{t("regular.empty")}</p>
                );
              }}
            </PublicReadPanel>
          )}
        </div>
        {(pages > 1 || page > 1) && (
          <div className="home-carousel-bar">
            <p role="status">{t("projects.position", { current: formatNumber(page, locale), total: formatNumber(pages, locale) })}</p>
            <div>
              {([false, true] as const).map((next) => (
                <button
                  type="button"
                  key={String(next)}
                  aria-label={t(next ? "projects.next" : "projects.previous")}
                  disabled={result.status !== "success" || (next ? page >= pages : page === 1)}
                  onClick={() => changePage(page + (next ? 1 : -1))}
                >
                  <span className="home-arrow" aria-hidden="true">
                    {next ? "→" : "←"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
