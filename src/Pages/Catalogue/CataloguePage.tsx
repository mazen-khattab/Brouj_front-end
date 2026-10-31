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
                  className="underline"
                  to={routePaths.city(detail.value.cityId)}
                >
                  {detail.value.cityName}
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
                    className="underline"
                    to={routePaths.area(detail.value.areaId)}
                  >
                    {t("backArea")}
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
                  className="underline"
                  to={routePaths.project(detail.value.projectId)}
                >
                  {t("backProject")}
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
