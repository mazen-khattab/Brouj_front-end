import { useCallback, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { LocationPicker } from "../../../Components/LocationPicker";
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
    update({ search: null, cityId: null });
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
          {
            <button
              ref={toggle}
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-ui border border-primary/25 px-3 py-2 text-sm lg:hidden"
              aria-expanded={expanded}
              aria-controls="area-filter-fields"
              onClick={() => {
                if (expanded) {
                  container.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((element) => {
                    element.open = false;
                  });
                }
                setExpanded(!expanded);
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {t(expanded ? "hideFilters" : "showFilters")}
            </button>
          }
        </div>
      }
      <SearchField key={searchRevision} id="catalogue-search" label={t("search")} value={params.search ?? ""} onCommit={search} />

      {
        <div id={"area-filter-fields"} className={`gap-6 ${!expanded ? "hidden lg:grid" : "grid"}`}>
          <LocationPicker key={`city:${searchRevision}`} field="city" selectedId={params.cityId} onSelect={(id) => update({ cityId: id })} />
        </div>
      }
      <div className={`grid gap-4 ${"border-t border-primary/15 pt-5"}`}>
        <p className="text-xs leading-6 text-muted">{t("searchHint")}</p>
        <Button variant="primary" onClick={clear}>
          {t("clear")}
        </Button>
      </div>
    </section>
  );
}
