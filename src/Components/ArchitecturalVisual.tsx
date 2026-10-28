import { useTranslation } from 'react-i18next';
import architecturalStudy from '../assets/brouj-architectural-study.png';

/** Decorative concept artwork, separate from backend property imagery and its media contract. */
export function ArchitecturalVisual({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return <figure className={`relative isolate min-w-0 overflow-hidden rounded-ui border border-accent-light/70 bg-accent shadow-[0_28px_70px_#071c2c45] ring-1 ring-white/10 ring-offset-8 ring-offset-transparent ${className}`}>
    <img src={architecturalStudy} alt="" aria-hidden="true" decoding="async" fetchPriority="high"
      className="absolute inset-0 size-full object-cover object-center" />
    <figcaption className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 rounded-ui border border-white/40 bg-white/95 px-5 py-4 text-primary sm:inset-x-6 sm:bottom-6">
      <span className="text-xs font-medium tracking-wide rtl:tracking-normal">{t('design.architecturalStudy')}</span>
      <span aria-hidden="true" className="h-px w-12 shrink-0 bg-primary/50" />
    </figcaption>
  </figure>;
}
