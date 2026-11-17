import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../Hooks/useAuth";
import { routePaths } from "./routePaths";
export function AdminWorkspaceNavigation() {
  const auth = useAuth();
  const { t } = useTranslation("governance");
  const routing = useTranslation("routing");
  return (
    <nav aria-label={t("navigation")} className="flex flex-wrap gap-3">
      {[
        ["terms", routePaths.admin.terms],
        ["activityLogs", routePaths.admin.activityLogs],
        ...(auth.actor === "staff" && auth.role === 0 ? [["staff", routePaths.admin.staff]] : []),
        ["settings", routePaths.admin.account],
      ].map(([label, path]) => (
        <Link key={path} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={path!}>
          {routing.t(label!)}
        </Link>
      ))}
    </nav>
  );
}
