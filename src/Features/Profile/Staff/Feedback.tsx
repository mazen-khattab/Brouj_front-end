import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Alert } from "../../../Components/Feedback";
import type { StaffOperation } from "../../../Hooks/useStaffOperation";
import { apiFailureMessage } from "../../../i18n/apiFailures";
export function WriteFeedback({ action }: { action: StaffOperation }) {
  const { t } = useTranslation("governance");
  return (
    <div className="grid gap-3" aria-live="polite">
      {action.succeeded && <Alert tone="success">{t("passwordSaved")}</Alert>}
      {action.failure && (
        <Alert tone="error">
          {action.uncertain
            ? t("uncertain")
            : action.failure.status === 401 && action.failure.featureCode === 1
              ? t("wrongPassword")
              : action.failure.status === 409
                ? t("conflict")
                : t(apiFailureMessage(action.failure).key, { ns: "errors" })}
        </Alert>
      )}
      {action.blocked && (
        <Button variant="secondary" pending={action.pending} onClick={() => void action.check()}>
          {t("check")}
        </Button>
      )}
    </div>
  );
}
