import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../../Hooks/useAuth";
import { AdminWorkspaceNavigation } from "../../../Router/AdminWorkspaceNavigation";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { StaffAdminProvider } from "./StaffAdminProvider";
import Workspace from "./Workspace";

export default function StaffPage() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const { userId } = useParams();
  const routing = useTranslation("routing");
  const { t } = useTranslation("governance");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname, search].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{routing.t(userId ? "staffUser" : "staff")}</RouteHeading>
      <p className="max-w-3xl text-muted">{t("staffIntro")}</p>
      <AdminWorkspaceNavigation />
      <StaffAdminProvider key={scope} scope={scope} id={userId}>
        <Workspace />
      </StaffAdminProvider>
    </div>
  );
}
