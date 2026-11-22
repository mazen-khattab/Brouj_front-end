import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Amenities } from "../../../Components/Amenities";
import { MediaGallery } from "../../../Components/MediaGallery";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import type { ProjectDto } from "../../../Types/contracts";
import { ProjectTimePlan } from "../../Planning/Public/ProjectTimePlan";
import { UnitTable } from "../../Units/Public/UnitTable";
import { DrawCountdown } from "./DrawCountdown";
import { ProjectFacts } from "./Facts";
import { ProjectsIndexPage } from "./ProjectsIndexPage";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
import { useProjectDetailMotion } from "./useProjectDetailMotion";
import "../../../Styles/project-detail.css";

function ProjectDossier({ detail }: { detail: ProjectDto }) {
  const { t } = useTranslation("catalogue");
  const routing = useTranslation("routing");
  const root = useRef<HTMLDivElement>(null);
  useProjectDetailMotion(root);
  return <div ref={root} className="project-detail">
    <header className="pd-hero">
      <div className="home-container">
        <nav className="pd-breadcrumbs" aria-label={routing.t("breadcrumbs")}>
          <ol>
            <li><Link to={routePaths.home}>{routing.t("home")}</Link></li>
            <li><Link to={routePaths.projects}>{routing.t("projects")}</Link></li>
            <li aria-current="page"><bdi>{detail.name}</bdi></li>
          </ol>
        </nav>
        <div className="pd-hero-heading">
          <div>
            <p className="pd-project-type">{t(detail.projectType === 1 ? "initiative" : detail.projectType === 0 ? "regular" : "unknownType")}</p>
            <div className="pd-title-mask"><RouteHeading>{detail.name}</RouteHeading></div>
          </div>
          <Link className="pd-area-link" to={routePaths.area(detail.areaId)}>{t("backArea")}<span aria-hidden="true">↗</span></Link>
        </div>
        <DrawCountdown projectType={detail.projectType} drawDate={detail.drawDate} />
      </div>
    </header>
    <article className="home-container pd-overview" data-pd-reveal>
      <div className="pd-overview-grid">
        <div className="pd-gallery"><MediaGallery key={detail.id} images={detail.images} /></div>
        <div className="pd-spec-sheet"><ProjectFacts project={detail} editorial /></div>
      </div>
      <div className="pd-narrative">
        <section className="pd-description">
          <h2>{t("description")}</h2>
          <p dir="auto">{detail.description || t("noDescription")}</p>
        </section>
        <div className="pd-amenities"><Amenities items={detail.amenities} cards /></div>
      </div>
    </article>
    <div className="home-container pd-units" data-pd-reveal><UnitTable project={detail} /></div>
    <div className="pd-plan-band" data-pd-reveal>
      <div className="home-container"><ProjectTimePlan projectId={detail.id} editorial /></div>
    </div>
  </div>;
}

function Detail() {
  const { result, reload } = useDetail();
  return <PublicReadPanel result={result} reload={reload}>
    {detail => <ProjectDossier key={detail.id} detail={detail} />}
  </PublicReadPanel>;
}

export default function ProjectPage() {
  const { projectId } = useParams();
  if (projectId === undefined) return <ProjectsIndexPage />;
  return <DetailProvider id={projectId}><Detail /></DetailProvider>;
}
