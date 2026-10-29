import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStaffRead } from "../../Hooks/useStaffRead";
import { getProjects } from "../../Services/Projects";
import { getStageTemplates, getItemTemplates } from "../../Services/Templates";
import { Input, Select } from "../Fields";
import { Pagination } from "../Pagination";
import { PlanningRead } from "./Shared";

export interface SourceChoice {
  id: string;
  name: string;
  isActive?: boolean;
}
/** Sources are paged independently; opening a project picker never fetches any time plans. */
export function SourcePicker({
  kind,
  scope,
  value,
  selectedName,
  onChange,
  disabled,
  activeOnly = false,
}: {
  kind: "project" | "stage" | "item";
  scope: string;
  value: string;
  selectedName?: string | undefined;
  onChange: (row: SourceChoice | null) => void;
  disabled: boolean;
  activeOnly?: boolean;
}) {
  const { t } = useTranslation("timePlans");
  const id = useId();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (search === query) {
      return;
    }
    const timeout = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, query]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const args = { pageNumber: page, pageSize: 20, search: query };
      if (kind === "project") {
        return getProjects({ query: args }, { signal });
      }
      const templateArgs = { ...args, isActive: activeOnly ? true : null };
      return kind === "stage" ? getStageTemplates({ query: templateArgs }, { signal }) : getItemTemplates({ query: templateArgs }, { signal });
    },
    [kind, page, query, activeOnly],
  );
  const read = useStaffRead(`${scope}:${kind}:${page}:${query}:${activeOnly}`, load);
  const rows = read.result.status === "success" ? read.result.data.items : [];
  return (
    <div className="grid min-w-0 gap-4 rounded-ui border border-accent/50 bg-accent-light p-4">
      <Input
        id={`${id}-search`}
        label={t("searchSource", { source: t(`source.${kind}`) })}
        value={search}
        maxLength={100}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        id={`${id}-source`}
        label={t(`source.${kind}`)}
        value={value}
        disabled={disabled || read.result.status !== "success"}
        onChange={(event) => onChange(rows.find((row) => row.id === event.target.value) ?? null)}
      >
        <option value="">{t(kind === "stage" ? "manualStage" : "choose")}</option>
        {value && !rows.some((row) => row.id === value) && <option value={value}>{selectedName ?? t("selected")}</option>}
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
            {"isActive" in row && !row.isActive ? ` · ${t("inactive")}` : ""}
          </option>
        ))}
      </Select>
      <PlanningRead result={read.result} reload={read.reload} />
      {read.result.status === "success" && (
        <Pagination page={page} totalPages={read.result.data.totalPages} pending={disabled} onPageChange={setPage} />
      )}
    </div>
  );
}
