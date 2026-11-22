import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";
import { routePaths } from "../../Router/routePaths";
import type { ProjectListDto } from "../../Types/contracts";
import design from "../../assets/home/design.jpg";
import places from "../../assets/home/places.jpg";
import perspective from "../../assets/home/perspective.jpg";

const illustrations = [places, design, perspective];
export type CardProject = Pick<ProjectListDto, "id" | "name" | "size"> & { areaName?: string };

export function ProjectCard({ project, index }: { project: CardProject; index: number }) {
  const { t } = useTranslation("home");
  const { locale } = useLocale();
  return (
    <article className="home-project">
      <Link to={routePaths.project(project.id)} aria-label={project.name}>
        <div className="home-project-image">
          <img src={illustrations[index % illustrations.length]} alt="" loading="lazy" />
          <small className="home-project-caption">{t("projects.illustration")}</small>
          <span className="home-card-arrow home-arrow" aria-hidden="true">
            →
          </span>
        </div>
        <div className="home-project-copy">
          <h3 dir="auto">{project.name}</h3>
          <div className="home-project-meta">
            {project.areaName && <span dir="auto">{project.areaName}</span>}
            <span>{t("projects.area", { value: formatNumber(project.size, locale) })}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
