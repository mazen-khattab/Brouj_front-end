import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArchitecturalVisual } from '../Components/ArchitecturalVisual';
import { RouteHeading } from '../Router/RouteFeedback';
import { routePaths } from '../Router/routePaths';

export default function WelcomePage() {
  const { t } = useTranslation();
  return <section className="grid items-center gap-10 py-5 motion-safe:animate-fade-in lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-8">
    <div className="py-3 lg:py-10">
      <p className="mb-7 flex items-center gap-4 text-xs font-medium tracking-widest text-accent-light rtl:tracking-normal"><span aria-hidden="true" className="h-px w-10 bg-accent" />{t('design.eyebrow')}</p>
      <div className="[&_h1]:text-[5.5rem] [&_h1]:sm:text-[7rem]"><RouteHeading>{t('brand')}</RouteHeading></div>
      <p className="mt-5 text-2xl leading-relaxed">{t('welcome')}</p>
      <p className="mt-5 max-w-[35ch] text-base leading-8 text-white/75">{t('design.homeDescription')}</p>
      <Link className="mt-9 inline-flex items-center gap-5 rounded-ui bg-accent px-6 py-4 font-medium text-primary no-underline hover:bg-accent-light" to={routePaths.projects}>{t('browse', { ns: 'routing' })}<span aria-hidden="true" className="rtl:-scale-x-100">↗</span></Link>
      {import.meta.env.DEV && <Link className="mt-7 block text-sm text-accent-light underline" to="/__showcase">{t('showcase.open')}</Link>}
    </div>
    <ArchitecturalVisual className="h-[390px] sm:h-[520px] lg:h-[580px]" />
  </section>;
}
