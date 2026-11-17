import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ResourceRead } from "../Hooks/useResourceRead";
import { apiFailureMessage } from "../i18n/apiFailures";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { ErrorPanel, Loading } from "./Feedback";

export const governancePanel = "grid min-w-0 gap-6 rounded-ui border border-accent/40 bg-ivory p-5 text-primary shadow-panel sm:p-8";

export function StaffWorkspaceRead({ result, reload }: { result: ResourceRead<unknown>; reload: () => Promise<unknown> }) {
  const { t } = useTranslation("governance");
  if (result.status === "loading") {
    return <Loading label={t("loading")} />;
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

export function StaffWorkspaceConfirm({
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
  const { t } = useTranslation("governance");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} title={title} description={description} pending={pending} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-3">
          <Button pending={pending} disabled={disabled} onClick={() => void onConfirm().finally(() => setOpen(false))}>
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
