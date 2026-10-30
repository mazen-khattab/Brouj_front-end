import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useHome } from '../../Hooks/useHome';
import { OwnerGallery } from '../OwnerGallery';
import { routePaths } from '../../Router/routePaths';

export function AboutSection() {
  const { t } = useTranslation('home');
  const { hash, key } = useLocation();
  const { projects, terms } = useHome();
  const alignedLocation = useRef<string | null>(null);
  useEffect(() => {
    if (hash !== '#about' || projects.status === 'loading' || terms.status === 'loading' || alignedLocation.current === key) {
      return;
    }
    // Older homepage anchors remain usable after the navbar starts linking to the full About page.
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById('about');
      section?.scrollIntoView({ block: 'start' });
      section?.focus({ preventScroll: true });
      alignedLocation.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, key, projects.status, terms.status]);

  return <section id="about" tabIndex={-1} aria-labelledby="about-title" className="home-section scroll-mt-8 focus:outline-none">
    <div className="grid gap-9 lg:grid-cols-[1fr_3fr] lg:gap-10">
      <div className="lg:pt-6">
        <h2 id="about-title" className="home-title mb-5">{t('about.eyebrow')}</h2>
        <p className="text-4xl font-medium tracking-tight rtl:tracking-normal">{t('about.brand')}</p>
        <div aria-hidden="true" className="my-7 h-px w-14 bg-accent" />
        <p className="text-base leading-8 text-white/80">{t('about.description')}</p>
        <p className="mt-6 text-sm leading-7 text-accent-light">{t('about.people')}</p>
        <Link to={routePaths.about} className="home-outline-link mt-7">{t('about.readMore')}</Link>
      </div>
      <OwnerGallery />
    </div>
  </section>;
}
