import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ResourceRead } from "../Hooks/useResourceRead";
import { apiFailureMessage } from "../i18n/apiFailures";
import { ErrorPanel, Loading, Skeleton } from "./Feedback";

export function PublicReadPanel<T>({
  result,
  reload,
  children,
  missingDescription,
}: {
  result: ResourceRead<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
  missingDescription?: string;
}) {
  const { t } = useTranslation("catalogue");
  if (result.status === "success") return children(result.data);
  if (result.status === "idle") return null;
  if (result.status === "loading")
    return (
      <div aria-busy="true" className="grid gap-5 rounded-ui bg-ivory p-7 text-primary">
        <Loading label={t("loading")} />
        <Skeleton height="12rem" />
      </div>
    );
  const missing = result.failure.status === 404;
  const message = apiFailureMessage(result.failure);
  return (
    <div className="rounded-ui bg-ivory p-5 text-primary">
      <ErrorPanel
        title={t(missing ? "missingTitle" : "errorTitle")}
        description={missing ? (missingDescription ?? t("missingDescription")) : t(message.key, { ns: "errors" })}
        onRetry={reload}
      />
    </div>
  );
}
