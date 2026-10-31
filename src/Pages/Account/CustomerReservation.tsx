import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCustomerAction } from '../../Hooks/useAccount';
import { useCatalogueDetail } from '../../Hooks/useCatalogue';
import { Dialog } from '../../Components/Dialog';
import { Button } from '../../Components/Button';
import { BidiText } from '../../Components/BidiText';
import { ActionFeedback } from '../../Components/Account/AccountFeedback';
import type { UnitDto } from '../../Types/contracts';
import { routePaths } from '../../Router/routePaths';
export default function CustomerReservation({ unit }: { unit: UnitDto }) {
  const { t } = useTranslation('account'); const action = useCustomerAction(); const catalogue = useCatalogueDetail(); const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  async function confirm() {
    const result = await action.create(unit.id);
    if (!action.isCurrent()) return;
    if (result.ok) { await navigate(routePaths.reservation(result.id)); }
    else if (result.failure.status === 409) { setOpen(false); catalogue.reload(); }
  }
  return <div className="grid gap-5">
    <ActionFeedback />
    {!unit.isAvailable && <p>{t('unavailable', { ns: 'catalogue' })}</p>}
    <Button disabled={!unit.isAvailable || !!action.uncertain} pending={action.pending} pendingLabel={t('working')} onClick={() => setOpen(true)}>{t('requestReservation')}</Button>
    <Dialog open={open} pending={action.pending} title={t('createTitle')} description={t('createDescription')} onClose={() => setOpen(false)}>
      <div className="grid gap-5"><p>{t('unit')}: <BidiText>{unit.number}</BidiText></p><ActionFeedback /><Link className="inline-flex items-center text-sm font-medium text-primary/80 underline decoration-accent/50 underline-offset-4 transition-all hover:text-primary hover:decoration-accent" to={routePaths.terms} aria-disabled={action.pending} tabIndex={action.pending ? -1 : 0} onClick={(event) => { if (action.pending) event.preventDefault(); }}>{t('terms')}</Link>
        <Button disabled={!unit.isAvailable || !!action.uncertain} pending={action.pending} pendingLabel={t('working')} onClick={() => void confirm()}>{t('confirmReservation')}</Button>
      </div>
    </Dialog>
  </div>;
}
