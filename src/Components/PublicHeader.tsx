import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandWordmark } from './BrandWordmark';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavigationLinks, SessionControls } from './Navigation';
import { useAuth } from '../Hooks/useAuth';
import { routePaths } from '../Router/routePaths';

const items = [
  { path: routePaths.home, title: 'home' },
  { path: routePaths.about, title: 'aboutUs' },
  { path: `${routePaths.projects}?projectType=1`, title: 'initiativeProjects' },
  { path: routePaths.terms, title: 'termsNav' },
];

function AccountActions() {
  const { t } = useTranslation('routing');
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  // Tab follows the disclosure's native links/buttons; Escape returns to the account icon.
  return <div ref={container} className="relative" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label={t('accountActions')} aria-expanded={open} aria-controls={panelId} className="grid size-10 place-items-center rounded-full border border-accent/60 text-accent-light transition-colors hover:bg-accent/15" onClick={() => setOpen(!open)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
    </button>
    {open && <div id={panelId} className="absolute end-0 top-full z-30 mt-3 min-w-52 rounded-ui border border-accent/40 bg-primary-deep p-3 text-white shadow-panel"><SessionControls vertical /></div>}
  </div>;
}

export function PublicHeader() {
  const { t } = useTranslation('routing');
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const mobileId = useId();
  const trigger = useRef<HTMLButtonElement>(null);

  return <header className="sticky top-0 z-30 shrink-0 border-b border-accent/30 bg-primary-deep/95 shadow-lg backdrop-blur-xl [&_:focus-visible]:outline-accent-light" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <div className="mx-auto max-w-[1440px] px-5 py-4 sm:px-10">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        <Link to={routePaths.home} className="justify-self-start no-underline"><BrandWordmark /></Link>
        <div className="hidden lg:block"><NavigationLinks items={items} label={t('mainNav')} /></div>
        <div className="flex items-center justify-end gap-2 justify-self-end">
          <div className="hidden lg:block">{auth.actor ? <AccountActions key={`${auth.actor}:${auth.generation}`} /> : <SessionControls compact />}</div>
          <LanguageSwitcher compact />
          <button ref={trigger} type="button" className="grid size-10 place-items-center rounded-ui border border-accent/50 text-accent-light lg:hidden" aria-label={t(open ? 'closeMenu' : 'menu')} aria-expanded={open} aria-controls={mobileId} onClick={() => setOpen(!open)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-5">{open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
          </button>
        </div>
      </div>
      {open && <div id={mobileId} className="mt-4 grid max-h-[calc(100svh-8rem)] gap-4 overflow-y-auto overscroll-contain rounded-ui border border-accent/40 bg-primary-deep p-4 text-white lg:hidden">
        <NavigationLinks items={items} label={t('mainNav')} vertical />
        <div className="grid border-t border-accent/25 pt-4"><SessionControls vertical /></div>
      </div>}
    </div>
  </header>;
}
