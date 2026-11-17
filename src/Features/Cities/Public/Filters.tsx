import { useCallback, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { SearchField } from "../../../Components/SearchField";
import { useList } from "./ListContext";
export function Filters() {
  const { t } = useTranslation("catalogue");
  const { params, update } = useList();
  const [searchRevision, resetSearch] = useReducer((revision: number) => revision + 1, 0);
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const search = useCallback((value: string) => update({ search: value || null }, true), [update]);
  function clear() {
    // Reset pending drafts and dropdown searches as well as the committed URL filters.
    resetSearch();
    update({ search: null });
  }
  return (
    <section
      ref={container}
      aria-label={t("filters")}
      className="grid min-w-0 gap-6 rounded-ui border border-accent/60 bg-accent-light p-5 text-primary sm:p-6"
      onKeyDown={(event) => {
        if (expanded && event.key === "Escape") {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}
    >
      {
        <div className="flex items-center justify-between gap-3 border-b border-primary/15 pb-4">
          <h2 className="text-lg font-medium">{t("filtersTitle")}</h2>
        </div>
      }
      <SearchField key={searchRevision} id="catalogue-search" label={t("search")} value={params.search ?? ""} onCommit={search} />

      <div className={`grid gap-4 ${"border-t border-primary/15 pt-5"}`}>
        <p className="text-xs leading-6 text-muted">{t("searchHint")}</p>
        <Button variant="primary" onClick={clear}>
          {t("clear")}
        </Button>
      </div>
    </section>
  );
}
