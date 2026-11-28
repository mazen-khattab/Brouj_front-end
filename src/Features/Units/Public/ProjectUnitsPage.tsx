import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { usePublicProject } from "../../../Hooks/usePublicProject";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { UnitTable } from "./UnitTable";
import "../../../Styles/project-detail.css";

export default function ProjectUnitsPage() {
  const { projectId } = useParams();
  const { t } = useTranslation("catalogue");
  const { result, reload } = usePublicProject(projectId);
  const project = result.status === "success" ? result.data : undefined;

  return (
    <div className="project-detail">
      <header className="pd-hero">
        <div className="home-container pd-hero-heading">
          <div>
            {project && <p className="pd-project-type"><bdi>{project.name}</bdi></p>}
            <div className="pd-title-mask"><RouteHeading>{t("units")}</RouteHeading></div>
          </div>
          {project && <Link className="pd-area-link" to={routePaths.project(project.id)}>{t("backProject")}</Link>}
        </div>
      </header>
      <div className="home-container pd-units">
        <PublicReadPanel result={result} reload={reload}>
          {(detail) => <UnitTable project={detail} />}
        </PublicReadPanel>
      </div>
    </div>
  );
}
