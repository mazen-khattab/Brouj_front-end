import { surfaces } from './surfaces';

/** Static decorative layers follow the page direction without mirroring the artwork. */
export function LuxuryBackdrop() {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${surfaces.navy}`}>
    <div className={`absolute inset-x-0 top-[57%] bottom-0 border-t border-accent/30 lg:inset-x-auto lg:top-28 lg:end-0 lg:w-[29%] lg:border-t-0 lg:border-s ${surfaces.gold}`} />
    <div className="absolute -top-32 start-0 size-[36rem] rounded-full bg-accent/10 blur-[100px]" />
    <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-primary-deep/20 to-transparent" />
  </div>;
}
