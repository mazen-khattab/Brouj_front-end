import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";
import { Loading, Skeleton, ErrorPanel } from "../Feedback";
import { apiFailureMessage } from "../../i18n/apiFailures";

export function CatalogueFeedback<T>({
  result,
  reload,
  children,
  terms = false,
}: {
  result: CatalogueRead<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
  terms?: boolean;
}) {
  const { t } = useTranslation("catalogue");
  if (result.status === "success") return children(result.data);
  if (result.status === "idle") return null;
  if (result.status === "loading")
    return (
      <div
        aria-busy="true"
        className="grid gap-5 rounded-ui bg-ivory p-7 text-primary"
      >
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
        description={
          missing
            ? t(terms ? "termsMissing" : "missingDescription")
            : t(message.key, { ns: "errors" })
        }
        onRetry={reload}
      />
    </div>
  );
}
