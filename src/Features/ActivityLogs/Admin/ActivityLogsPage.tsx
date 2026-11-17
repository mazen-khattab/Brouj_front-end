import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../../Hooks/useAuth";
import { AdminWorkspaceNavigation } from "../../../Router/AdminWorkspaceNavigation";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { ActivityLogsProvider } from "./ActivityLogsProvider";
import Workspace from "./Workspace";

export default function ActivityLogsPage() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const { logId } = useParams();
  const routing = useTranslation("routing");
  const { t } = useTranslation("governance");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname, search].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{routing.t(logId ? "activityLog" : "activityLogs")}</RouteHeading>
      <p className="max-w-3xl text-muted">{t("auditIntro")}</p>
      <AdminWorkspaceNavigation />
      <ActivityLogsProvider key={scope} scope={scope} id={logId}>
        <Workspace />
      </ActivityLogsProvider>
    </div>
  );
}
