import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { ProjectWorkspace } from "../../Projects/Public/Browser";
import { Browser } from "./Browser";
import "../../../Styles/areas-index.css";

export function AreasIndexPage() {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");

  return <ProjectWorkspace className="areas-index">
    <header className="projects-hero areas-index-hero">
      <div className="home-container">
        <nav className="areas-index-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol>
            <li><Link to={routePaths.home}>{routing.t("home")}</Link></li>
            <li aria-current="page">{routing.t("areas")}</li>
          </ol>
        </nav>
        <p className="areas-index-eyebrow" data-projects-enter>{t("exploreNeighborhoods")}</p>
        <div className="projects-title-mask"><RouteHeading>{routing.t("areas")}</RouteHeading></div>
        <p className="areas-index-intro" data-projects-enter>{t("areasDirectoryIntro")}</p>
      </div>
    </header>
    <Browser editorial />
  </ProjectWorkspace>;
}
