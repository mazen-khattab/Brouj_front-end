import { useCallback, useId, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { LocationPicker } from "../../../Components/LocationPicker";
import { SearchField } from "../../../Components/SearchField";
import { Select } from "../../../Components/Fields";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { useList } from "./ListContext";
import { activeProjectFilters, typeFilterKey } from "./typeFilters";

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const isMobile = () => window.matchMedia("(max-width: 1023px)").matches;

// The backend currently supports the same fields for both collections; state and copy are scoped independently.
const configurations = {
  all: { heading: "filters.all", hint: "filters.allHint" },
  "1": { heading: "filters.initiative", hint: "filters.initiativeHint" },
  "0": { heading: "filters.regular", hint: "filters.regularHint" },
} as const;

export function ProjectFilters({ includeProjectType = false }: { includeProjectType?: boolean }) {
  const { t } = useTranslation("projects");
  const { t: catalogue } = useTranslation("catalogue");
  const { locale } = useLocale();
  const { params, update, result } = useList();
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, () => false);
  const [expanded, setExpanded] = useState(false);
  const [settled, setSettled] = useState(false);
  const [revision, resetDrafts] = useReducer(value => value + 1, 0);
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const fieldsId = useId();
  const count = activeProjectFilters(params) + (includeProjectType && params.projectType != null ? 1 : 0);
  const configuration = configurations[typeFilterKey(params.projectType)];
  const search = useCallback((value: string) => update({ search: value || null }, true), [update]);
  function toggle() {
    if (expanded) panel.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(element => { element.open = false; });
    setSettled(false);
    setExpanded(!expanded);
  }
  function clear() {
    resetDrafts();
    update({ search: null, cityId: null, areaId: null, ...(includeProjectType ? { projectType: null } : {}) });
  }
  return <aside ref={panel} className="projects-filters" aria-label={catalogue("filters")} data-expanded={expanded} data-settled={settled}
    onKeyDown={event => {
      if (event.key === "Escape" && expanded) { toggle(); trigger.current?.focus(); }
    }}>
    <button ref={trigger} type="button" className="projects-filters-toggle" aria-label={t("filters.toggle")}
      aria-expanded={expanded} aria-controls={fieldsId} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      <span>{t("filters.toggle")}</span>
      {count > 0 && <span className="projects-filter-count" aria-label={t("filters.active", { count })}>{formatNumber(count, locale)}</span>}
      <svg className="projects-filter-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    <div id={fieldsId} className="projects-filter-grid" inert={mobile && !expanded}
      onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "grid-template-rows") setSettled(true); }}>
      <div className="projects-filter-inner">
        <div className="projects-filter-body">
          <header><p className="projects-eyebrow">{t("filters.eyebrow")}</p><h2>{t(configuration.heading)}</h2><p>{t(configuration.hint)}</p></header>
          <div className="projects-filter-match"><span>{t("filters.matching")}</span><strong>{result.status === "success" ? formatNumber(result.data.page.totalCount, locale) : "—"}</strong></div>
          <SearchField key={revision} id="catalogue-search" label={catalogue("search")} value={params.search ?? ""} onCommit={search} />
          {includeProjectType && <Select id="catalogue-type" label={catalogue("projectType")} value={params.projectType ?? ""}
            onChange={event => update({ projectType: event.target.value === "" ? null : Number(event.target.value) as 0 | 1 })}>
            <option value="">{catalogue("all")}</option>
            <option value="0">{catalogue("regular")}</option>
            <option value="1">{catalogue("initiative")}</option>
          </Select>}
          <LocationPicker key={`city:${revision}`} field="city" selectedId={params.cityId} onSelect={id => update({ cityId: id })} />
          <LocationPicker key={`area:${params.cityId ?? ""}:${revision}`} field="area" selectedId={params.areaId} onSelect={id => update({ areaId: id })} />
          <div className="projects-filter-footer"><p>{catalogue("searchHint")}</p><button type="button" onClick={clear}>{catalogue("clear")}<span aria-hidden="true">↻</span></button></div>
        </div>
      </div>
    </div>
  </aside>;
}
