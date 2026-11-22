import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { PageSizeSelect } from "../../../Components/PageSizeSelect";
import { Pagination } from "../../../Components/Pagination";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { routePaths } from "../../../Router/routePaths";
import type { AreaListDto } from "../../../Types/contracts";
import { useList, type ListData } from "./ListContext";

function AreaCard({ area }: { area: AreaListDto }) {
  const { t } = useTranslation("catalogue");
  return <article className="area-directory-card">
    <Link className="area-directory-card-link" to={routePaths.area(area.id)} aria-label={area.name}>
      <span className="area-directory-card-top">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M7 7h50v50H7zM7 23h27V7M34 23h23M22 23v34M22 40h35M42 40v17M12 12h8m-4-4v8" /></svg>
        <span>{t("area")}</span>
      </span>
      <h2><bdi dir="auto">{area.name}</bdi></h2>
      <p className="area-directory-city">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>
        <bdi dir="auto">{area.cityName}</bdi>
      </p>
      <span className="area-directory-card-cta"><span>{t("viewProjects")}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
      </span>
    </Link>
  </article>;
}

function Results({ data }: { data: ListData }) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const { update } = useList();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = root.current?.querySelectorAll(".area-directory-card");
        if (cards?.length) gsap.from(cards, { y: 16, opacity: 0, duration: 0.85, stagger: { amount: 0.3 }, ease: "power3.out" });
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [data, locale]);
  return <section ref={root} className="projects-results area-directory-results" aria-label={t("areaDirectory")}>
    <header className="projects-results-heading">
      <p role="status">{t("results", { value: formatNumber(data.page.totalCount, locale) })}</p>
      <span>{t("areaDirectory")}</span>
    </header>
    {data.page.items.length ? <div className="area-directory-grid">{data.page.items.map(area => <AreaCard key={area.id} area={area} />)}</div> :
      <div className="projects-empty area-directory-empty">
        <h2>{t("empty")}</h2><p>{t("emptyDescription")}</p>
        <button type="button" onClick={() => update({ search: null, cityId: null })}>{t("clear")}</button>
      </div>}
    <div className="projects-pagination" role="group" aria-label={t("resultControls")}>
      <PageSizeSelect pageSize={data.page.pageSize} onChange={pageSize => update({ pageSize })} />
      <Pagination page={data.page.pageNumber} totalPages={data.page.totalPages} onPageChange={pageNumber => update({ pageNumber })} />
    </div>
  </section>;
}

export function AreaDirectoryResults() {
  const { result, reload } = useList();
  return <div className="projects-results-region"><PublicReadPanel result={result} reload={reload}>
    {data => <Results data={data} />}
  </PublicReadPanel></div>;
}
