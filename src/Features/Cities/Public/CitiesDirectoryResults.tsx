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
import type { CityDto } from "../../../Types/contracts";
import { useList, type ListData } from "./ListContext";

function CityCard({ city }: { city: CityDto }) {
  const { t } = useTranslation("catalogue");
  return <article className="area-directory-card cities-directory-card">
    <Link className="area-directory-card-link" to={routePaths.city(city.id)} aria-label={city.name}>
      <span className="area-directory-card-top">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M49 26c0 12-17 29-17 29S15 38 15 26a17 17 0 1 1 34 0Z" /><circle cx="32" cy="26" r="6" /><path d="M10 55h44M32 3v6M9 26h6m34 0h6" /></svg>
        <span>{t("city")}</span>
      </span>
      <h2><bdi dir="auto">{city.name}</bdi></h2>
      <span className="area-directory-card-cta"><span>{t("viewAreas")}</span>
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
        const cards = root.current?.querySelectorAll(".cities-directory-card");
        if (cards?.length) gsap.from(cards, { y: 16, opacity: 0, duration: 0.85, stagger: { amount: 0.3 }, ease: "power3.out" });
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [data, locale]);
  return <section ref={root} className="projects-results cities-directory-results" aria-label={t("citiesDirectory")}>
    <header className="projects-results-heading">
      <p role="status">{t("results", { value: formatNumber(data.page.totalCount, locale) })}</p><span>{t("citiesDirectory")}</span>
    </header>
    {data.page.items.length ? <div className="area-directory-grid">{data.page.items.map(city => <CityCard key={city.id} city={city} />)}</div> :
      <div className="projects-empty cities-directory-empty">
        <h2>{t("empty")}</h2><p>{t("emptyDescription")}</p>
        <button type="button" onClick={() => update({ search: null })}>{t("clear")}</button>
      </div>}
    <div className="projects-pagination" role="group" aria-label={t("resultControls")}>
      <PageSizeSelect pageSize={data.page.pageSize} onChange={pageSize => update({ pageSize })} />
      <Pagination page={data.page.pageNumber} totalPages={data.page.totalPages} onPageChange={pageNumber => update({ pageNumber })} />
    </div>
  </section>;
}

export function CitiesDirectoryResults() {
  const { result, reload } = useList();
  return <div className="projects-results-region"><PublicReadPanel result={result} reload={reload}>
    {data => <Results data={data} />}
  </PublicReadPanel></div>;
}
