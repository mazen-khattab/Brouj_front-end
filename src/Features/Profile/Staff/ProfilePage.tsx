import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../Hooks/useAuth";
import { AdminWorkspaceNavigation } from "../../../Router/AdminWorkspaceNavigation";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { StaffAccountProvider } from "./StaffAccountProvider";
import Workspace from "./Workspace";

export default function ProfilePage() {
  const auth = useAuth();
  const { pathname, search } = useLocation();

  const routing = useTranslation("routing");
  const { t } = useTranslation("governance");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname, search].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{routing.t("settings")}</RouteHeading>
      <p className="max-w-3xl text-muted">{t("accountIntro")}</p>
      <AdminWorkspaceNavigation />
      <StaffAccountProvider key={scope} scope={scope}>
        <Workspace />
      </StaffAccountProvider>
    </div>
  );
}
