import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, ErrorPanel, Loading, Skeleton } from "../Feedback";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { useCustomerAction } from "../../Hooks/useAccount";
import { routePaths } from "../../Router/routePaths";

export const accountPanel = "grid min-w-0 gap-6 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
export function AccountFeedback<T>({ result, reload, children }: { result: CatalogueRead<T>; reload: () => void; children: (data: T) => ReactNode }) {
  const { t } = useTranslation("account");
  if (result.status === "success") return children(result.data);
  if (result.status === "idle") return null;
  if (result.status === "loading")
    return (
      <section className={accountPanel} aria-busy="true">
        <Loading label={t("loading")} />
        <Skeleton height="10rem" />
      </section>
    );
  const message = apiFailureMessage(result.failure);
  return (
    <section className={accountPanel}>
      <ErrorPanel
        title={t(result.failure.status === 404 ? "missingTitle" : "errorTitle")}
        description={result.failure.status === 404 ? t("missingDescription") : t(message.key, { ns: "errors" })}
        onRetry={reload}
      />
    </section>
  );
}
export function ActionFeedback() {
  const action = useCustomerAction();
  const { t } = useTranslation("account");
  if (action.succeeded) {
    const key =
      action.operation === "profile"
        ? "profileSaved"
        : action.operation === "password"
          ? "passwordSaved"
          : action.operation === "cancel"
            ? "cancelled"
            : undefined;
    return key ? <Alert tone="success">{t(key)}</Alert> : null;
  }
  if (!action.failure) return null;
  const message = apiFailureMessage(action.failure);
  const key = action.uncertain
    ? action.operation === "password"
      ? "uncertainPassword"
      : action.operation === "profile"
        ? "uncertainProfile"
        : "uncertain"
    : action.failure.status === 409
      ? "conflict"
      : action.operation === "password" && action.failure.featureCode === 1
        ? "wrongPassword"
        : undefined;
  return (
    <Alert tone="error">
      <div className="grid gap-4">
        <p>{key ? t(key) : t(message.key, { ns: "errors" })}</p>
        {action.uncertain && (action.operation === "create" || action.operation === "cancel") && (
          <Link className="underline" to={routePaths.reservations}>
            {t("checkReservations")}
          </Link>
        )}
      </div>
    </Alert>
  );
}
