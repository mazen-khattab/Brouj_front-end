import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CatalogueDetailProvider } from "../../Context/CatalogueDetailProvider";
import { CatalogueListProvider } from "../../Context/CatalogueListProvider";
import { useCatalogueDetail } from "../../Hooks/useCatalogue";
import { useLocale } from "../../Hooks/useLocale";
import { CatalogueFeedback } from "../../Components/Catalogue/CatalogueFeedback";
import { CatalogueFilters } from "../../Components/Catalogue/CatalogueFilters";
import { CatalogueListing } from "../../Components/Catalogue/CatalogueListing";
import { MediaGallery } from "../../Components/Catalogue/MediaGallery";
import {
  Amenities,
  Facts,
  ProjectFacts,
  UnitFacts,
} from "../../Components/Catalogue/PropertyFacts";
import { ReservationEntry } from "../../Components/Catalogue/ReservationEntry";
import { RouteHeading } from "../../Router/RouteFeedback";
import { routePaths } from "../../Router/routePaths";
import { formatDateTime, formatNumber } from "../../i18n/format";
import { BidiText } from "../../Components/BidiText";
import { lazy, Suspense } from 'react';
import { useAuth } from '../../Hooks/useAuth';
import { PageLoading } from '../../Router/RouteFeedback';
import { AreaCatalogue } from '../../Components/Catalogue/AreaCatalogue';
import { ProjectCatalogue } from '../../Components/Catalogue/ProjectCatalogue';
import { UnitCarousel } from '../../Components/Catalogue/UnitCarousel';
import { ProjectTimePlan } from '../../Components/Catalogue/ProjectTimePlan';

const CustomerScope = lazy(() => import('../Account/CustomerScope'));

const panel =
  "grid min-w-0 gap-8 rounded-ui border border-accent/40 bg-ivory p-6 text-primary shadow-panel sm:p-9";
function DetailView({ terms = false }: { terms?: boolean }) {
  const { result, reload } = useCatalogueDetail();
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  return (
    <CatalogueFeedback result={result} reload={reload} terms={terms}>
      {(detail) => {
        if (detail.kind === "terms")
          return (
            <article className={panel}>
              <header>
                <h2 className="text-2xl font-medium">{detail.value.title}</h2>
                <p className="mt-3 text-sm text-muted">
                  {t("version", {
                    value: formatNumber(detail.value.versionNumber, locale),
                  })}
                </p>
              </header>
              <Facts
                items={[
                  {
                    label: t("effectiveDate"),
                    value: formatDateTime(detail.value.effectiveDate, locale),
                  },
                ]}
              />
              <div
                dir="auto"
                className="max-w-prose whitespace-pre-wrap leading-9 [overflow-wrap:anywhere]"
              >
                {detail.value.content}
              </div>
            </article>
          );
        if (detail.kind === "city")
          return (
            <>
              <div className={panel}>
                <h2 className="text-3xl font-medium">{detail.value.name}</h2>
                <p>{t("citiesIntro")}</p>
              </div>
              <CatalogueListProvider kind="areas" scopeId={detail.value.id}>
                <AreaCatalogue />
              </CatalogueListProvider>
            </>
          );
        if (detail.kind === "area")
          return (
            <>
              <section className={panel}>
                <h2 className="text-3xl font-medium">{detail.value.name}</h2>
                <Link
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/40 bg-accent-light/35 px-3.5 py-1 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
                  to={routePaths.city(detail.value.cityId)}
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent shrink-0">
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.36 7.587a15.82 15.82 0 002.273 1.765 11.253 11.253 0 001.04.573l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  <span>{detail.value.cityName}</span>
                </Link>
                <Amenities items={detail.value.amenities} cards />
              </section>
              <CatalogueListProvider kind="projects" scopeId={detail.value.id}>
                <ProjectCatalogue />
              </CatalogueListProvider>
            </>
          );
        if (detail.kind === "project")
          return (
            <>
              <article className={panel}>
                <header className="flex flex-wrap items-center justify-between gap-5">
                  <h2 className="text-3xl font-medium">{detail.value.name}</h2>
                  <Link
                    className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-light/30 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
                    to={routePaths.area(detail.value.areaId)}
                  >
                    <span>{t("backArea")}</span>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </header>
                <div className="grid gap-8 lg:grid-cols-2">
                  <MediaGallery
                    key={detail.value.id}
                    images={detail.value.images}
                  />
                  <ProjectFacts project={detail.value} />
                </div>
                <section>
                  <h2 className="mb-4 text-2xl font-medium">
                    {t("description")}
                  </h2>
                  <p dir="auto" className="whitespace-pre-wrap leading-9">
                    {detail.value.description || t("noDescription")}
                  </p>
                </section>
                <Amenities items={detail.value.amenities} cards />
              </article>
              <UnitCarousel projectId={detail.value.id} />
              <ProjectTimePlan projectId={detail.value.id} />
            </>
          );
        return (
          <>
            <article className={panel}>
              <header className="flex flex-wrap items-center justify-between gap-5">
                <h2 className="text-3xl font-medium">
                  {t("unitLabel", { number: "" })}
                  <BidiText>{detail.value.number}</BidiText>
                </h2>
                <Link
                  className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-light/30 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
                  to={routePaths.project(detail.value.projectId)}
                >
                  <span>{t("backProject")}</span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </Link>
              </header>
              <div className="grid gap-8 lg:grid-cols-2">
                <MediaGallery
                  key={detail.value.id}
                  images={detail.value.images}
                />
                <UnitFacts unit={detail.value} full />
              </div>
              <Amenities items={detail.value.amenities} />
            </article>
            <ReservationEntry unit={detail.value} />
          </>
        );
      }}
    </CatalogueFeedback>
  );
}
export default function CataloguePage({ kind }: { kind: string }) {
  const [search] = useSearchParams();
  const auth = useAuth();
  const { cityId, areaId, projectId, unitId } = useParams();
  const { t } = useTranslation("routing");
  const catalogue = useTranslation("catalogue");
  const intro =
    kind === "cities"
      ? "citiesIntro"
      : kind === "areas"
        ? "areasIntro"
        : kind === "projects"
          ? "projectsIntro"
          : kind === "terms"
            ? "termsIntro"
            : "intro";
  return (
    <div className="grid gap-8 motion-safe:animate-fade-in">
      <header className="grid gap-4">
        <RouteHeading>{t(kind === 'projects' && search.get('projectType') === '1' ? 'initiativeProjects' : kind)}</RouteHeading>
        <p className="max-w-prose leading-8 text-white/80">
          {catalogue.t(intro)}
        </p>
      </header>
      {kind === "cities" || kind === "areas" || kind === "projects" ? (
        <CatalogueListProvider kind={kind}>
          {kind === 'projects' ? <ProjectCatalogue /> : kind === 'areas' ? <AreaCatalogue /> : <>
            <CatalogueFilters />
            <CatalogueListing />
          </>}
        </CatalogueListProvider>
      ) : (
        <CatalogueDetailProvider
          kind={kind as "city" | "area" | "project" | "unit" | "terms"}
          id={cityId ?? areaId ?? unitId ?? projectId}
          projectId={projectId}
        >
          {kind === 'unit' && auth.actor === 'customer' ? <Suspense fallback={<PageLoading />}>
            <CustomerScope key={`${auth.profile.id}:${auth.generation}:${unitId}`}><DetailView /></CustomerScope>
          </Suspense> : <DetailView terms={kind === "terms"} />}
        </CatalogueDetailProvider>
      )}
    </div>
  );
}
