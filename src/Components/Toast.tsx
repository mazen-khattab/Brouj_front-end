import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Notice } from '../Context/ToastContext';
import { Button } from './Button';
import { ui } from './ui';

export function Toast({ notice, dismiss }: { notice: Notice & { id: number }; dismiss: (id: number) => void }) {
  const { t } = useTranslation();
  const { id, message, tone = 'info' } = notice;
  // Toasts float above layered page colors; info notices retain an opaque surface.
  const appearance = tone === 'info' ? 'border-accent bg-white text-primary' : ui[tone];
  useEffect(() => {
    // Each toast owns its five-second interval. Locale changes do not restart its lifetime.
    const interval = window.setInterval(() => dismiss(id), 5_000);
    return () => window.clearInterval(interval);
  }, [id, dismiss]);

  return <div role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true"
    className={`${ui.alert} ${ui.toast} ${appearance}`}>
    <p>{t(message.key, { ns: message.namespace ?? 'common', ...message.values })}</p>
    <Button variant="secondary" className={ui.toastClose} aria-label={t('dismissNotification')} onClick={() => dismiss(id)}>×</Button>
    <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-toast-life bg-current opacity-40" />
  </div>;
}
