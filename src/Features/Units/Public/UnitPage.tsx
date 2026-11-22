import { lazy, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { PageLoading, RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { UnitDto } from "../../../Types/contracts";
import { ReservationEntry } from "../../Reservations/Customer/ReservationEntry";
import { UnitDetails } from "./UnitDetails";
import { UnitGallery } from "./UnitGallery";
import { useUnitMotion } from "./useUnitMotion";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
import "../../../Styles/unit-detail.css";

const CustomerScope = lazy(() => import("../../Reservations/Customer/BookingScope"));

function UnitDossier({ unit, reload }: { unit: UnitDto; reload: () => void }) {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  const root = useRef<HTMLDivElement>(null);
  useUnitMotion(root);
  const title = t("unitLabel", { number: unit.number });
  return <div ref={root} className="unit-detail">
    <header className="ud-hero">
      <div className="home-container">
        <nav className="ud-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol>
            <li><Link to={routePaths.home}>{routing.t("home")}</Link></li>
            <li><Link to={routePaths.projects}>{routing.t("projects")}</Link></li>
            <li><Link to={routePaths.project(unit.projectId)}>{routing.t("project")}</Link></li>
            <li aria-current="page"><bdi>{title}</bdi></li>
          </ol>
        </nav>
        <div className="ud-hero-heading">
          <div className="ud-identity">
            <div className="ud-title-mask"><RouteHeading>{title}</RouteHeading></div>
            <span className={`ud-availability ${unit.isAvailable ? "is-available" : "is-unavailable"}`}>
              <span aria-hidden="true" />{t(unit.isAvailable ? "available" : "unavailable")}
            </span>
          </div>
          <Link className="ud-back-link" to={routePaths.project(unit.projectId)}>
            <span aria-hidden="true">←</span>{t("backProject")}
          </Link>
        </div>
      </div>
    </header>
    <article className="home-container ud-dossier">
      <div className="ud-showcase">
        <div className="ud-gallery-column"><UnitGallery key={unit.id} images={unit.images} /></div>
        <UnitDetails unit={unit} />
      </div>
      <aside className="ud-reservation" aria-label={t("reservationTitle")}>
        <h2>{t("reservationTitle")}</h2>
        <ReservationEntry unit={unit} reload={reload} />
      </aside>
    </article>
  </div>;
}

function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("routing");
  return <>
    {result.status !== "success" && <div className="home-container ud-loading-title"><RouteHeading>{t("unit")}</RouteHeading></div>}
    <PublicReadPanel result={result} reload={reload}>
      {unit => <UnitDossier key={unit.id} unit={unit} reload={reload} />}
    </PublicReadPanel>
  </>;
}

export default function UnitPage() {
  const { unitId, projectId } = useParams();
  return <DetailProvider id={unitId} projectId={projectId}>
    <Suspense fallback={<PageLoading />}>
      <CustomerScope key={[projectId, unitId].join(":")}><Detail /></CustomerScope>
    </Suspense>
  </DetailProvider>;
}
