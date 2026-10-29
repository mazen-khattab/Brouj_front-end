import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AccountDataProvider } from '../../Context/AccountDataProvider';
import { useAccountData } from '../../Hooks/useAccount';
import { useLocale } from '../../Hooks/useLocale';
import { AccountFeedback, accountPanel } from '../../Components/Account/AccountFeedback';
import { RouteHeading } from '../../Router/RouteFeedback';
import { MediaGallery } from '../../Components/Catalogue/MediaGallery';
import { Facts } from '../../Components/Catalogue/PropertyFacts';
import { formatDateTime } from '../../i18n/format';
import { routePaths } from '../../Router/routePaths';

function Plan() {
  const { result, reload } = useAccountData(); const { t } = useTranslation('account'); const { locale } = useLocale();
  return <AccountFeedback result={result} reload={reload}>{(data) => data.kind !== 'plan' ? null : <>
    <section className={accountPanel}><h2 dir="auto" className="text-3xl font-medium">{data.value.name}</h2><Facts items={[{ label: t('delivery'), value: formatDateTime(data.value.deliveryDate, locale) }]} /><Link className="underline" to={routePaths.project(data.value.projectId)}>{t('backProject', { ns: 'catalogue' })}</Link></section>
    {!data.value.stages.length && <p>{t('noStages')}</p>}
    {data.value.stages.map((stage) => <section key={stage.id} className={accountPanel}><h2 dir="auto" className="text-2xl font-medium">{stage.name}</h2><Facts items={[{ label: t('delivery'), value: formatDateTime(stage.deliveryDate, locale) }]} />
      {!stage.items.length && <p>{t('noItems')}</p>}
      <div className="grid gap-6">{stage.items.map((item) => <article key={item.id} className="grid gap-5 rounded-ui border border-accent/50 bg-surface p-5 sm:p-7"><h3 dir="auto" className="text-xl font-medium">{item.name}</h3>
        <Facts items={[
          { label: t('status'), value: t(`itemStatus.${item.status}`, { defaultValue: t('unknownStatus') }) },
          { label: t('due'), value: formatDateTime(item.dueDate, locale) },
          { label: t('confirmed'), value: item.confirmedDate ? formatDateTime(item.confirmedDate, locale) : t('notConfirmed') },
        ]} />
        {!!item.images.length && <section aria-label={t('progressImages')} className="grid gap-4"><h4 className="font-medium">{t('progressImages')}</h4><MediaGallery key={item.id} images={item.images.map((image) => ({ id: image.id, imagePath: image.imagePath, altText: image.description }))} />
          {item.images.map((image) => image.description && <p key={image.id} dir="auto" className="whitespace-pre-wrap text-sm text-muted">{image.description}</p>)}
        </section>}
      </article>)}</div>
    </section>)}
  </>}</AccountFeedback>;
}
export default function TimePlanPage() {
  const { projectId } = useParams(); const { t } = useTranslation('routing'); const account = useTranslation('account');
  return <div className="grid gap-7"><header className="grid gap-3"><RouteHeading>{t('timePlan')}</RouteHeading><p className="text-white/80">{account.t('planIntro')}</p></header><AccountDataProvider kind="plan" id={projectId}><Plan /></AccountDataProvider></div>;
}
