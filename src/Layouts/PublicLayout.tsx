import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from '../Components/BrandWordmark';
import { LanguageSwitcher } from '../Components/LanguageSwitcher';
import { LuxuryBackdrop } from '../Components/LuxuryBackdrop';
import { Breadcrumbs, MobileNavigation, NavigationLinks, SessionControls, SessionNotice } from '../Components/Navigation';
import { routePaths } from '../Router/routePaths';
import { PageLoading } from '../Router/RouteFeedback';

const items = [{ path: routePaths.home, title: 'home' }, { path: routePaths.cities, title: 'cities' }, { path: routePaths.projects, title: 'projects' }];
export default function PublicLayout() {
  const { t } = useTranslation('routing');
  const { pathname } = useLocation();
  return <div className="relative isolate flex min-h-svh flex-col text-white">
    <LuxuryBackdrop />
    <header className="relative border-b border-accent/30 [&_:focus-visible]:outline-accent-light">
      <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Link to={routePaths.home} className="no-underline"><BrandWordmark /></Link>
          <div className="hidden lg:block"><NavigationLinks items={items} label={t('mainNav')} /></div>
          <LanguageSwitcher />
          <div className="hidden lg:block"><SessionControls /></div>
        </div>
        <div className="mt-4 lg:hidden"><MobileNavigation><NavigationLinks items={items} label={t('mainNav')} /><SessionControls /></MobileNavigation></div>
      </div>
    </header>
    <main id="route-content" tabIndex={-1} className="relative mx-auto w-full max-w-[1320px] flex-1 px-5 py-8 sm:px-10 lg:py-12">
      <SessionNotice /><Breadcrumbs />
      <Suspense key={pathname} fallback={<PageLoading />}><Outlet /></Suspense>
    </main>
    <footer className="relative border-t border-accent bg-linear-to-br from-accent-light to-accent px-5 py-9 text-primary sm:px-10">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-7">
        <div><p className="text-xl font-medium">{t('publicFooter')}</p><p className="mt-3 text-sm">{t('footerNote')}</p></div>
        <nav aria-label={t('terms')} className="flex flex-wrap gap-5"><Link to={routePaths.terms} className="underline">{t('terms')}</Link><Link to={routePaths.staffLogin} className="underline">{t('staffLogin')}</Link></nav>
      </div>
    </footer>
  </div>;
}
