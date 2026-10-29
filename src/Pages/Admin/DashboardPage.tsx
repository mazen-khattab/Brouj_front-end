import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../Hooks/useAuth";
import { UserRole } from "../../Types/contracts";
import { RouteHeading } from "../../Router/RouteFeedback";
import { adminNavigation } from "./navigation";

export default function DashboardPage() {
  const auth = useAuth();
  const { t } = useTranslation("routing");
  if (auth.actor !== "staff") return null;
  return (
    <div className="grid gap-8">
      <section className="grid gap-5 rounded-ui border border-accent/50 bg-primary-deep p-7 text-white shadow-panel sm:p-10">
        <p className="text-sm text-accent-light">{t("workspace")}</p>
        <RouteHeading>{t("dashboard")}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">{t("dashboardDescription")}</p>
        <p className="border-t border-accent/30 pt-5">{t("signedInAs", { name: auth.profile.name })}</p>
        <p className="text-accent-light">{t(auth.role === UserRole.SuperAdmin ? "role.superAdmin" : "role.admin", { ns: "auth" })}</p>
      </section>
      <nav aria-label={t("workspace")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminNavigation
          .slice(1)
          .filter((item) => !item.superAdmin || auth.role === UserRole.SuperAdmin)
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group flex items-center justify-between gap-4 rounded-ui border border-accent/60 bg-accent-light p-6 text-lg font-medium text-primary no-underline shadow-sm transition-colors hover:bg-accent"
            >
              {t(item.title)}
              <span aria-hidden="true" className="rtl:-scale-x-100">
                ↗
              </span>
            </Link>
          ))}
      </nav>
    </div>
  );
}
