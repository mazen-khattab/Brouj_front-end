import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { Browser } from "./Browser";
import { useCityMotion } from "./useCityMotion";
import "../../../Styles/projects.css";
import "../../../Styles/area-directory.css";
import "../../../Styles/city-detail.css";
import "../../../Styles/cities-directory.css";

export function CitiesIndexPage() {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  const root = useRef<HTMLDivElement>(null);
  useCityMotion(root);
  return <div ref={root} className="projects-page city-detail cities-index">
    <header className="projects-hero city-hero">
      <div className="home-container">
        <nav className="city-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol><li><Link to={routePaths.home}>{routing.t("home")}</Link></li><li aria-current="page">{routing.t("cities")}</li></ol>
        </nav>
        <p className="city-eyebrow" data-city-enter>{t("exploreDestinations")}</p>
        <div className="projects-title-mask city-title-mask"><RouteHeading>{routing.t("cities")}</RouteHeading></div>
        <p className="city-intro" data-city-enter>{t("cityDetailIntro")}</p>
      </div>
    </header>
    <Browser editorial />
  </div>;
}
