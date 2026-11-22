import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { CityDto } from "../../../Types/contracts";
import { Browser as AreaBrowser } from "../../Areas/Public/Browser";
import { CitiesIndexPage } from "./CitiesIndexPage";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
import { useCityMotion } from "./useCityMotion";
import "../../../Styles/city-detail.css";

function CityDossier({ city }: { city: CityDto }) {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  const root = useRef<HTMLDivElement>(null);
  useCityMotion(root);
  return <div ref={root} className="projects-page city-detail">
    <header className="projects-hero city-hero">
      <div className="home-container">
        <nav className="city-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol>
            <li><Link to={routePaths.home}>{routing.t("home")}</Link></li>
            <li><Link to={routePaths.cities}>{routing.t("cities")}</Link></li>
            <li aria-current="page"><bdi>{city.name}</bdi></li>
          </ol>
        </nav>
        <p className="city-eyebrow" data-city-enter>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>
          {t("city")}
        </p>
        <div className="projects-title-mask city-title-mask"><RouteHeading>{city.name}</RouteHeading></div>
        <p className="city-intro" data-city-enter>{t("cityDetailIntro")}</p>
      </div>
    </header>
    <AreaBrowser cityId={city.id} editorial />
  </div>;
}

function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("routing");
  return <>
    {result.status !== "success" && <div className="home-container city-loading-title"><RouteHeading>{t("city")}</RouteHeading></div>}
    <PublicReadPanel result={result} reload={reload}>{city => <CityDossier key={city.id} city={city} />}</PublicReadPanel>
  </>;
}

export default function CityPage() {
  const { cityId } = useParams();
  if (cityId !== undefined) return <DetailProvider id={cityId}><Detail /></DetailProvider>;
  return <CitiesIndexPage />;
}
