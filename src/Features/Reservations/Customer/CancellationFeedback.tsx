import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert } from "../../../Components/Feedback";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import { routePaths } from "../../../Router/routePaths";
import { useCancellation } from "./CancellationContext";

export function CancellationFeedback() {
  const action = useCancellation();
  const { t } = useTranslation("account");
  if (action.succeeded) {
    return <Alert tone="success">{t("cancelled")}</Alert>;
  }
  if (!action.failure) return null;
  const message = apiFailureMessage(action.failure);
  const key = action.uncertain ? "uncertain" : action.failure.status === 409 ? "conflict" : undefined;
  return (
    <Alert tone="error">
      <div className="grid gap-4">
        <p>{key ? t(key) : t(message.key, { ns: "errors" })}</p>
        {action.uncertain && (
          <Link className="underline" to={routePaths.reservations}>
            {t("checkReservations")}
          </Link>
        )}
      </div>
    </Alert>
  );
}
