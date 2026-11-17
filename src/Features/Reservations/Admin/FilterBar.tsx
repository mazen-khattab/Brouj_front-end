import { useTranslation } from "react-i18next";
import { operationsPanel } from "../../../Components/panels";
import { Button } from "../../../Components/Button";
import { Select } from "../../../Components/Fields";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import type { useReservationsQuery } from "./useQuery";

export function ReservationsFilterBar({
  filters,
  pending,
  reload,
}: {
  filters: ReturnType<typeof useReservationsQuery>;
  pending: boolean;
  reload: () => Promise<unknown>;
}) {
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  return (
    <section className={`${operationsPanel} bg-accent-light`} aria-label={t("operations.filters")}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Select
          id="ops-status"
          label={t("status", { ns: "account" })}
          value={filters.status ?? ""}
          disabled={pending}
          onChange={(e) => filters.update({ status: e.target.value === "" ? null : Number(e.target.value) })}
        >
          <option value="">{t("all", { ns: "account" })}</option>
          {[0, 1, 2].map((status) => (
            <option key={status} value={status}>
              {t(`${"reservationStatus"}.${status}`, { ns: "account" })}
            </option>
          ))}
        </Select>

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
