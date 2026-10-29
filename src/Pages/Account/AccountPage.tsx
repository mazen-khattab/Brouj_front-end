import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AccountDataProvider } from '../../Context/AccountDataProvider';
import { CustomerActionProvider } from '../../Context/CustomerActionProvider';
import { useAccountData, useCustomerAction } from '../../Hooks/useAccount';
import { useAuth } from '../../Hooks/useAuth';
import { useLocale } from '../../Hooks/useLocale';
import { AccountFeedback, ActionFeedback, accountPanel } from '../../Components/Account/AccountFeedback';
import { Button } from '../../Components/Button';
import { Select } from '../../Components/Fields';
import { Pagination } from '../../Components/Pagination';
import { EmptyState } from '../../Components/Feedback';
import { Dialog } from '../../Components/Dialog';
import { BidiText } from '../../Components/BidiText';
import { Facts } from '../../Components/Catalogue/PropertyFacts';
import { RouteHeading } from '../../Router/RouteFeedback';
import { routePaths } from '../../Router/routePaths';
import { formatCurrency, formatDateTime, formatNumber } from '../../i18n/format';
import { canCancel } from '../../Account/policy';
import ProfileForms from './ProfileForms';
import type { AccountData } from '../../Context/AccountDataContext';
import type { OrderDto, ReservationDto } from '../../Types/contracts';

function Status({ value, order = false }: { value: number; order?: boolean }) {
  const { t } = useTranslation('account');
  return <span className="inline-flex rounded-ui bg-accent-light px-4 py-2 text-sm font-medium text-primary">{t(`${order ? 'orderStatus' : 'reservationStatus'}.${value}`, { defaultValue: t('unknownStatus') })}</span>;
}
function RecordFacts({ record, order = false }: { record: ReservationDto | OrderDto; order?: boolean }) {
  const { t } = useTranslation('account'); const { locale } = useLocale();
  const items = [
    { label: t('number'), value: <BidiText>{record.number}</BidiText> },
    { label: t('unit'), value: <BidiText>{record.unitNumber}</BidiText> },
    { label: t('project'), value: <bdi dir="auto">{record.projectName}</bdi> },
    { label: t('status'), value: <Status value={record.status} order={order} /> },
  ];
  if ('totalPrice' in record) items.push({ label: t('totalPrice'), value: <>{formatCurrency(record.totalPrice, locale)}</> }, { label: t('completedAt'), value: <>{record.completedAt ? formatDateTime(record.completedAt, locale) : t('notCompleted')}</> });
  else items.push({ label: t('reservationDate'), value: <>{formatDateTime(record.reservationDate, locale)}</> }, { label: t('cancelledAt'), value: <>{record.cancelledAt ? formatDateTime(record.cancelledAt, locale) : t('notCancelled')}</> });
  return <Facts items={items} />;
}
function Records({ data }: { data: Extract<AccountData, { kind: 'reservations' | 'orders' }> }) {
  const { t } = useTranslation('account'); const { locale } = useLocale(); const context = useAccountData(); const orders = data.kind === 'orders';
  return <div className="grid gap-6">
    <section className="flex flex-wrap items-end gap-5 rounded-ui border border-accent/40 bg-accent-light p-6 text-primary" aria-label={t('status')}>
      <Select id="account-status" label={t('status')} value={context.status ?? ''} onChange={(event) => context.update({ status: event.target.value === '' ? null : Number(event.target.value) })}>
        <option value="">{t('all')}</option>{(orders ? [0, 1, 2, 3] : [0, 1, 2]).map((status) => <option key={status} value={status}>{t(`${orders ? 'orderStatus' : 'reservationStatus'}.${status}`)}</option>)}
      </Select>
      <Select id="account-page-size" label={t('pageSize')} value={context.pageSize} onChange={(event) => context.update({ pageSize: Number(event.target.value) })}>
        {[...new Set([12, 24, 48, context.pageSize])].sort((a, b) => a - b).map((size) => <option key={size} value={size}>{formatNumber(size, locale)}</option>)}
      </Select><Button variant="secondary" onClick={context.reload}>{t('refresh')}</Button>
    </section>
    <p className="text-accent-light">{t('results', { value: formatNumber(data.value.totalCount, locale) })}</p>
    {!data.value.items.length ? <div className={accountPanel}><EmptyState title={t('empty')} description={t('emptyDescription')} /><Link className="underline" to={routePaths.projects}>{t('browse')}</Link></div> : <div className="grid gap-5 lg:grid-cols-2">
      {data.value.items.map((record) => <article key={record.id} className={accountPanel}><h2 className="text-xl font-medium"><BidiText>{record.number}</BidiText></h2><RecordFacts record={record} order={orders} /><Link className="justify-self-start underline" to={orders ? routePaths.order(record.id) : routePaths.reservation(record.id)}>{t('view')}</Link></article>)}
    </div>}
    <Pagination page={data.value.pageNumber} totalPages={data.value.totalPages} onPageChange={(page) => context.update({ page })} />
  </div>;
}
function ReservationDetails({ reservation }: { reservation: ReservationDto }) {
  const { t } = useTranslation('account'); const context = useAccountData(); const action = useCustomerAction();
  const [open, setOpen] = useState(false);
  async function cancel() {
    const result = await action.cancel(reservation.id);
    if (!action.isCurrent()) return;
    if (result.ok || result.failure.status === 409) { setOpen(false); context.reload(); }
    else if (result.failure.status === 404) { setOpen(false); context.reload(); }
  }
  return <article className={accountPanel}>
    <RecordFacts record={reservation} />
    {reservation.orderId ? <Link className="underline" to={routePaths.order(reservation.orderId)}>{t('order')}</Link> : <p className="text-muted">{t('noOrder')}</p>}
    {canCancel(reservation) && <Button disabled={!!action.uncertain} pending={action.pending} pendingLabel={t('working')} onClick={() => setOpen(true)}>{t('cancelReservation')}</Button>}
    <Button variant="secondary" disabled={action.pending} onClick={context.reload}>{t('refresh')}</Button>
    <Dialog open={open} pending={action.pending} title={t('cancelTitle')} description={t('cancelDescription')} onClose={() => setOpen(false)}><div className="grid gap-5"><ActionFeedback />
      <Button pending={action.pending} disabled={!!action.uncertain} pendingLabel={t('working')} onClick={() => void cancel()}>{t('confirmCancel')}</Button><Button variant="secondary" disabled={action.pending} onClick={() => setOpen(false)}>{t('keepReservation')}</Button>
    </div></Dialog>
  </article>;
}
function Content() {
  const { result, reload } = useAccountData(); const { t } = useTranslation('account');
  return <AccountFeedback result={result} reload={reload}>{(data) => {
    if (data.kind === 'profile') return <ProfileForms profile={data.value} />;
    if (data.kind === 'reservations' || data.kind === 'orders') return <Records data={data} />;
    if (data.kind === 'reservation') return <ReservationDetails reservation={data.value} />;
    if (data.kind === 'order') return <article className={accountPanel}><RecordFacts record={data.value} order /><Link className="underline" to={routePaths.reservation(data.value.reservationId)}>{t('reservation')}</Link></article>;
    return null;
  }}</AccountFeedback>;
}
export default function AccountPage({ kind }: { kind: Exclude<AccountData['kind'], 'plan'> }) {
  const { reservationId, orderId } = useParams(); const { t } = useTranslation('routing'); const account = useTranslation('account'); const auth = useAuth();
  const id = reservationId ?? orderId;
  const scope = auth.actor ? `${auth.profile.id}:${auth.generation}` : 'anonymous';
  return <div className="grid gap-7"><header className="grid gap-3"><RouteHeading>{t(kind)}</RouteHeading><p className="text-white/80">{account.t('intro')}</p></header>
    <CustomerActionProvider key={`${scope}:${kind}:${id ?? ''}`}><AccountDataProvider kind={kind} id={id}><ActionFeedback /><Content /></AccountDataProvider></CustomerActionProvider>
  </div>;
}
