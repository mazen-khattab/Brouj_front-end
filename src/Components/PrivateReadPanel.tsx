import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ResourceRead } from "../Hooks/useResourceRead";
import { apiFailureMessage } from "../i18n/apiFailures";
import { ErrorPanel, Loading, Skeleton } from "./Feedback";

export const accountPanel = "grid min-w-0 gap-6 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
export function PrivateReadPanel<T>({ result, reload, children }: { result: ResourceRead<T>; reload: () => void; children: (data: T) => ReactNode }) {
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
