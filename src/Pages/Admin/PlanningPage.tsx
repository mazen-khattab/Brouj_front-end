import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { TimePlanProvider } from "../../Context/TimePlanProvider";
import { TemplatesProvider } from "../../Context/TemplatesProvider";
import { SourcePicker } from "../../Components/Planning/SourcePicker";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import TimePlanWorkspace from "./TimePlanWorkspace";
import TemplatesWorkspace from "./TemplatesWorkspace";

export default function PlanningPage({ title }: { title: string }) {
  const { t } = useTranslation("timePlans");
  const routing = useTranslation("routing");
  const auth = useAuth();
  const { pathname } = useLocation();
  const { projectId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${pathname}`;
  const templates = ["templates", "stageTemplates", "itemTemplates"].includes(title);
  const kind = title === "itemTemplates" ? "item" : "stage";
  const selectedId = search.get("id") ?? "";
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{routing.t(title)}</RouteHeading>
      <p className="max-w-3xl text-muted">{t(templates ? "templatesIntro" : "plansIntro")}</p>
      <nav aria-label={t("navigation")} className="flex flex-wrap gap-3">
        {(
          [
            ["timePlans", routePaths.admin.timePlans],
            ["stageTemplates", routePaths.admin.stageTemplates],
            ["itemTemplates", routePaths.admin.itemTemplates],
          ] as const
        ).map(([label, path]) => (
          <Link key={label} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={path}>
            {t(label)}
          </Link>
        ))}
      </nav>
      {templates ? (
        <TemplatesProvider
          key={`${scope}:${selectedId}:${search.get("create") ?? ""}`}
          scope={`${scope}:${selectedId}`}
          kind={kind}
          selectedId={selectedId}
        >
          <TemplatesWorkspace />
        </TemplatesProvider>
      ) : projectId ? (
        <TimePlanProvider key={scope} scope={scope} projectId={projectId}>
          <TimePlanWorkspace />
        </TimePlanProvider>
      ) : (
        <SourcePicker
          kind="project"
          scope={scope}
          value=""
          disabled={false}
          onChange={(row) => {
            if (row) {
              navigate(routePaths.admin.timePlan(row.id));
            }
          }}
        />
      )}
    </div>
  );
}
