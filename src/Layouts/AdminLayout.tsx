import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from '../Components/BrandWordmark';
import { LanguageSwitcher } from '../Components/LanguageSwitcher';
import { Breadcrumbs, MobileNavigation, NavigationLinks, SessionControls, SessionNotice } from '../Components/Navigation';
import { PageLoading } from '../Router/RouteFeedback';
import { routePaths } from '../Router/routePaths';
import { useAuth } from '../Hooks/useAuth';
import { UserRole } from '../Types/contracts';
import { adminNavigation } from '../Pages/Admin/navigation';

export default function AdminLayout() {
  const auth = useAuth();
  const { t } = useTranslation('routing');
  const { pathname } = useLocation();
  const items = adminNavigation.filter((item) => !item.superAdmin || (auth.actor === 'staff' && auth.role === UserRole.SuperAdmin));
  return <div className="min-h-svh bg-linear-to-br from-accent-light via-ivory to-accent/45 text-primary lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="hidden border-e border-accent/40 bg-primary-deep p-6 text-white lg:block [&_:focus-visible]:outline-accent-light">
      <Link to={routePaths.home} className="no-underline"><BrandWordmark /></Link>
      <div className="sticky top-6 mt-12 [&_nav]:grid"><NavigationLinks items={items} label={t('adminNav')} /></div>
    </aside>
    <div className="min-w-0">
      <header className="border-b border-accent/30 bg-primary-deep px-5 py-5 text-white sm:px-9 [&_:focus-visible]:outline-accent-light">
        <div className="flex flex-wrap items-center justify-between gap-5"><Link to={routePaths.admin.home} className="text-lg font-medium no-underline">{t('dashboard')}</Link><LanguageSwitcher /><SessionControls /></div>
        <div className="mt-4 lg:hidden"><MobileNavigation><NavigationLinks items={items} label={t('adminNav')} /><Link to={routePaths.home} className="px-4 py-3 underline">{t('home')}</Link></MobileNavigation></div>
      </header>
      <main id="route-content" tabIndex={-1} className="mx-auto max-w-[1440px] px-5 py-8 sm:px-9 lg:py-12">
        <SessionNotice /><Breadcrumbs /><Suspense key={pathname} fallback={<PageLoading />}><Outlet /></Suspense>
      </main>
    </div>
  </div>;
}
