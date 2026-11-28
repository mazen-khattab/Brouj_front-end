import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Filters } from "./Filters";
import { Listing } from "./Listing";
import { ListProvider } from "./ListProvider";
import { ProjectFilters } from "./ProjectFilters";
import { ProjectsResults } from "./ProjectsResults";
import { useProjectsMotion } from "./useProjectsMotion";

/** Share the editorial surface and motion without exposing project state to other domains. */
export function ProjectWorkspace({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useProjectsMotion(root);
  return <div ref={root} className={`projects-page ${className}`}>{children}</div>;
}

export function ProjectCatalogue({ editorial = false }: { editorial?: boolean }) {
  const { t } = useTranslation("routing");
  if (editorial) return <section className="home-container projects-catalogue area-projects" aria-label={t("projects")}>
    <ProjectFilters includeProjectType />
    <ProjectsResults includeProjectType />
  </section>;
  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <Filters />
      <div className="min-w-0">
        <Listing sidebar />
      </div>
    </div>
  );
}
/** Integration boundary: callers supply a relation, while the domain owns query state. */
export function Browser({ areaId, editorial = false }: { areaId?: string; editorial?: boolean }) {
  return (
    <ListProvider scopeId={areaId}>
      <ProjectCatalogue editorial={editorial} />
    </ListProvider>
  );
}
