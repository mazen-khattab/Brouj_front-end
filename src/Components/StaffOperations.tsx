import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ResourceRead } from "../Hooks/useResourceRead";
import type { StaffOperation } from "../Hooks/useStaffOperation";
import { apiFailureMessage } from "../i18n/apiFailures";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Alert, ErrorPanel, Loading, Skeleton } from "./Feedback";
import { operationsPanel } from "./panels";

export function OperationsReadPanel<T>({
  result,
  reload,
  children,
}: {
  result: ResourceRead<T>;
  reload: () => Promise<unknown>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation("admin");
  if (result.status === "success") {
    return children(result.data);
  }
  if (result.status === "idle") {
    return null;
  }
  if (result.status === "loading") {
    return (
      <section className={operationsPanel} aria-busy="true">
        <Loading label={t("operations.loading")} />
        <Skeleton height="8rem" />
      </section>
    );
  }
  return (
    <section className={operationsPanel}>
      <ErrorPanel
        title={t(result.failure.status === 404 ? "operations.missing" : "operations.loadFailed")}
        description={t(apiFailureMessage(result.failure).key, { ns: "errors" })}
        onRetry={() => void reload().catch(() => {})}
      />
    </section>
  );
}

export function OperationFeedback({ action, operation }: { action: StaffOperation; operation: string }) {
  const { t } = useTranslation("admin");
  return (
    <div className="grid gap-4" aria-live="polite">
      {action.succeeded && <Alert tone="success">{t(`operations.${operation}Saved`)}</Alert>}
      {action.failure && (
        <Alert tone="error">
          <p>
            {action.uncertain
              ? t(`operations.${operation}Uncertain`)
              : action.failure.status === 409
                ? t(`operations.${operation}Conflict`)
                : t(apiFailureMessage(action.failure).key, { ns: "errors" })}
          </p>
        </Alert>
      )}
      {action.blocked && (
        <Button variant="secondary" pending={action.pending} onClick={() => void action.check()}>
          {t("operations.check")}
        </Button>
      )}
    </div>
  );
}

export function OperationDialog({
  open,
  operation,
  pending,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  operation: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
  children?: ReactNode;
}) {
  const { t } = useTranslation("admin");
  return (
    <Dialog
      open={open}
      title={t(`operations.${operation}Title`)}
      description={t(`operations.${operation}Description`)}
      pending={pending}
      onClose={onClose}
    >
      {children}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button pending={pending} pendingLabel={t("operations.working")} onClick={() => void onConfirm()}>
          {t("operations.confirm")}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={onClose}>
          {t("operations.cancel")}
        </Button>
      </div>
    </Dialog>
  );
}
