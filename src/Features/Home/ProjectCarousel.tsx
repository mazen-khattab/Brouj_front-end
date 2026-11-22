import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import { Link } from "react-router-dom";
import { useHome } from "./useHome";
import { useLocale } from "../../Hooks/useLocale";
import { routePaths } from "../../Router/routePaths";
import { ProjectType } from "../../Types/contracts";
import { PublicReadPanel } from "../../Components/PublicReadPanel";
import { ProjectCard } from "./ProjectCard";
import { formatNumber } from "../../i18n/format";

export function ProjectCarousel() {
  const { t } = useTranslation("home");
  const { locale, direction } = useLocale();
  const { collections } = useHome();
  const { result, reload, page, changePage } = collections[ProjectType.Initiative];
  const [viewport, api] = useEmblaCarousel({ align: "start", direction, duration: 27 });
  const [canMove, setCanMove] = useState({ back: false, forward: false });
  const [fromEnd, setFromEnd] = useState(false);
  useEffect(() => {
    if (!api) return;
    const update = () => setCanMove({ back: api.canScrollPrev(), forward: api.canScrollNext() });
    api.scrollTo(fromEnd ? api.scrollSnapList().length - 1 : 0, true);
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api, fromEnd]);
  const pages = result.status === "success" ? result.data.totalPages : 0;
  function move(next: boolean) {
    if (next ? api?.canScrollNext() : api?.canScrollPrev()) {
      const jump = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (next) api?.scrollNext(jump);
      else api?.scrollPrev(jump);
    } else {
      setFromEnd(!next);
      changePage(page + (next ? 1 : -1));
    }
  }
  return (
    <section id="initiatives" className="home-band" aria-labelledby="initiatives-title">
      <div className="home-container">
        <div className="home-section-heading">
          <h2 id="initiatives-title" className="home-display">
            {t("projects.title")}
          </h2>
          <Link to={`${routePaths.projects}?projectType=1`} className="home-text-link">
            {t("seeAll")}
          </Link>
        </div>
        <div role="region" aria-roledescription={t("projects.carousel")} aria-label={t("projects.title")}>
          <div id="initiatives-slides" data-reveal>
            <PublicReadPanel result={result} reload={reload}>
              {({ items }) => {
                const projects = items.filter((project) => project.projectType === ProjectType.Initiative);
                return projects.length ? (
                  <div className="home-carousel-viewport" ref={viewport}>
                    <div className="home-project-track">
                      {projects.map((project, index) => (
                        <ProjectCard key={project.id} project={project} index={index} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="home-empty">
                    <h3>{t("projects.empty")}</h3>
                    <p>{t("projects.emptyDescription")}</p>
                  </div>
                );
              }}
            </PublicReadPanel>
          </div>
          <div className="home-carousel-bar">
            <p role="status">{pages > 0 && t("projects.position", { current: formatNumber(page, locale), total: formatNumber(pages, locale) })}</p>
            <div>
              {([false, true] as const).map((next) => (
                <button
                  key={String(next)}
                  onClick={() => move(next)}
                  type="button"
                  aria-label={t(next ? "projects.next" : "projects.previous")}
                  aria-controls="initiatives-slides"
                  disabled={!pages || (next ? !canMove.forward && page >= pages : !canMove.back && page <= 1)}
                >
                  <span className="home-arrow" aria-hidden="true">
                    {next ? "→" : "←"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
