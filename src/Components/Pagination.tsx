import { useTranslation } from "react-i18next";
import { useLocale } from "../Hooks/useLocale";
import { formatNumber } from "../i18n/format";
import { Button } from "./Button";
import { ui as styles } from './ui';

function Arrow({ next = false }: { next?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${styles.arrow} ${next ? styles.nextArrow : ""}`}
    >
      <path
        d="m14 6-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  pending = false,
  className = '',
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(totalPages) ||
    totalPages < 0
  )
    throw new RangeError("Invalid pagination bounds.");
  const current = totalPages ? Math.min(page, totalPages) : 0;
  return (
    <nav aria-label={t("pagination.label")} className={`${styles.pagination} ${className}`}>
      <Button
        variant="secondary"
        disabled={pending || current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        <Arrow />
        {t("pagination.previous")}
      </Button>
      <span aria-current={current ? "page" : undefined} aria-live="polite">
        {current
          ? t("pagination.page", {
              page: formatNumber(current, locale),
              total: formatNumber(totalPages, locale),
            })
          : t("pagination.empty")}
      </span>
      <Button
        variant="secondary"
        disabled={pending || current === 0 || current >= totalPages}
        onClick={() => onPageChange(current + 1)}
      >
        {t("pagination.next")}
        <Arrow next />
      </Button>
    </nav>
  );
}
