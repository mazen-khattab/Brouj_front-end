import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArchitecturalVisual } from '../Components/ArchitecturalVisual';
import { OwnerGallery } from '../Components/OwnerGallery';
import { RouteHeading } from '../Router/RouteFeedback';
import { routePaths } from '../Router/routePaths';

const principles = ['people', 'care', 'clarity'] as const;

export default function AboutPage() {
  const { t } = useTranslation('home');

  return <div className="grid gap-14 pb-5 motion-safe:animate-fade-in lg:gap-20">
    <header className="max-w-3xl">
      <p className="home-eyebrow">{t('aboutPage.eyebrow')}</p>
      <RouteHeading>{t('aboutUs', { ns: 'routing' })}</RouteHeading>
      <p className="mt-5 text-2xl leading-relaxed text-accent-light sm:text-3xl">{t('aboutPage.headline')}</p>
    </header>

    <section aria-labelledby="about-story-title" className="grid items-stretch gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <div className="flex flex-col justify-center rounded-ui border border-accent/50 bg-accent-light p-7 text-primary sm:p-10 lg:p-12">
        <p className="mb-5 text-sm font-medium tracking-widest rtl:tracking-normal">{t('about.brand')}</p>
        <h2 id="about-story-title" className="home-title">{t('aboutPage.storyTitle')}</h2>
        <div aria-hidden="true" className="my-7 h-px w-16 bg-primary/40" />
        <p className="text-lg leading-9">{t('about.description')}</p>
        <p className="mt-6 leading-9">{t('aboutPage.story')}</p>
      </div>
      <ArchitecturalVisual className="h-[380px] sm:h-[440px] lg:h-full lg:min-h-[480px]" />
    </section>

    <section aria-labelledby="about-principles-title" className="rounded-ui border border-accent/35 bg-primary-deep p-7 sm:p-10">
      <h2 id="about-principles-title" className="home-title">{t('aboutPage.principlesTitle')}</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
        {principles.map((principle, index) => <article key={principle} className="border-t border-accent/35 pt-6">
          <span aria-hidden="true" className="text-sm text-accent">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="mt-4 text-xl font-medium text-accent-light">{t(`aboutPage.principles.${principle}.title`)}</h3>
          <p className="mt-4 leading-8 text-white/80">{t(`aboutPage.principles.${principle}.description`)}</p>
        </article>)}
      </div>
    </section>

    <section aria-labelledby="about-owners-title" className="rounded-ui bg-primary-deep/95 p-7 sm:p-10">
      <div className="mb-8 max-w-2xl">
        <p className="home-eyebrow">{t('aboutPage.teamEyebrow')}</p>
        <h2 id="about-owners-title" className="home-title">{t('about.people')}</h2>
        <p className="mt-4 leading-8 text-white/80">{t('aboutPage.teamDescription')}</p>
      </div>
      <OwnerGallery />
    </section>

    <section className="flex flex-wrap items-center justify-between gap-7 rounded-ui border border-accent/40 bg-accent-light p-7 text-primary sm:p-10" aria-labelledby="about-next-title">
      <h2 id="about-next-title" className="max-w-xl text-2xl font-medium leading-relaxed">{t('aboutPage.nextTitle')}</h2>
      <Link to={`${routePaths.projects}?projectType=1`} className="rounded-ui bg-primary px-6 py-4 text-sm font-medium text-white no-underline hover:bg-primary-deep">{t('browse', { ns: 'routing' })}</Link>
    </section>
  </div>;
}
