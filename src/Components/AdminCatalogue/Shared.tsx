import { useTranslation } from "react-i18next";
import { Alert } from "../Feedback";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";

export function AdminActionFeedback({ refresh }: { refresh: () => Promise<unknown> }) {
  const action = useAdminCatalogue();
  const { t } = useTranslation("admin");
  return (
    <div className="grid gap-4" aria-live="polite">
      {action.succeeded && <Alert tone="success">{t("saved")}</Alert>}
      {action.failure && (
        <Alert tone="error">
          <p>
            {action.uncertain
              ? t("uncertain")
              : action.failure.status === 409
                ? t("conflict")
                : t(apiFailureMessage(action.failure).key, { ns: "errors" })}
          </p>
        </Alert>
      )}
      {action.blocked && (
        <Button variant="secondary" pending={action.pending} onClick={() => void action.check(refresh)}>
          {t("check")}
        </Button>
      )}
    </div>
  );
}

export function ConfirmAction({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { pending } = useAdminCatalogue();
  const { t } = useTranslation("admin");
  return (
    <Dialog open title={title} description={description} pending={pending} onClose={onClose}>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" pending={pending} onClick={() => void onConfirm()}>
          {t("confirm")}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </Dialog>
  );
}
