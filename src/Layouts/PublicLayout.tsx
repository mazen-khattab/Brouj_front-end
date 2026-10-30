import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandWordmark } from "../Components/BrandWordmark";
import { PublicHeader } from "../Components/PublicHeader";
import { LuxuryBackdrop } from "../Components/LuxuryBackdrop";
import {
  Breadcrumbs,
  SessionNotice,
} from "../Components/Navigation";
import { routePaths } from "../Router/routePaths";
import { PageLoading } from "../Router/RouteFeedback";

export default function PublicLayout() {
  const { t } = useTranslation("routing");
  const { pathname, key } = useLocation();
  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-x-clip text-white">
      <LuxuryBackdrop />
      <PublicHeader key={key} />
      <main
        id="route-content"
        tabIndex={-1}
        className="relative mx-auto w-full max-w-[1320px] flex-1 px-5 py-8 sm:px-10 lg:py-12"
      >
        <SessionNotice />
        <Breadcrumbs />
        <Suspense key={pathname} fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="relative mt-12 border-t border-accent bg-linear-to-br from-accent-light to-accent px-5 py-14 text-primary sm:px-10 lg:py-20">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap items-start justify-between gap-10 pb-12">
            <div className="max-w-md">
              <Link to={routePaths.home} className="inline-block no-underline [&>span]:text-primary [&_i]:bg-primary [&_span[aria-hidden]]:border-primary/40 [&_span[aria-hidden]]:size-16 [&_span:last-child]:text-4xl"><BrandWordmark /></Link>
              <p className="mt-7 text-2xl font-medium leading-relaxed">{t("publicFooter")}</p>
              <p className="mt-3 text-sm">{t("footerNote")}</p>
            </div>
            <nav aria-label={t("terms")} className="pt-3">
              <Link to={routePaths.terms} className="underline">{t("terms")}</Link>
            </nav>
          </div>
          <p className="max-w-none border-t border-primary/25 pt-7 text-sm">{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
