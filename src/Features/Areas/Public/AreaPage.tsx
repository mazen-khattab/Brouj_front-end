import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { AreaDto } from "../../../Types/contracts";
import { Browser as ProjectBrowser, ProjectWorkspace } from "../../Projects/Public/Browser";
import { AreasIndexPage } from "./AreasIndexPage";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
import "../../../Styles/projects.css";
import "../../../Styles/area-detail.css";

function AreaDossier({ area }: { area: AreaDto }) {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  return <ProjectWorkspace className="area-detail">
    <header className="projects-hero area-hero">
      <div className="home-container">
        <nav className="area-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol>
            <li><Link to={routePaths.home}>{routing.t("home")}</Link></li>
            <li><Link to={routePaths.areas}>{routing.t("areas")}</Link></li>
            <li aria-current="page"><bdi>{area.name}</bdi></li>
          </ol>
        </nav>
        <div className="area-hero-heading">
          <div className="projects-title-mask area-title-mask"><RouteHeading>{area.name}</RouteHeading></div>
          <Link to={routePaths.city(area.cityId)} className="area-city-badge">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>
            <bdi>{area.cityName}</bdi>
          </Link>
        </div>
        <p className="area-intro" data-projects-enter>{t("areaIntro")}</p>
      </div>
    </header>
    <section className="area-amenities-band" aria-labelledby="area-amenities-title" data-projects-enter>
      <div className="home-container area-amenities">
        <h2 id="area-amenities-title">{t("amenities")}</h2>
        {area.amenities.length ? <dl className="area-amenity-chips">
          {area.amenities.map((item, index) => <div key={`${item.name}:${index}`}>
            <dt dir="auto">{item.name}</dt><dd dir="auto">{item.value}</dd>
          </div>)}
        </dl> : <p className="area-amenities-empty">{t("areaNoAmenities")}</p>}
      </div>
    </section>
    <ProjectBrowser areaId={area.id} editorial />
  </ProjectWorkspace>;
}

function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("routing");
  return <>
    {result.status !== "success" && <div className="home-container area-loading-title"><RouteHeading>{t("area")}</RouteHeading></div>}
    <PublicReadPanel result={result} reload={reload}>{area => <AreaDossier key={area.id} area={area} />}</PublicReadPanel>
  </>;
}

export default function AreaPage() {
  const { areaId } = useParams();
  if (areaId !== undefined) return <DetailProvider id={areaId}><Detail /></DetailProvider>;
  return <AreasIndexPage />;
}
