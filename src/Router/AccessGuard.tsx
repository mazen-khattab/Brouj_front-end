import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Hooks/useAuth';
import { Button } from '../Components/Button';
import { Alert } from '../Components/Feedback';
import { allowedReturnPath, actorHome, permits } from './routeDefinitions';
import type { Access } from './routeDefinitions';
import { PageLoading, RouteHeading, RouteMessage } from './RouteFeedback';
import { routePaths } from './routePaths';
import { LanguageSwitcher } from '../Components/LanguageSwitcher';
import { useToast } from '../Hooks/useToast';
import type { ReactNode } from 'react';

function GuardFrame({ standalone, children }: { standalone: boolean; children: ReactNode }) {
  return standalone ? <main id="route-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-10 sm:px-10">{children}</main> : <>{children}</>;
}

export function AccessGuard({ access }: { access: Access }) {
  const auth = useAuth();
  const location = useLocation();
  const { t } = useTranslation('routing');
  const notify = useToast();
  const standalone = access === 'staff' || access === 'anonymous';
  if (auth.status === 'bootstrapping') return <GuardFrame standalone={standalone}><PageLoading /></GuardFrame>;
  if (auth.status === 'unavailable' || (auth.status === 'anonymous' && auth.logoutRequired)) return <GuardFrame standalone={standalone}><section className="grid gap-6 rounded-ui bg-ivory p-8 text-primary">
    {standalone && <div className="justify-self-end"><LanguageSwitcher /></div>}
    <RouteHeading>{t('sessionUnavailable')}</RouteHeading>
    <Alert tone="error">{t('sessionUnavailableDescription')}</Alert>
    {auth.reason && <p>{t(auth.reason, { ns: 'auth' })}</p>}
    <Button pending={auth.pending} onClick={() => void auth.retryBootstrap().catch(() => undefined)}>{t('retry', { ns: 'auth' })}</Button>
    {auth.logoutRequired && <Button variant="secondary" pending={auth.pending} onClick={() => void auth.logout().catch(() => notify({ tone: 'error', message: { namespace: 'auth', key: 'logoutUnconfirmed' } }))}>{t('logout', { ns: 'auth' })}</Button>}
  </section></GuardFrame>;
  if (access === 'anonymous') {
    if (auth.actor) return <Navigate replace to={allowedReturnPath(new URLSearchParams(location.search).get('returnTo'), auth)} />;
    return <Outlet />;
  }
  if (!auth.actor) {
    const login = access === 'staff' || access === 'superAdmin' ? routePaths.staffLogin : routePaths.login;
    return <Navigate replace to={`${login}?${new URLSearchParams({ returnTo: location.pathname + location.search + location.hash })}`} />;
  }
  if (!permits(access, auth)) return <GuardFrame standalone={standalone}>
    {standalone && <div className="mb-5 flex justify-end"><LanguageSwitcher /></div>}
    <RouteMessage kind="forbidden" action={<Link className="underline" to={actorHome(auth)}>{t('continue')}</Link>} />
  </GuardFrame>;
  // Future feature providers and local page state are discarded at each identity/generation boundary.
  return <Outlet key={`${auth.actor}:${auth.profile.id}:${auth.generation}`} />;
}
