import { useTranslation } from 'react-i18next';
import { RouteHeading } from '../Router/RouteFeedback';

export default function RoutePlaceholder({ title }: { title: string }) {
  const { t } = useTranslation('routing');
  return <section className="grid gap-6 rounded-ui border border-accent/40 bg-ivory p-7 text-primary shadow-panel sm:p-12">
    <RouteHeading>{t(title)}</RouteHeading><div className="h-px w-16 bg-accent" />
    <h2 className="text-xl font-medium">{t('placeholder')}</h2><p className="max-w-prose leading-8 text-muted">{t('placeholderDescription')}</p>
  </section>;
}
