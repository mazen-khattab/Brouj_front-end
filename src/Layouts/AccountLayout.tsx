import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NavigationLinks } from '../Components/Navigation';
import { routePaths } from '../Router/routePaths';
import { PageLoading } from '../Router/RouteFeedback';

export default function AccountLayout() {
  const { t } = useTranslation('routing');
  const { pathname } = useLocation();
  return <div className="grid gap-8">
    <div className="rounded-ui border border-accent/50 bg-primary-deep/70 p-4 [&_:focus-visible]:outline-accent-light"><NavigationLinks label={t('accountNav')} items={[
      { path: routePaths.account, title: 'profile' }, { path: routePaths.reservations, title: 'reservations' }, { path: routePaths.orders, title: 'orders' },
    ]} /></div>
    <Suspense key={pathname} fallback={<PageLoading />}><Outlet /></Suspense>
  </div>;
}
