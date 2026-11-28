import { Suspense, useRef } from 'react';
import { Link, matchPath, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccountMotion } from '../Features/Account/useAccountMotion';
import { accountPages } from '../Router/routeDefinitions';
import { routePaths } from '../Router/routePaths';
import { PageLoading, RouteHeading } from '../Router/RouteFeedback';
import '../Styles/account.css';

const tabs = [
  { path: routePaths.account, title: 'profile' },
  { path: routePaths.reservations, title: 'reservations' },
  { path: routePaths.orders, title: 'orders' },
] as const;

export default function AccountLayout() {
  const { t } = useTranslation('routing');
  const { pathname } = useLocation();
  const page = accountPages.find(({ path }) => matchPath(path, pathname));
  const root = useRef<HTMLDivElement>(null);
  useAccountMotion(root, pathname);

  return (
    <div className="account-page" ref={root}>
      {page && (
        <div className="account-hero">
          <div className="home-container">
            <div className="account-hero-mask"><RouteHeading>{t(page.title)}</RouteHeading></div>
            <div className="account-hero-mask"><p>{t('intro', { ns: 'account' })}</p></div>
          </div>
        </div>
      )}
      <div className="account-tab-band">
        <nav className="home-container account-tabs" aria-label={t('accountNav')}>
          {tabs.map(({ path, title }) => {
            const active = matchPath({ path, end: path === routePaths.account }, pathname);
            return <Link key={path} to={path} aria-current={active ? 'page' : undefined}>{t(title)}</Link>;
          })}
        </nav>
      </div>
      <div className="home-container account-content">
        <Suspense key={pathname} fallback={<PageLoading />}><Outlet /></Suspense>
      </div>
    </div>
  );
}
