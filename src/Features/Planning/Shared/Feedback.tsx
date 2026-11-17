import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ErrorPanel, Loading } from "../../../Components/Feedback";
import { Button } from "../../../Components/Button";
import { Dialog } from "../../../Components/Dialog";
import type { CatalogueRead } from "../../../Hooks/useCatalogueRead";
import type { StaffOperation } from "../../../Hooks/useStaffOperation";
import { apiFailureMessage } from "../../../i18n/apiFailures";

export function PlanningRead({
  result,
  reload,
  retained = false,
}: {
  result: CatalogueRead<unknown>;
  reload: () => Promise<unknown>;
  retained?: boolean;
}) {
  const { t } = useTranslation("timePlans");
  if (result.status === "loading") {
    return <Loading label={t(retained ? "refreshing" : "loading")} />;
  }
  if (result.status === "error") {
    return (
      <ErrorPanel
        title={t(result.failure.status === 404 ? "missing" : "loadFailed")}
        description={t(apiFailureMessage(result.failure).key, { ns: "errors" })}
        onRetry={() => void reload().catch(() => {})}
      />
    );
  }
  return null;
}

export function PlanningFeedback({ action }: { action: StaffOperation }) {
  const { t } = useTranslation("timePlans");
  return (
    <div className="grid gap-3" aria-live="polite">
      {action.succeeded && <Alert tone="success">{t("saved")}</Alert>}
      {action.failure && (
        <Alert tone="error">
          {action.uncertain
            ? t("uncertain")
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

export function ConfirmButton({
  title,
  description,
  disabled,
  pending,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => Promise<unknown>;
  children: ReactNode;
}) {
  const { t } = useTranslation("timePlans");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} title={title} description={description} pending={pending} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-3">
          <Button
            pending={pending}
            disabled={disabled}
            onClick={() =>
              void onConfirm().then((result) => {
                if (result) {
                  setOpen(false);
                }
              })
            }
          >
            {t("confirm")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function MoveControls({
  name,
  index,
  count,
  disabled,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useTranslation("timePlans");
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" aria-label={t("moveUpName", { name })} disabled={disabled || index <= 0} onClick={() => onMove(-1)}>
        {t("moveUp")}
      </Button>
      <Button variant="secondary" aria-label={t("moveDownName", { name })} disabled={disabled || index >= count - 1} onClick={() => onMove(1)}>
        {t("moveDown")}
      </Button>
    </div>
  );
}
