import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ErrorPanel, Loading, Skeleton } from "../Feedback";
import { Button } from "../Button";
import { Input, Select } from "../Fields";
import { Dialog } from "../Dialog";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";
import type { StaffOperation } from "../../Hooks/useStaffOperation";
import type { OperationsKind } from "../../AdminOperations/policy";
import type { OperationsFilters } from "../../AdminOperations/types";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { formatNumber } from "../../i18n/format";
import { useLocale } from "../../Hooks/useLocale";
import { operationsPanel } from "./classes";

export function OperationsStatus({ value, order = false }: { value: number; order?: boolean }) {
  const { t } = useTranslation("account");
  return (
    <span className="inline-flex rounded-ui bg-accent-light px-4 py-2 text-sm font-medium text-primary">
      {t(`${order ? "orderStatus" : "reservationStatus"}.${value}`, { defaultValue: t("unknownStatus") })}
    </span>
  );
}

export function OperationsReadPanel<T>({
  result,
  reload,
  children,
}: {
  result: CatalogueRead<T>;
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

export function OperationsFilterBar({
  kind,
  filters,
  pending,
  reload,
}: {
  kind: OperationsKind;
  filters: OperationsFilters;
  pending: boolean;
  reload: () => Promise<unknown>;
}) {
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  return (
    <section className={`${operationsPanel} bg-accent-light`} aria-label={t("operations.filters")}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {kind === "customers" ? (
          <>
            <Input
              id="ops-search"
              label={t("operations.searchCustomers")}
              value={filters.search}
              maxLength={100}
              disabled={pending}
              onChange={(e) => filters.setSearch(e.target.value)}
            />
            <Select
              id="ops-deleted"
              label={t("operations.customerState")}
              value={filters.isDeleted === null ? "" : String(filters.isDeleted)}
              disabled={pending}
              onChange={(e) => filters.update({ isDeleted: e.target.value === "" ? null : e.target.value === "true" })}
            >
              <option value="">{t("operations.allCustomers")}</option>
              <option value="false">{t("operations.active")}</option>
              <option value="true">{t("operations.deleted")}</option>
            </Select>
          </>
        ) : (
          <Select
            id="ops-status"
            label={t("status", { ns: "account" })}
            value={filters.status ?? ""}
            disabled={pending}
            onChange={(e) => filters.update({ status: e.target.value === "" ? null : Number(e.target.value) })}
          >
            <option value="">{t("all", { ns: "account" })}</option>
            {(kind === "orders" ? [0, 1, 2, 3] : [0, 1, 2]).map((status) => (
              <option key={status} value={status}>
                {t(`${kind === "orders" ? "orderStatus" : "reservationStatus"}.${status}`, { ns: "account" })}
              </option>
            ))}
          </Select>
        )}
        <Select
          id="ops-page-size"
          label={t("pageSize", { ns: "account" })}
          value={filters.pageSize}
          disabled={pending}
          onChange={(e) => filters.update({ pageSize: Number(e.target.value) })}
        >
          {[...new Set([20, 50, 100, filters.pageSize])]
            .sort((a, b) => a - b)
            .map((size) => (
              <option key={size} value={size}>
                {formatNumber(size, locale)}
              </option>
            ))}
        </Select>
      </div>
      <Button className="justify-self-start" variant="secondary" disabled={pending} onClick={() => void reload().catch(() => {})}>
        {t("operations.refresh")}
      </Button>
    </section>
  );
}
