import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "../../../Components/Dialog";
import { MediaPlaceholder } from "../../../Components/MediaGallery";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import { resolveMedia, type MediaResolver } from "../../../Media/delivery";
import type { ImageMetadataDto } from "../../../Types/contracts";

export function UnitGallery({ images, resolver = resolveMedia }: {
  images: ReadonlyArray<ImageMetadataDto>; resolver?: MediaResolver;
}) {
  const { t } = useTranslation("catalogue");
  const { locale, direction } = useLocale();
  const [selection, select] = useState(0);
  const [open, setOpen] = useState(false);
  const viewer = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) viewer.current?.focus(); }, [open]);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const index = Math.min(selection, Math.max(0, images.length - 1));
  const selected = images[index];
  const selectedUrl = selected ? resolver(selected.imagePath) : undefined;
  const canZoom = !!selectedUrl && !failed.has(selectedUrl);
  const position = (current: number) => t("imagePosition", {
    current: formatNumber(current + 1, locale), total: formatNumber(images.length, locale),
  });
  const photograph = (image: ImageMetadataDto | undefined) => {
    const url = image ? resolver(image.imagePath) : undefined;
    return url && !failed.has(url) ? <img src={url} alt={image?.altText?.trim() || t("imageFallback")}
      loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => setFailed(previous => new Set(previous).add(url))} /> : <MediaPlaceholder />;
  };
  const navigate = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || images.length < 2) return;
    event.preventDefault();
    const step = (event.key === "ArrowRight" ? 1 : -1) * (direction === "rtl" ? -1 : 1);
    select(event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : Math.max(0, Math.min(images.length - 1, index + step)));
  };
  return <section aria-label={t("gallery")} className="ud-gallery">
    {canZoom ? <button type="button" className="ud-gallery-main ud-gallery-zoom" aria-label={t("zoomPhoto")}
      onClick={() => setOpen(true)}>{photograph(selected)}<span className="ud-zoom-label" aria-hidden="true">{t("zoomPhoto")} ↗</span></button>
      : <div className="ud-gallery-main">{photograph(selected)}</div>}
    {images.length > 1 && <>
      <div className="ud-gallery-thumbnails" onKeyDown={navigate} data-lenis-prevent>
        {images.map((image, current) => <button key={image.id} type="button" aria-label={position(current)}
          aria-pressed={index === current} onClick={() => select(current)}>{photograph(image)}</button>)}
      </div>
      <div className="ud-gallery-controls">
        <button type="button" disabled={index === 0} onClick={() => select(index - 1)}>{t("previousPhoto")}</button>
        <p role="status">{position(index)}</p>
        <button type="button" disabled={index === images.length - 1} onClick={() => select(index + 1)}>{t("nextPhoto")}</button>
      </div>
    </>}
    {!images.length && <p className="ud-gallery-empty">{t("noPhotos")}</p>}
    <Dialog open={open} title={t("gallery")} onClose={() => setOpen(false)}>
      {open && <div ref={viewer} tabIndex={0} className="ud-lightbox" onKeyDown={navigate}>
        <div className="ud-lightbox-image">{photograph(selected)}</div>
        <div className="ud-gallery-controls">
          <button type="button" disabled={index === 0} onClick={() => select(index - 1)}>{t("previousPhoto")}</button>
          <p role="status">{position(index)}</p>
          <button type="button" disabled={index >= images.length - 1} onClick={() => select(index + 1)}>{t("nextPhoto")}</button>
        </div>
      </div>}
    </Dialog>
  </section>;
}
