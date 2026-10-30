import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalogueList } from '../../Hooks/useCatalogue';
import { useLocationLookup } from '../../Hooks/useLocationLookup';
import type { LocationLookup } from '../../Types/lookups';
import { Input, Select } from '../Fields';
import { Button } from '../Button';
import { ErrorPanel, Loading, Skeleton } from '../Feedback';

function SearchField({
  value, onCommit, label, id, autoFocus = false,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  id: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [observed, setObserved] = useState(value);
  if (observed !== value) {
    setObserved(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft.trim() === value) {
      return;
    }
    const timer = window.setTimeout(() => onCommit(draft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft, value, onCommit]);

  return <Input id={id} type="search" label={label} maxLength={100} value={draft} autoFocus={autoFocus} onChange={(event) => setDraft(event.target.value)} />;
}

function LocationPicker({
  field, selectedId, onSelect,
}: {
  field: 'city' | 'area';
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation('catalogue');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<LocationLookup>();
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const { choices, selection } = useLocationLookup(field, search, selectedId, open);
  const commit = useCallback((value: string) => setSearch(value), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) {
        details.current.open = false;
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function close(restoreFocus = false) {
    if (details.current) {
      details.current.open = false;
    }
    if (restoreFocus) {
      trigger.current?.focus();
    }
  }

  function choose(item: LocationLookup | null) {
    setChosen(item ?? undefined);
    close(true);
    onSelect(item?.id ?? null);
  }

  const selectedName = selectedId
    ? selection.result.status === 'success'
      ? selection.result.data.name
      : chosen?.id === selectedId
        ? chosen.name
        : t('change')
    : t(field === 'city' ? 'selectCity' : 'selectArea');

  return <div className="grid min-w-0 gap-2.5">
    <p className="text-sm font-semibold">{t(field)}</p>
    <details
      ref={details}
      id={`filter-${field}`}
      className="relative min-w-0"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          close();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <summary ref={trigger} aria-label={t(field === 'city' ? 'selectCity' : 'selectArea')} className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-ui border border-control-border bg-white px-4 py-3 text-sm text-primary shadow-xs [&::-webkit-details-marker]:hidden">
        <span dir="auto">{selectedName}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><path d="m5 7 5 5 5-5" /></svg>
      </summary>
      {open && <div role="region" aria-label={t(field === 'city' ? 'cityOptions' : 'areaOptions')} className="absolute inset-x-0 top-full z-20 mt-2 grid gap-3 rounded-ui border border-accent bg-ivory p-4 text-primary shadow-panel">
        <SearchField id={`filter-${field}-search`} label={t('search') + ' · ' + t(field)} value={search} onCommit={commit} autoFocus />
        {selection.result.status === 'error' && <p className="text-xs text-muted">{t('selectionUnavailable')}</p>}
        <button type="button" aria-pressed={!selectedId} className="rounded-ui border border-accent/50 bg-accent-light px-4 py-2.5 text-start text-sm font-medium" onClick={() => choose(null)}>{t(field === 'city' ? 'allCities' : 'allAreas')}</button>
        {choices.result.status === 'loading' && <div aria-busy="true" className="grid gap-3"><Loading label={t('loadingLocations')} /><Skeleton height="3rem" /><Skeleton height="3rem" /></div>}
        {choices.result.status === 'error' && <ErrorPanel title={t('lookupError')} description={t('lookupErrorDescription')} onRetry={choices.reload} />}
        {choices.result.status === 'success' && (choices.result.data.length ? <ul className="grid max-h-56 gap-1 overflow-y-auto overscroll-contain p-1">
          {choices.result.data.map((item) => <li key={item.id}>
            <button type="button" aria-label={t('choose', { name: item.name })} aria-pressed={item.id === selectedId} className="w-full rounded-ui px-3 py-3 text-start text-sm hover:bg-accent-light aria-pressed:bg-accent aria-pressed:font-medium" onClick={() => choose(item)}><span dir="auto">{item.name}</span></button>
          </li>)}
        </ul> : <p role="status" className="py-3 text-sm text-muted">{t('empty')}</p>)}
      </div>}
    </details>
  </div>;
}

export function CatalogueFilters({
  projects = false, locations = false, units = false, sidebar = false,
}: {
  projects?: boolean;
  locations?: boolean;
  units?: boolean;
  sidebar?: boolean;
}) {
  const { t } = useTranslation('catalogue');
  const { params, update } = useCatalogueList();
  const [searchRevision, resetSearch] = useReducer((revision: number) => revision + 1, 0);
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const search = useCallback((value: string) => update({ search: value || null }, true), [update]);

  function clear() {
    // Reset pending drafts and dropdown searches as well as the committed URL filters.
    resetSearch();
    update({ search: null, cityId: null, areaId: null, projectType: null });
  }

  return <section ref={container} aria-label={t('filters')} className="grid min-w-0 gap-6 rounded-ui border border-accent/60 bg-accent-light p-5 text-primary sm:p-6" onKeyDown={(event) => {
    if (sidebar && expanded && event.key === 'Escape') {
      setExpanded(false);
      toggle.current?.focus();
    }
  }}>
    {sidebar && <div className="flex items-center justify-between gap-3 border-b border-primary/15 pb-4">
      <h2 className="text-lg font-medium">{t('filtersTitle')}</h2>
      <button ref={toggle} type="button" className="inline-flex min-h-11 items-center gap-2 rounded-ui border border-primary/25 px-3 py-2 text-sm lg:hidden" aria-expanded={expanded} aria-controls="project-filter-fields" onClick={() => {
        if (expanded) {
          container.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((element) => { element.open = false; });
        }
        setExpanded(!expanded);
      }}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        {t(expanded ? 'hideFilters' : 'showFilters')}
      </button>
    </div>}
    <SearchField key={searchRevision} id="catalogue-search" label={t(units ? 'searchUnits' : 'search')} value={params.search ?? ''} onCommit={search} />
    {projects && <div id={sidebar ? 'project-filter-fields' : undefined} className={`gap-6 ${sidebar && !expanded ? 'hidden lg:grid' : 'grid'}`}>
      <Select id="catalogue-type" label={t('projectType')} value={params.projectType ?? ''} onChange={(event) => update({
        projectType: event.target.value === '' ? null : Number(event.target.value) as 0 | 1,
      })}>
        <option value="">{t('all')}</option>
        <option value="0">{t('regular')}</option>
        <option value="1">{t('initiative')}</option>
      </Select>
      {locations && <>
        <LocationPicker key={`city:${searchRevision}`} field="city" selectedId={params.cityId} onSelect={(id) => update({ cityId: id })} />
        <LocationPicker key={`area:${params.cityId ?? ''}:${searchRevision}`} field="area" selectedId={params.areaId} onSelect={(id) => update({ areaId: id })} />
      </>}
    </div>}
    <div className={`grid gap-4 ${sidebar ? 'border-t border-primary/15 pt-5' : 'sm:flex sm:items-center sm:justify-between'}`}>
      <p className="text-xs leading-6 text-muted">{t('searchHint')}</p>
      <Button variant="primary" onClick={clear}>{t('clear')}</Button>
    </div>
  </section>;
}
