import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { routePaths } from "./routePaths";

export function OperationsNavigation() {
  const { t } = useTranslation("routing");
  return (
    <nav aria-label={t("operations.navigation", { ns: "admin" })} className="flex flex-wrap gap-3">
      {(["customers", "reservations", "orders"] as const).map((kind) => (
        <Link key={kind} className="rounded-ui border border-primary/25 bg-accent/40 px-5 py-3" to={routePaths.admin[kind]}>
          {t(kind)}
        </Link>
      ))}
    </nav>
  );
}
