import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getProjectTimePlan } from '../../Services/TimePlans';
import { useCatalogueRead } from '../../Hooks/useCatalogueRead';
import { useLocale } from '../../Hooks/useLocale';
import { formatDateTime } from '../../i18n/format';
import { isGuid } from '../../Catalogue/query';
import { ApiError } from '../../Types/failures';
import type { TimePlanDto } from '../../Types/contracts';
import { Loading, ErrorPanel } from '../Feedback';
import { ProgressGallery } from './ProgressGallery';

function Plan({ plan }: { plan: TimePlanDto }) {
  const { t } = useTranslation('account');
  const { locale, direction } = useLocale();
  return <div className="grid min-w-0 gap-6 p-5 sm:p-8">
    <header className="grid gap-2">
      <h3 dir="auto" className="text-2xl font-medium">{plan.name}</h3>
      {plan.deliveryDate && <p className="text-muted">{t('delivery')}: {formatDateTime(plan.deliveryDate, locale)}</p>}
    </header>
    <div className="grid min-w-0 gap-4 rounded-ui border border-accent/40 bg-surface p-3 sm:p-5">
    {!plan.stages.length && <p className="p-2 text-muted">{t('noStages')}</p>}
    {plan.stages.map((stage, index) => <details key={stage.id} open={index === 0} className="group scroll-mt-32 overflow-hidden rounded-ui border border-accent/40 bg-ivory">
      <summary className="cursor-pointer p-4 marker:text-accent sm:p-5">
        <h3 dir="auto" className="inline text-xl font-medium">{stage.name}</h3>
        {stage.deliveryDate && <span className="mt-2 block text-sm text-muted">{t('delivery')}: {formatDateTime(stage.deliveryDate, locale)}</span>}
      </summary>
      <div className="grid gap-3 border-t border-accent/40 p-3 sm:p-4">
        {!stage.items.length && <p className="text-muted">{t('noItems')}</p>}
        {stage.items.map((item) => <article key={item.id} dir="ltr" className="grid min-w-0 items-center gap-3 rounded-ui border border-accent/40 bg-white p-3 md:grid-cols-2 md:gap-0">
          {/* Physical columns remain left/right in both languages; text keeps the user's direction. */}
          <div dir={direction} className="grid min-w-0 content-center gap-2 text-start md:pr-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <h4 dir="auto" className="text-lg font-medium [overflow-wrap:anywhere]">{item.name}</h4>
              <span className={`min-w-28 rounded-xl border px-4 py-1 text-center text-sm font-medium ${item.status === 2 ? 'border-success/40 bg-success-surface text-success' : item.status === 1 ? 'border-amber-400 bg-amber-100 text-amber-800' : 'border-accent/50 bg-surface text-muted'}`}>
                {t(item.status === 0 || item.status === 1 || item.status === 2 ? `itemStatus.${item.status}` : 'unknownStatus')}
              </span>
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-6 text-muted">
              <div><dt className="inline">{t('due')}: </dt><dd className="inline">{formatDateTime(item.dueDate, locale)}</dd></div>
              <div><dt className="inline">{t('confirmed')}: </dt><dd className="inline">{item.confirmedDate ? formatDateTime(item.confirmedDate, locale) : t('notConfirmed')}</dd></div>
            </dl>
          </div>
          <div dir={direction} className="min-w-0 border-t border-accent/40 pt-3 md:self-stretch md:content-center md:border-t-0 md:border-l md:pt-0 md:pl-4"><ProgressGallery key={item.id} images={item.images} name={item.name} /></div>
        </article>)}
      </div>
    </details>)}
    </div>
  </div>;
}

/** Public read, isolated from the project and units so a missing plan cannot hide them. */
export function ProjectTimePlan({ projectId }: { projectId: string }) {
  const { t } = useTranslation('catalogue');
  const load = useCallback((signal: AbortSignal) => {
    if (!isGuid(projectId)) throw new ApiError('transport', { status: 404 });
    return getProjectTimePlan({ projectId }, { signal });
  }, [projectId]);
  const { result, reload } = useCatalogueRead(`public-plan:${projectId}`, load);
  return <section id="project-time-plan" aria-labelledby="time-plan-title" className="min-w-0 scroll-mt-32 overflow-hidden rounded-ui border border-accent/40 bg-ivory text-primary shadow-panel">
    <h2 id="time-plan-title" className="px-5 pt-5 text-3xl font-medium sm:px-8 sm:pt-8">{t('timePlan')}</h2>
    {result.status === 'loading' && <div className="p-5 sm:p-8"><Loading label={t('loadingPlan')} /></div>}
    {result.status === 'error' && <div className="p-5 sm:p-8"><ErrorPanel title={t(result.failure.status === 404 ? 'planMissing' : 'planFailed')} description={t(result.failure.status === 404 ? 'planMissingDescription' : 'planFailedDescription')} onRetry={reload} /></div>}
    {result.status === 'success' && <Plan key={`${projectId}:${result.data.id}`} plan={result.data} />}
  </section>;
}
