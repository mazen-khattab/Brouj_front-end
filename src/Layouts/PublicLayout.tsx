import { Suspense } from "react";
import { Link, Outlet, useLocation, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandWordmark } from "../Components/BrandWordmark";
import { PublicHeader } from "../Components/PublicHeader";
import { LuxuryBackdrop } from "../Components/LuxuryBackdrop";
import { Breadcrumbs, SessionNotice } from "../Components/Navigation";
import { routePaths } from "../Router/routePaths";
import { PageLoading } from "../Router/RouteFeedback";
import "../Styles/home.css";

export default function PublicLayout() {
  const { t } = useTranslation("routing");
  const { pathname, key } = useLocation();
  const isHome = pathname === routePaths.home;
  const isProjects = pathname === routePaths.projects;
  const isProjectDetail = Boolean(matchPath('/projects/:projectId', pathname));
  const isUnitDetail = Boolean(matchPath('/projects/:projectId/units/:unitId', pathname));
  const isAreaDetail = Boolean(matchPath('/areas/:areaId', pathname));
  const isCityDetail = Boolean(matchPath('/cities/:cityId', pathname));
  const isCities = pathname === routePaths.cities;
  const isAreas = pathname === routePaths.areas;
  const isEditorial = isHome || isProjects || isProjectDetail || isUnitDetail || isAreaDetail || isCityDetail || isCities || isAreas || pathname === routePaths.about || pathname === routePaths.terms;
  return (
    <div className={`relative isolate flex min-h-svh flex-col overflow-x-clip text-white ${isEditorial ? "home-shell" : ""}`}>
      {!isEditorial && <LuxuryBackdrop />}
      <PublicHeader key={key} />
      <main id="route-content" tabIndex={-1} className={`relative z-10 mx-auto w-full flex-1 ${isEditorial ? "" : "max-w-[1320px] px-5 py-8 sm:px-10 lg:py-12"}`}>
        <SessionNotice />
        {!isProjects && !isProjectDetail && !isUnitDetail && !isAreaDetail && !isCityDetail && !isCities && !isAreas && (isEditorial && !isHome ? <div className="home-container editorial-breadcrumbs"><Breadcrumbs /></div> : <Breadcrumbs />)}
        <Suspense key={pathname} fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={isEditorial ? "home-footer" : "relative mt-12 border-t border-accent bg-linear-to-br from-accent-light to-accent px-5 py-14 text-primary sm:px-10 lg:py-20"}>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap items-start justify-between gap-10 pb-12">
            <div className="max-w-md">
              <Link
                to={routePaths.home}
                className={isEditorial ? "inline-block no-underline" : "inline-block no-underline [&>span]:text-primary [&_i]:bg-primary [&_span[aria-hidden]]:border-primary/40 [&_span[aria-hidden]]:size-16 [&_span:last-child]:text-4xl"}
              >
                <BrandWordmark />
              </Link>
              <p className="mt-7 text-2xl font-medium leading-relaxed">{t("publicFooter")}</p>
              <p className="mt-3 text-sm">{t("footerNote")}</p>
            </div>
            <nav aria-label={t("terms")} className="pt-3">
              <Link
                to={routePaths.terms}
                className={isEditorial ? "home-action" : "inline-flex items-center gap-1.5 text-sm font-medium text-primary/85 underline decoration-primary/30 underline-offset-4 transition-all hover:text-primary-deep hover:decoration-primary"}
              >
                {t("terms")}
              </Link>
            </nav>
          </div>
          <p className={`max-w-none border-t pt-7 text-sm ${isEditorial ? "border-white/15" : "border-primary/25"}`}>{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
