import { useCallback, useId, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { SearchField } from "../../../Components/SearchField";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { useList } from "./ListContext";

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 1023px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const isMobile = () => window.matchMedia("(max-width: 1023px)").matches;

export function CitiesDirectoryFilters() {
  const { t } = useTranslation("catalogue");
  const projects = useTranslation("projects");
  const { locale } = useLocale();
  const { params, result, update } = useList();
  const mobile = useSyncExternalStore(subscribeMobile, isMobile, () => false);
  const [expanded, setExpanded] = useState(false);
  const [settled, setSettled] = useState(false);
  const [revision, resetDraft] = useReducer(value => value + 1, 0);
  const trigger = useRef<HTMLButtonElement>(null);
  const fieldsId = useId();
  const count = params.search?.trim() ? 1 : 0;
  const search = useCallback((value: string) => update({ search: value || null }, true), [update]);
  function toggle() { setSettled(false); setExpanded(!expanded); }
  function clear() { resetDraft(); update({ search: null }); }
  return <aside className="projects-filters cities-directory-filters" aria-label={t("filters")}
    data-expanded={expanded} data-settled={settled} onKeyDown={event => {
      if (event.key === "Escape" && expanded) { toggle(); trigger.current?.focus(); }
    }}>
    <button ref={trigger} type="button" className="projects-filters-toggle" aria-label={projects.t("filters.toggle")}
      aria-expanded={expanded} aria-controls={fieldsId} onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      <span>{projects.t("filters.toggle")}</span>
      {count > 0 && <span className="projects-filter-count" aria-label={projects.t("filters.active", { count })}>{formatNumber(count, locale)}</span>}
      <svg className="projects-filter-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    <div id={fieldsId} className="projects-filter-grid" inert={mobile && !expanded}
      onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "grid-template-rows") setSettled(true); }}>
      <div className="projects-filter-inner"><div className="projects-filter-body">
        <header><p className="projects-eyebrow">{projects.t("filters.eyebrow")}</p><h2>{t("filtersTitle")}</h2><p>{t("citiesSearchHint")}</p></header>
        <div className="projects-filter-match"><span>{t("matchingCities")}</span><strong>{result.status === "success" ? formatNumber(result.data.page.totalCount, locale) : "—"}</strong></div>
        <SearchField key={revision} id="catalogue-search" label={t("search")} value={params.search ?? ""} onCommit={search} />
        <div className="projects-filter-footer"><p>{t("searchHint")}</p><button type="button" onClick={clear}>{t("clear")}<span aria-hidden="true">↻</span></button></div>
      </div></div>
    </div>
  </aside>;
}
