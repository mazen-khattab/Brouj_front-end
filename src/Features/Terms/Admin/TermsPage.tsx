import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../../Hooks/useAuth";
import { AdminWorkspaceNavigation } from "../../../Router/AdminWorkspaceNavigation";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { TermsAdminProvider } from "./TermsAdminProvider";
import Workspace from "./Workspace";

export default function TermsPage() {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const { termsId } = useParams();
  const routing = useTranslation("routing");
  const { t } = useTranslation("governance");
  const scope = [auth.actor, auth.actor ? auth.profile.id : "", auth.generation, pathname, search].join(":");
  return (
    <div className="grid min-w-0 gap-7">
      <RouteHeading>{routing.t(termsId ? "term" : "terms")}</RouteHeading>
      <p className="max-w-3xl text-muted">{t("termsIntro")}</p>
      <AdminWorkspaceNavigation />
      <TermsAdminProvider key={scope} scope={scope} id={termsId}>
        <Workspace />
      </TermsAdminProvider>
    </div>
  );
}
