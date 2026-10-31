import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { getUnitsByProject } from '../../Services/Units';
import type { UnitListDto } from '../../Types/contracts';
import { ApiError } from '../../Types/failures';
import { useLocale } from '../../Hooks/useLocale';
import { useToast } from '../../Hooks/useToast';
import { formatNumber } from '../../i18n/format';
import { CatalogueFeedback } from './CatalogueFeedback';
import { MediaPlaceholder } from './MediaGallery';
import { UnitFacts } from './PropertyFacts';
import { BidiText } from '../BidiText';
import { Button } from '../Button';
import { EmptyState, ErrorPanel, Loading } from '../Feedback';

const subscribe = (update: () => void) => {
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
};
const visibleCards = () => window.matchMedia('(min-width: 1280px)').matches ? 3 : window.matchMedia('(min-width: 768px)').matches ? 2 : 1;

function Carousel({ projectId }: { projectId: string }) {
  const { t } = useTranslation('catalogue');
  const { locale, direction } = useLocale();
  const notify = useToast();
  const count = useSyncExternalStore(subscribe, visibleCards, () => 1);
  const [page, requestPage] = useState(1);
  const [revision, retry] = useState(0);
  const [batch, setBatch] = useState({ items: [] as UnitListDto[], completedPage: 0, totalPages: 0, totalCount: 0 });
  const [failure, setFailure] = useState<ApiError>();
  const [position, setPosition] = useState(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const start = Math.min(position, Math.max(0, batch.items.length - count));
  const loading = batch.completedPage < page && !failure;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void getUnitsByProject({ projectId, query: { pageNumber: page, pageSize: 12 } }, { signal: controller.signal }).then((data) => {
      if (!active || controller.signal.aborted) return;
      setBatch((previous) => ({
        items: [...previous.items, ...data.items.filter((item) => !previous.items.some((old) => old.id === item.id))],
        completedPage: page, totalPages: data.totalPages, totalCount: data.totalCount,
      }));
    }, (error: unknown) => {
      if (active && !controller.signal.aborted) setFailure(error instanceof ApiError ? error : new ApiError('unknown'));
    });
    return () => { active = false; controller.abort(); };
  }, [projectId, page, revision]);

  function move(delta: number) {
    const next = Math.max(0, Math.min(start + delta, Math.max(0, batch.items.length - count)));
    setPosition(next);
    // Retain all earlier batches; prefetch when two carousel views remain loaded.
    if (delta > 0 && next + count * 2 >= batch.items.length && batch.completedPage === page && page < batch.totalPages && !failure) requestPage(page + 1);
  }
  function reload() { setFailure(undefined); retry((value) => value + 1); }

  return <section id="project-units" aria-labelledby="units-title" className="grid scroll-mt-32 gap-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h2 id="units-title" className="text-3xl font-medium">{t('units')}</h2>
      {!!batch.items.length && <p className="rounded-ui border border-accent/35 bg-primary-deep px-4 py-2 text-sm text-accent-light">{t('results', { value: formatNumber(batch.totalCount, locale) })}</p>}
    </header>
    {!batch.items.length ? <CatalogueFeedback result={failure ? { status: 'error', failure } : loading ? { status: 'loading' } : { status: 'success', data: true }} reload={reload}>
      {() => <div className="rounded-ui bg-ivory p-6 text-primary"><EmptyState title={t('noUnits')} description={t('noUnitsDescription')} /></div>}
    </CatalogueFeedback> : <>
      <div role="region" aria-roledescription={t('carousel')} aria-label={t('units')} tabIndex={0}
        className="grid touch-pan-y gap-5 outline-offset-4 md:grid-cols-2 xl:grid-cols-3"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Home') setPosition(0);
          else if (event.key === 'End') move(batch.items.length);
          else move((event.key === (direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1) * count);
        }}
        onPointerDown={(event) => {
          swiped.current = false;
          gesture.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
        }}
        onPointerCancel={() => { gesture.current = null; }}
        onPointerUp={(event) => {
          const initial = gesture.current; gesture.current = null;
          if (!initial) return;
          const dx = event.clientX - initial.x, dy = event.clientY - initial.y;
          if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
          swiped.current = true;
          move((dx < 0 ? 1 : -1) * (direction === 'rtl' ? -1 : 1) * count);
        }}
        onClickCapture={(event) => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
        {batch.items.slice(start, start + count).map((unit) => <article key={unit.id} className="relative grid min-w-0 content-start gap-6 rounded-ui border border-accent/50 bg-ivory p-5 text-primary shadow-panel sm:p-6">
          <div className="h-44"><MediaPlaceholder /></div>
          <h3 className="text-xl font-medium"><button type="button" className="cursor-pointer text-start text-primary underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary-light hover:decoration-accent hover:underline-offset-6 after:absolute after:inset-0 after:rounded-ui" onClick={() => notify({ message: { namespace: 'catalogue', key: 'unitComingSoon' } })}>
            {t('unitLabel', { number: '' })}<BidiText>{unit.number}</BidiText>
          </button></h3>
          <UnitFacts unit={unit} />
        </article>)}
      </div>
      <div className="grid grid-cols-2 items-center gap-4 rounded-ui border border-accent/35 bg-primary-deep p-5 sm:flex sm:flex-wrap sm:justify-between">
        <Button variant="secondary" disabled={start === 0} onClick={() => move(-count)}>{t('previousUnits')}</Button>
        <p role="status" className="col-span-2 row-start-1 text-center text-sm text-accent-light">{t('unitPosition', { first: formatNumber(start + 1, locale), last: formatNumber(Math.min(start + count, batch.items.length), locale), total: formatNumber(batch.totalCount, locale) })}</p>
        <Button variant="secondary" disabled={start + count >= batch.items.length} onClick={() => move(count)}>{t('nextUnits')}</Button>
      </div>
      {loading && <Loading label={t('loadingUnits')} />}
      {failure && <div className="rounded-ui bg-ivory p-6 text-primary"><ErrorPanel title={t('unitsLoadFailed')} description={t('unitsLoadFailedDescription')} onRetry={reload} /></div>}
    </>}
  </section>;
}

/** A project identity owns its batches, position and requests, independently of URL filters. */
export function UnitCarousel({ projectId }: { projectId: string }) {
  return <Carousel key={projectId} projectId={projectId} />;
}
