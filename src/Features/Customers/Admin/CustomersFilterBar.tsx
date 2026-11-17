import { useTranslation } from "react-i18next";
import { Input, Select } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { operationsPanel } from "../../../Components/panels";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import type { useCustomersQuery } from "./useCustomersQuery";

export function CustomersFilterBar({
  filters,
  pending,
  reload,
}: {
  filters: ReturnType<typeof useCustomersQuery>;
  pending: boolean;
  reload: () => Promise<unknown>;
}) {
  const { t } = useTranslation("admin");
  const { locale } = useLocale();
  return (
    <section className={`${operationsPanel} bg-accent-light`} aria-label={t("operations.filters")}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
