import { useTranslation } from "react-i18next";
import { Alert } from "../../../Components/Feedback";
import { apiFailureMessage } from "../../../i18n/apiFailures";
import { useProfileActions } from "./ActionContext";

export function ActionFeedback() {
  const action = useProfileActions();
  const { t } = useTranslation("account");
  if (action.succeeded) {
    const key = action.operation === "profile" ? "profileSaved" : action.operation === "password" ? "passwordSaved" : undefined;
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
      </div>
    </Alert>
  );
}
