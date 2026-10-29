import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import { TermsAdminProvider } from "../../Context/TermsAdminProvider";
import { ActivityLogsProvider } from "../../Context/ActivityLogsProvider";
import { StaffAdminProvider } from "../../Context/StaffAdminProvider";
import { StaffAccountProvider } from "../../Context/StaffAccountProvider";
import TermsWorkspace from "./TermsWorkspace";
import AuditWorkspace from "./AuditWorkspace";
import StaffWorkspace from "./StaffWorkspace";
import StaffAccountWorkspace from "./StaffAccountWorkspace";

export default function GovernancePage({ title }: { title: string }) {
  const auth = useAuth();
  const { pathname, search } = useLocation();
  const { termsId, logId, userId } = useParams();
  const routing = useTranslation("routing");
  const { t } = useTranslation("governance");
  const scope = `${auth.actor}:${auth.actor ? auth.profile.id : ""}:${auth.generation}:${pathname}:${search}`;
  const terms = title === "terms" || title === "term";
  const audit = title === "activityLogs" || title === "activityLog";
  const staff = title === "staff" || title === "staffUser";
  return <div className="grid min-w-0 gap-7">
    <RouteHeading>{routing.t(title)}</RouteHeading>
    <p className="max-w-3xl text-muted">{t(terms ? "termsIntro" : audit ? "auditIntro" : staff ? "staffIntro" : "accountIntro")}</p>
    <nav aria-label={t("navigation")} className="flex flex-wrap gap-3">
      {([
        ["terms", routePaths.admin.terms], ["activityLogs", routePaths.admin.activityLogs],
        ...(auth.actor === "staff" && auth.role === 0 ? [["staff", routePaths.admin.staff]] : []), ["settings", routePaths.admin.account],
      ]).map(([label, path]) => <Link key={path} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={path!}>{routing.t(label!)}</Link>)}
    </nav>
    {terms ? <TermsAdminProvider key={scope} scope={scope} id={termsId}><TermsWorkspace /></TermsAdminProvider>
      : audit ? <ActivityLogsProvider key={scope} scope={scope} id={logId}><AuditWorkspace /></ActivityLogsProvider>
        : staff ? <StaffAdminProvider key={scope} scope={scope} id={userId}><StaffWorkspace /></StaffAdminProvider>
          : <StaffAccountProvider key={scope} scope={scope}><StaffAccountWorkspace /></StaffAccountProvider>}
  </div>;
}
