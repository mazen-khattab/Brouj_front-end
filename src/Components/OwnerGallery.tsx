import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Both public pages share the approved placeholders until the owners supply their portraits.
const owners: readonly { id: string; photo?: string }[] = [
  { id: 'one' }, { id: 'two' }, { id: 'three' },
];

export function OwnerGallery() {
  const { t } = useTranslation('home');
  const [selected, select] = useState(0);
  const [hovered, hover] = useState<number | null>(null);
  const active = hovered ?? selected;

  function choose(index: number) {
    hover(null);
    select(index);
  }

  return <div className="owner-gallery" onMouseLeave={() => hover(null)}>
    {owners.map((owner, index) => <button
      key={owner.id}
      type="button"
      className="owner-card"
      data-expanded={active === index}
      aria-expanded={active === index}
      aria-controls={`owner-description-${owner.id}`}
      onPointerMove={(event) => {
        // Ignore stationary-pointer events caused by focus scrolling or a touch selection.
        if (event.pointerType === 'mouse' && (event.movementX !== 0 || event.movementY !== 0)) {
          hover(index);
        }
      }}
      onFocus={() => choose(index)}
      onClick={() => choose(index)}
    >
      {owner.photo ? <img src={owner.photo} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" /> : <div aria-hidden="true" className={`owner-placeholder owner-placeholder-${owner.id}`}>
        <svg viewBox="0 0 240 400" className="h-full w-full" fill="none">
          <circle cx="120" cy="138" r="42" fill="currentColor" />
          <path d="M15 400v-78c0-62 47-106 105-106s105 44 105 106v78" fill="currentColor" />
        </svg>
      </div>}
      <div className="absolute inset-0 bg-linear-to-t from-primary-deep via-primary-deep/20 to-transparent" />
      <span className="absolute start-5 top-5 grid size-9 place-items-center rounded-full border border-accent/60 text-xs text-accent-light" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <div className="owner-caption">
        <span className="block text-xs text-accent-light">{t('about.ownerRole')}</span>
        <h3 className="mt-2 text-xl font-medium">{t(`about.owners.${owner.id}`)}</h3>
        <p id={`owner-description-${owner.id}`} hidden={active !== index} className="mt-3 text-sm leading-7 text-white/85">{t('about.placeholderDescription')}</p>
      </div>
    </button>)}
  </div>;
}
