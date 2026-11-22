import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "../../../Components/Navigation";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { ListProvider } from "./ListProvider";
import { useList } from "./ListContext";
import { ProjectFilters } from "./ProjectFilters";
import { ProjectsResults } from "./ProjectsResults";
import { useProjectsMotion } from "./useProjectsMotion";
import { typeFilterKey } from "./typeFilters";
import "../../../Styles/home.css";
import "../../../Styles/projects.css";

const types = [{ value: null, key: "all" }, { value: 1, key: "initiative" }, { value: 0, key: "regular" }] as const;

function ProjectsIndex() {
  const { t } = useTranslation("projects");
  const routing = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  const { params, update } = useList();
  const root = useRef<HTMLDivElement>(null);
  useProjectsMotion(root);
  const active = types.find(item => item.value === (params.projectType ?? null))!;
  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]"));
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    buttons[next]?.click();
    buttons[next]?.focus();
  }
  return <div ref={root} className="projects-page">
    <header className="projects-hero">
      <div className="home-container">
        <div className="projects-breadcrumbs"><Breadcrumbs /></div>
        <div className="projects-title-mask"><RouteHeading>{routing.t("projects")}</RouteHeading></div>
        <p className="projects-hero-intro" data-projects-enter>{t("intro")}</p>
        <div className="projects-type-tabs" role="tablist" aria-label={catalogue.t("projectType")} onKeyDown={navigateTabs}>
          {types.map(type => <button key={type.key} id={`projects-tab-${type.key}`} type="button" role="tab"
            aria-selected={active.key === type.key} aria-controls="projects-collection" tabIndex={active.key === type.key ? 0 : -1}
              onClick={() => { if (active.key !== type.key) update({ projectType: type.value }); }}>{t(`types.${type.key}`)}</button>)}
        </div>
      </div>
    </header>
    <section id="projects-collection" role="tabpanel" aria-labelledby={`projects-tab-${active.key}`} className="home-container projects-catalogue">
      <ProjectFilters key={typeFilterKey(params.projectType)} />
      <ProjectsResults />
    </section>
  </div>;
}

export function ProjectsIndexPage() {
  return <ListProvider rememberTypes><ProjectsIndex /></ListProvider>;
}
