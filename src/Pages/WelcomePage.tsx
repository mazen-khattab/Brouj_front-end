import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../Components/LanguageSwitcher';
import { BrandWordmark } from '../Components/BrandWordmark';
import { ArchitecturalVisual } from '../Components/ArchitecturalVisual';
import { LuxuryBackdrop } from '../Components/LuxuryBackdrop';
import { surfaces } from '../Components/surfaces';

export default function WelcomePage() {
  const { t } = useTranslation();
  return (
    <main className={`min-h-svh text-white ${surfaces.navy}`}>
      <div className="relative isolate">
      <LuxuryBackdrop />
      <div className="mx-auto max-w-[1320px] px-5 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-6 border-b border-accent/25 py-6">
          <BrandWordmark /><LanguageSwitcher />
        </header>
        <section className="grid items-center gap-10 py-12 motion-safe:animate-fade-in lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:py-16">
          <div className="py-3 lg:py-10">
            <p className="mb-7 flex items-center gap-4 text-xs font-medium tracking-[0.15em] text-accent-light rtl:tracking-normal">
              <span aria-hidden="true" className="h-px w-10 bg-accent" />{t('design.eyebrow')}
            </p>
            <h1 className="text-[5.5rem] font-medium leading-[1.3] tracking-[-0.05em] sm:text-[7rem] rtl:tracking-normal">{t('brand')}</h1>
            <p className="mt-5 text-2xl leading-relaxed text-white">{t('welcome')}</p>
            <p className="mt-5 max-w-[35ch] text-base leading-8 text-white/75">{t('design.homeDescription')}</p>
            {import.meta.env.DEV && <Link className="mt-10 inline-flex items-center gap-5 border-b border-accent/60 pb-3 text-sm font-medium text-accent-light focus-visible:outline-accent" to="/__showcase">
              {t('showcase.open')}<span aria-hidden="true" className="text-xl rtl:-scale-x-100">↗</span>
            </Link>}
          </div>
          <ArchitecturalVisual className="h-[390px] sm:h-[520px] lg:h-[580px]" />
        </section>
      </div>
      </div>
      <footer className={`border-t border-accent-light/60 px-5 py-8 text-primary sm:px-10 lg:py-10 ${surfaces.gold}`}>
        <div className="mx-auto flex max-w-[1208px] flex-wrap items-center justify-between gap-6">
          <p className="text-lg font-medium sm:text-xl">{t('design.footerLine')}</p>
          <span className="text-xs tracking-widest rtl:tracking-normal">{t('design.materials')}</span>
        </div>
      </footer>
    </main>
  );
}
