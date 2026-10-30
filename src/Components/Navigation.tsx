import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Alert } from './Feedback';
import { useAuth } from '../Hooks/useAuth';
import { useToast } from '../Hooks/useToast';
import { routeDefinitions } from '../Router/routeDefinitions';
import { routePaths } from '../Router/routePaths';

export interface NavigationItem { path: string; title: string }
export function NavigationLinks({ items, label, vertical = false }: { items: readonly NavigationItem[]; label: string; vertical?: boolean }) {
  const { t } = useTranslation('routing');
  const location = useLocation();
  return <nav aria-label={label} className={vertical ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
    {items.map((item) => {
      // Query filters and section anchors identify distinct public navigation destinations.
      const destination = new URL(item.path, 'https://brouj.com');
      const active = Boolean(matchPath({ path: destination.pathname, end: true }, location.pathname))
        && location.hash === destination.hash
        && [...destination.searchParams].every(([key, value]) => new URLSearchParams(location.search).get(key) === value);
      return <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={`rounded-ui px-4 py-3 text-sm no-underline transition-colors ${active ? 'bg-accent text-primary shadow-sm' : 'text-inherit hover:bg-accent/15'}`}>{t(item.title)}</Link>;
    })}
  </nav>;
}

function MobileDisclosure({ children }: { children: ReactNode }) {
  const { t } = useTranslation('routing');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="lg:hidden" onKeyDown={(event) => { if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="mobile-navigation" className="rounded-ui border border-accent/50 px-4 py-3" onClick={() => setOpen(!open)}>{t(open ? 'closeMenu' : 'menu')}</button>
    {open && <div id="mobile-navigation" className="mt-4 grid gap-3 rounded-ui border border-accent/40 bg-primary-deep p-4 text-white">{children}</div>}
  </div>;
}
export function MobileNavigation({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <MobileDisclosure key={location.key}>{children}</MobileDisclosure>;
}

export function SessionControls({ vertical = false, compact = false }: { vertical?: boolean; compact?: boolean }) {
  const auth = useAuth();
  const { t } = useTranslation('routing');
  const notify = useToast();
  if (!auth.actor) {
    return auth.status === 'anonymous' && !auth.logoutRequired ? <Link to={routePaths.login} className={`inline-flex items-center justify-center rounded-ui border border-accent/50 no-underline ${compact ? 'min-h-10 px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'}`}>{t('login')}</Link> : null;
  }
  return <div className={vertical ? 'flex flex-col items-stretch gap-3' : 'flex flex-wrap items-center gap-3'}>
    <Link className={`text-sm underline ${vertical ? 'rounded-ui px-4 py-3' : ''}`} to={auth.actor === 'staff' ? routePaths.admin.home : routePaths.account}>{t(auth.actor === 'staff' ? 'dashboard' : 'account')}</Link>
    <Button variant="secondary" pending={auth.pending} pendingLabel={t('working', { ns: 'auth' })} onClick={() => void auth.logout().catch(() => notify({ tone: 'error', message: { namespace: 'auth', key: 'logoutUnconfirmed' } }))}>{t('logout', { ns: 'auth' })}</Button>
  </div>;
}

export function SessionNotice() {
  const auth = useAuth();
  const { t } = useTranslation('auth');
  return auth.reason ? <div className="mb-6"><Alert tone={auth.status === 'unavailable' ? 'error' : 'info'}>{t(auth.reason)}</Alert></div> : null;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useTranslation('routing');
  const pieces = pathname.split('/').filter(Boolean);
  const items = pieces.flatMap((_, index) => {
    const path = '/' + pieces.slice(0, index + 1).join('/');
    const route = routeDefinitions.find((item) => matchPath({ path: item.path, end: true }, path));
    return route ? [{ path, title: route.title }] : [];
  });
  if (pathname === '/') return null;
  return <nav aria-label={t('breadcrumbs')} className="mb-8 text-sm text-inherit"><ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
    <li><Link to={routePaths.home} className="underline">{t('home')}</Link></li>
    {items.map((item) => <li key={item.path} className="flex items-center gap-3"><span aria-hidden="true">/</span>{item.path === pathname.replace(/\/$/, '') ? <span aria-current="page">{t(item.title)}</span> : <Link className="underline" to={item.path}>{t(item.title)}</Link>}</li>)}
  </ol></nav>;
}
