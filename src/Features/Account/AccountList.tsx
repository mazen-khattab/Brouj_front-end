import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BrandEmblem } from "../../Components/BrandWordmark";
import { Button } from "../../Components/Button";
import { Select } from "../../Components/Fields";
import { Pagination } from "../../Components/Pagination";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";
import { routePaths } from "../../Router/routePaths";
import type { PaginationResult } from "../../Types/contracts";

export function AccountFilters({
  statusKey,
  statuses,
  filters,
}: {
  statusKey: "reservationStatus" | "orderStatus";
  statuses: readonly number[];
  filters: {
    status: number | null;
    pageSize: number;
    update: (change: { status?: number | null; pageSize?: number }) => void;
    reload: () => void;
  };
}) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();
  const sizes = [...new Set([12, 24, 48, filters.pageSize])].sort((a, b) => a - b);

  return (
    <section className="account-toolbar" aria-label={t("status")}>
      <Select
        id="account-status"
        label={t("status")}
        value={filters.status ?? ""}
        onChange={({ target: { value } }) => filters.update({ status: value === "" ? null : Number(value) })}
      >
        <option value="">{t("all")}</option>
        {statuses.map((status) => <option key={status} value={status}>{t(`${statusKey}.${status}`)}</option>)}
      </Select>
      <Select
        id="account-page-size"
        label={t("pageSize")}
        value={filters.pageSize}
        onChange={(event) => filters.update({ pageSize: Number(event.target.value) })}
      >
        {sizes.map((size) => <option key={size} value={size}>{formatNumber(size, locale)}</option>)}
      </Select>
      <Button className="account-ghost account-refresh" variant="secondary" onClick={filters.reload}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 5v5h-5m5 0a8 8 0 1 0 .2 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("refresh")}
      </Button>
    </section>
  );
}

export function AccountResults({
  page,
  onPageChange,
  children,
}: {
  page: PaginationResult<unknown>;
  onPageChange: (page: number) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation("account");
  const { locale } = useLocale();

  return (
    <>
      <p className="account-results-count" role="status">{t("results", { value: formatNumber(page.totalCount, locale) })}</p>
      {page.items.length ? (
        <div className="account-records">{children}</div>
      ) : (
        <section className="account-panel account-empty">
          <BrandEmblem />
          <h2 className="account-section-title">{t("empty")}</h2>
          <p>{t("emptyDescription")}</p>
          <Link className="account-ghost" to={routePaths.projects}>{t("browse")}</Link>
        </section>
      )}
      <Pagination className="account-pagination" page={page.pageNumber} totalPages={page.totalPages} onPageChange={onPageChange} />
    </>
  );
}
