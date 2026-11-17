import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Amenities } from "../../../Components/Amenities";
import { MediaGallery } from "../../../Components/MediaGallery";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { routePaths } from "../../../Router/routePaths";
import { ProjectTimePlan } from "../../Planning/Public/ProjectTimePlan";
import { UnitCarousel } from "../../Units/Public/UnitCarousel";
import { ProjectFacts } from "./Facts";

import { Browser } from "./Browser";
import { useDetail } from "./DetailContext";
import { DetailProvider } from "./DetailProvider";
const panel = "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function Detail() {
  const { result, reload } = useDetail();
  const { t } = useTranslation("catalogue");
  return (
    <PublicReadPanel result={result} reload={reload}>
      {(detail) => (
        <>
          <article className={panel}>
            <header className="flex flex-wrap items-center justify-between gap-5">
              <h2 className="text-3xl font-medium">{detail.name}</h2>
              <Link
                className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-light/30 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
                to={routePaths.area(detail.areaId)}
              >
                <span>{t("backArea")}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </header>
            <div className="grid gap-8 lg:grid-cols-2">
              <MediaGallery key={detail.id} images={detail.images} />
              <ProjectFacts project={detail} />
            </div>
            <section>
              <h2 className="mb-4 text-2xl font-medium">{t("description")}</h2>
              <p dir="auto" className="whitespace-pre-wrap leading-9">
                {detail.description || t("noDescription")}
              </p>
            </section>
            <Amenities items={detail.amenities} cards />
          </article>
          <UnitCarousel projectId={detail.id} />
          <ProjectTimePlan projectId={detail.id} />
        </>
      )}
    </PublicReadPanel>
  );
}
export default function ProjectPage() {
  const { projectId } = useParams();
  const [search] = useSearchParams();
  const kind = projectId === undefined ? "projects" : "project";
  const { t } = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{t(kind === "projects" && search.get("projectType") === "1" ? "initiativeProjects" : kind)}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{catalogue.t(projectId === undefined ? "projectsIntro" : "intro")}</p>
      </header>
      {projectId === undefined ? (
        <Browser />
      ) : (
        <DetailProvider id={projectId}>
          <Detail />
        </DetailProvider>
      )}
    </div>
  );
}
