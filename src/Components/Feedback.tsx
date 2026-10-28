import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { ui as styles } from './ui';

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={`${styles.alert} ${styles[tone]}`}
    >
      {children}
    </div>
  );
}

export function ValidationSummary({
  items,
}: {
  items: { fieldId: string; message: string }[];
}) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <div
      role="alert"
      className={`${styles.alert} ${styles.error} ${styles.summary}`}
    >
      <strong>{t("validationTitle")}</strong>
      <ul>
        {items.map(({ fieldId, message }) => (
          <li key={fieldId}>
            <a
              href={`#${fieldId}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(fieldId)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className={styles.loading}>
      <Skeleton width="3rem" height="0.6rem" />
      {label ?? t("loading")}
    </div>
  );
}

export function Skeleton({
  width = "100%",
  height = "1rem",
}: {
  width?: CSSProperties["inlineSize"];
  height?: CSSProperties["blockSize"];
}) {
  return (
    <div
      aria-hidden="true"
      className={styles.skeleton}
      style={{ inlineSize: width, blockSize: height }}
    />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.state}>
      <h3>{title ?? t("emptyTitle")}</h3>
      <p>{description ?? t("emptyDescription")}</p>
    </div>
  );
}

export function ErrorPanel({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.state} role="alert">
      <h3>{title ?? t("errorTitle")}</h3>
      <p>{description ?? t("errorDescription")}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
