import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StageItemImageDto } from '../../Types/contracts';
import { resolveMedia } from '../../Catalogue/media';
import type { MediaResolver } from '../../Catalogue/media';
import { useLocale } from '../../Hooks/useLocale';
import { formatNumber } from '../../i18n/format';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { MediaPlaceholder } from './MediaGallery';

type Mode = { kind: 'grid'; index?: number } | { kind: 'viewer'; index: number; fromGrid: boolean };

function Photograph({ image, resolver, compact = false }: { image: StageItemImageDto; resolver: MediaResolver; compact?: boolean }) {
  const { t } = useTranslation('catalogue');
  const url = resolver(image.imagePath);
  const [failed, setFailed] = useState(false);
  if ((!url || failed) && compact) return <div role="img" aria-label={t('imageUnavailable')} className="grid h-full w-full place-content-center rounded-ui bg-white text-muted">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="size-6"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
  </div>;
  return <div className="h-full w-full [&>div]:min-h-full [&>div]:p-2 [&>div>div]:hidden">
    {url && !failed ? <img src={url} alt={image.description?.trim() || t('imageFallback')} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full rounded-ui object-contain" /> : <MediaPlaceholder />}
  </div>;
}

/** Image identifiers pass only through the approved media boundary, including in the viewer. */
export function ProgressGallery({ images, name, resolver = resolveMedia }: { images: ReadonlyArray<StageItemImageDto>; name: string; resolver?: MediaResolver }) {
  const { t } = useTranslation('catalogue');
  const { locale } = useLocale();
  const [mode, setMode] = useState<Mode | null>(null);
  const viewerTitle = useRef<HTMLParagraphElement>(null);
  const gridButtons = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => {
    if (mode?.kind === 'viewer') viewerTitle.current?.focus();
    else if (mode?.index !== undefined) gridButtons.current.get(mode.index)?.focus();
  }, [mode]);
  const label = (index: number) => t('openProgressImage', { number: formatNumber(index + 1, locale), name });
  const photo = (index: number, compact = false) => {
    const image = images[index]!;
    return <Photograph key={`${image.id}:${resolver(image.imagePath) ?? ''}`} image={image} resolver={resolver} compact={compact} />;
  };
  if (!images.length) return <p className="text-sm text-muted">{t('noPhotos')}</p>;
  return <section aria-label={t('progressPhotos', { name })} className="grid min-w-0 gap-3">
    <div dir="ltr" className="flex flex-row-reverse flex-wrap items-center gap-2">
      {images.slice(0, 3).map((image, index) => <button key={image.id} type="button" aria-label={label(index)} className="size-12 shrink-0 cursor-pointer overflow-hidden rounded-ui border border-accent/50 p-0.5 sm:h-14 sm:w-16" onClick={() => setMode({ kind: 'viewer', index, fromGrid: false })}>{photo(index, true)}</button>)}
      {images.length > 3 && <button type="button" aria-label={t('allProgressImages', { name, total: formatNumber(images.length, locale) })} className="grid h-12 min-w-9 shrink-0 cursor-pointer place-content-center rounded-ui px-2 text-lg font-medium text-primary underline-offset-4 hover:bg-surface hover:underline sm:h-14 sm:min-w-11" onClick={() => setMode({ kind: 'grid' })}>+{formatNumber(images.length - 3, locale)}</button>}
    </div>
    <Dialog open={mode !== null} title={t('progressPhotos', { name })} onClose={() => setMode(null)}>
      {mode?.kind === 'grid' && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((image, index) => <button key={image.id} type="button" ref={(node) => { if (node) gridButtons.current.set(index, node); else gridButtons.current.delete(index); }} aria-label={label(index)} className="grid min-w-0 cursor-pointer gap-2 rounded-ui border border-accent/50 p-2 text-start" onClick={() => setMode({ kind: 'viewer', index, fromGrid: true })}>
          <span className="block aspect-square min-w-0">{photo(index)}</span><span className="text-sm [overflow-wrap:anywhere]">{image.description || t('imagePosition', { current: formatNumber(index + 1, locale), total: formatNumber(images.length, locale) })}</span>
        </button>)}
      </div>}
      {mode?.kind === 'viewer' && images[mode.index] && <>
        <p ref={viewerTitle} tabIndex={-1} className="text-muted outline-none">{t('imagePosition', { current: formatNumber(mode.index + 1, locale), total: formatNumber(images.length, locale) })}</p>
        <div className="h-72 sm:h-96">{photo(mode.index)}</div>
        {images[mode.index]!.description && <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">{images[mode.index]!.description}</p>}
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="secondary" disabled={mode.index === 0} onClick={() => setMode({ ...mode, index: mode.index - 1 })}>{t('previousPhoto')}</Button>
          <Button variant="secondary" disabled={mode.index >= images.length - 1} onClick={() => setMode({ ...mode, index: mode.index + 1 })}>{t('nextPhoto')}</Button>
          {mode.fromGrid && <Button variant="secondary" onClick={() => setMode({ kind: 'grid', index: mode.index })}>{t('backToPhotos')}</Button>}
        </div>
      </>}
    </Dialog>
  </section>;
}
