import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Select } from "../Fields";
import { Pagination } from "../Pagination";
import { Button } from "../Button";
import { useCatalogueRead } from "../../Hooks/useCatalogueRead";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";
import * as cities from "../../Services/Cities";
import * as areas from "../../Services/Areas";
import { apiFailureMessage } from "../../i18n/apiFailures";

/** Search and page parents instead of downloading an unbounded catalogue or accepting raw IDs. */
export function ParentSelector({
  kind,
  value,
  onChange,
  error,
  disabled,
}: {
  kind: "city" | "area";
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  disabled: boolean;
}) {
  const { t } = useTranslation("admin");
  const { scope } = useAdminCatalogue();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const queryArgs = { pageNumber: page, pageSize: 20, search: query };
      return kind === "city" ? cities.getCities({ query: queryArgs }, { signal }) : areas.getAreas({ query: queryArgs }, { signal });
    },
    [kind, page, query],
  );
  const read = useCatalogueRead(`${scope}:${kind}:${page}:${query}`, load);
  const selectedLoad = useCallback(
    (signal: AbortSignal) => (kind === "city" ? cities.getCityById({ id: value }, { signal }) : areas.getAreaById({ id: value }, { signal })),
    [kind, value],
  );
  const selected = useCatalogueRead(`${scope}:${kind}:${value}`, selectedLoad, Boolean(value));
  const rows = read.result.status === "success" ? read.result.data.items : [];
  const selectedRecord = selected.result.status === "success" ? selected.result.data : undefined;
  const missingSelection = value && !rows.some((row) => row.id === value);
  return (
    <div className="grid min-w-0 gap-3 rounded-ui border border-accent/50 p-4">
      <Input
        id={`parent-search-${kind}`}
        label={t("searchParent", { parent: t(`fields.${kind}Id`) })}
        maxLength={100}
        value={search}
        disabled={disabled}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        id={`field-${kind}Id`}
        label={t(`fields.${kind}Id`)}
        value={value}
        error={error}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("choose")}</option>
        {missingSelection && <option value={value}>{selectedRecord?.name ?? t("selectedParent")}</option>}
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
            {"cityName" in row ? ` · ${row.cityName}` : ""}
          </option>
        ))}
      </Select>
      {read.result.status === "loading" && <p role="status">{t("loading")}</p>}
      {read.result.status === "error" && (
        <div role="alert">
          <p>{t(apiFailureMessage(read.result.failure).key, { ns: "errors" })}</p>
          <Button variant="secondary" onClick={read.reload}>
            {t("retry")}
          </Button>
        </div>
      )}
      {selected.result.status === "error" && <p role="alert">{t("parentUnavailable")}</p>}
      {read.result.status === "success" && (
        <Pagination page={page} totalPages={read.result.data.totalPages} pending={disabled} onPageChange={setPage} />
      )}
    </div>
  );
}
