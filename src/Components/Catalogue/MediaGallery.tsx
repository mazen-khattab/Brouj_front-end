import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ImageMetadataDto } from "../../Types/contracts";
import { resolveMedia } from "../../Catalogue/media";
import type { MediaResolver } from "../../Catalogue/media";
import { Button } from "../Button";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";

export function MediaPlaceholder() {
  const { t } = useTranslation("catalogue");
  return (
    <div
      role="img"
      aria-label={t("imageUnavailable")}
      className="relative grid h-full min-h-44 place-content-center overflow-hidden rounded-ui border border-accent/50 bg-linear-to-br from-primary-deep via-primary to-primary-light p-6 text-center text-accent-light"
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex h-16 items-end justify-center gap-2"
      >
        <span className="h-full w-5 border border-accent/60" />
        <span className="h-12 w-5 border border-accent/60" />
        <span className="h-8 w-5 border border-accent/60" />
      </div>
      <span className="text-sm">{t("imageUnavailable")}</span>
    </div>
  );
}
function MediaImage({ url, alt }: { url: string | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <MediaPlaceholder />;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="h-full min-h-44 w-full rounded-ui object-cover"
      onError={() => setFailed(true)}
    />
  );
}
export function MediaGallery({
  images,
  resolver = resolveMedia,
}: {
  images: ReadonlyArray<ImageMetadataDto>;
  resolver?: MediaResolver;
}) {
  const { t } = useTranslation("catalogue");
  const { locale } = useLocale();
  const [selection, select] = useState(0);
  const index = Math.min(selection, Math.max(0, images.length - 1));
  const image = images[index];
  const url = image ? resolver(image.imagePath) : undefined;
  return (
    <section aria-label={t("gallery")} className="grid gap-4">
      <div className="h-72 sm:h-[420px]">
        <MediaImage
          key={`${image?.id ?? "empty"}:${url ?? ""}`}
          url={url}
          alt={image?.altText?.trim() || t("imageFallback")}
        />
      </div>
      {images.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={index === 0}
            onClick={() => select(index - 1)}
          >
            {t("previousPhoto")}
          </Button>
          <p role="status" className="text-sm">
            {t("imagePosition", {
              current: formatNumber(index + 1, locale),
              total: formatNumber(images.length, locale),
            })}
          </p>
          <Button
            variant="secondary"
            disabled={index >= images.length - 1}
            onClick={() => select(index + 1)}
          >
            {t("nextPhoto")}
          </Button>
        </div>
      ) : (
        !images.length && <p className="text-sm text-muted">{t("noPhotos")}</p>
      )}
    </section>
  );
}
