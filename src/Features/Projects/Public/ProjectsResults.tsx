import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { PageSizeSelect } from "../../../Components/PageSizeSelect";
import { Pagination } from "../../../Components/Pagination";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { formatCurrency, formatNumber } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import { ProjectType, type ProjectListDto } from "../../../Types/contracts";
import { useList, type ListData } from "./ListContext";

function ProjectImagePlaceholder() {
  const { t } = useTranslation("catalogue");
  return (
    <div className="projects-card-image">
      <div className="projects-placeholder-frame" aria-hidden="true">
        <svg viewBox="0 0 240 150" fill="none">
          <path d="M25 130h190M45 130V70l45-25v85m0-85 43 25v60M133 70l38-23v83m0-83 25 14v69M60 77v39m14-47v47m31-46v46m14-38v38m27-39v39m13-47v47m24-48v48" />
          <path className="projects-placeholder-gold" d="M88 28v-9m-8 4h16M27 33h21m-10-10v20M204 94h13m-6-6v12" />
          <path className="projects-placeholder-gold" strokeWidth="2.5" d="M178 27V15m7 12V9m7 18V3" />
        </svg>
      </div>
      <span>{t("imageUnavailable")}</span>
    </div>
  );
}

function CatalogueProjectCard({ project }: { project: ProjectListDto }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  return (
    <article className="projects-card">
      <Link to={routePaths.project(project.id)} className="projects-card-visual" tabIndex={-1} aria-hidden="true">
        <ProjectImagePlaceholder />
      </Link>
      <div className="projects-card-copy">
        <div className="projects-card-meta">
          <span className="projects-type-badge">
            {t(project.projectType === ProjectType.Initiative ? "initiative" : project.projectType === ProjectType.Regular ? "regular" : "unknownType")}
          </span>
          <span>{t("squareMeters", { value: formatNumber(project.size, locale, { maximumFractionDigits: 4 }) })}</span>
        </div>
        <h2>
          <Link to={routePaths.project(project.id)} dir="auto">
            {project.name}
          </Link>
        </h2>
        <Link to={routePaths.area(project.areaId)} className="projects-card-location" dir="auto">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
            <circle cx="12" cy="10" r="2" />
          </svg>
          {project.areaName}
        </Link>
        <div className="projects-card-price">
          <div>
            <span>{t("projectPrice")}</span>
            <strong>
              <bdi>{formatCurrency(project.price, locale)}</bdi>
            </strong>
          </div>
          <span className="projects-card-arrow" aria-hidden="true">
            ↗
          </span>
        </div>
      </div>
    </article>
  );
}

function ResultCollection({ data, includeProjectType }: { data: ListData; includeProjectType: boolean }) {
  const { t } = useTranslation("catalogue");
  const { t: copy } = useTranslation("projects");
  const { locale } = useLocale();
  const { update, params } = useList();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = root.current?.querySelectorAll(".projects-card");
        if (cards?.length) gsap.from(cards, { y: 18, opacity: 0, duration: 0.85, stagger: { amount: 0.35 }, ease: "power3.out" });
      });
    }, root);
    return () => {
      media.revert();
      context.revert();
    };
  }, [data, locale]);
  return (
    <section ref={root} className="projects-results" aria-label={copy("resultsLabel")}>
      <header className="projects-results-heading">
        <p role="status">{t("results", { value: formatNumber(data.page.totalCount, locale) })}</p>
        <span>{copy(params.projectType === 1 ? "types.initiative" : params.projectType === 0 ? "types.regular" : "types.all")}</span>
      </header>
      {data.page.items.length ? (
        <div className="projects-grid">
          {data.page.items.map((project) => (
            <CatalogueProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="projects-empty">
          <span className="projects-empty-mark" aria-hidden="true">
            ⌑
          </span>
          <h2>{t("empty")}</h2>
          <p>{copy("empty")}</p>
          <button
            type="button"
            onClick={() => update({ search: null, cityId: null, areaId: null, ...(includeProjectType ? { projectType: null } : {}) })}
          >
            {t("clear")}
          </button>
        </div>
      )}
      <div className="projects-pagination" role="group" aria-label={t("resultControls")}>
        <PageSizeSelect pageSize={data.page.pageSize} onChange={(pageSize) => update({ pageSize })} />
        <Pagination page={data.page.pageNumber} totalPages={data.page.totalPages} onPageChange={(pageNumber) => update({ pageNumber })} />
      </div>
    </section>
  );
}

export function ProjectsResults({ includeProjectType = false }: { includeProjectType?: boolean }) {
  const { result, reload } = useList();
  return (
    <div className="projects-results-region">
      <PublicReadPanel result={result} reload={reload}>
        {(data) => <ResultCollection data={data} includeProjectType={includeProjectType} />}
      </PublicReadPanel>
    </div>
  );
}
