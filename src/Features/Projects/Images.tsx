import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as projects from "../../Services/Projects";
import type { ImageMetadataDto } from "../../Types/contracts";
import { useProjectEditor } from "./EditorContext";
import { fileIssue } from "./validation";
import { Input } from "../../Components/Fields";
import { Button } from "../../Components/Button";
import { Alert } from "../../Components/Feedback";
import { MediaGallery } from "../../Components/Catalogue/MediaGallery";
import { ConfirmAction } from "./Feedback";

function LocalPreview({ file }: { file: File }) {
  const { t } = useTranslation("admin");
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // Schedule the state update; cleanup always releases this exact allocation.
    void Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url ? <img className="max-h-64 w-full rounded-ui object-contain" src={url} alt={t("localPreview")} /> : null;
}

function ImageEditor({
  image,
  id,
  refresh,
  readPending,
  present,
  retain,
}: {
  image: ImageMetadataDto;
  id: string;
  refresh: () => Promise<unknown>;
  readPending: boolean;
  present: boolean;
  retain: (image: ImageMetadataDto | undefined) => void;
}) {
  const { t } = useTranslation("admin");
  const action = useProjectEditor();
  const [alt, setAlt] = useState(image.altText ?? "");
  const [baseline, setBaseline] = useState(image.altText ?? "");
  const [confirm, setConfirm] = useState(false);
  const disabled = action.pending || action.blocked || readPending || !present;
  const formKey = `image:${image.id}`;

  async function save() {
    if (alt.length > 100) {
      return;
    }
    const service = projects.updateProjectImage;
    const result = await action.run((signal) => service({ id, imageId: image.id, body: { altText: alt || null } }, { signal }), refresh);
    if (result) {
      setBaseline(alt);
      action.markDirty(formKey, false);
      retain(undefined);
    }
  }

  async function remove() {
    const service = projects.deleteProjectImage;
    // A successful refresh removes this editor. Clear only this image's dirty marker.
    const result = await action.run((signal) => service({ id, imageId: image.id }, { signal }), refresh);
    if (result) {
      action.markDirty(formKey, false);
      retain(undefined);
    }
    setConfirm(false);
  }

  return (
    <article className="grid min-w-0 gap-5 rounded-ui border border-accent/50 p-5">
      <MediaGallery images={[image]} />
      {!present && <Alert tone="error">{t("imageRemoved")}</Alert>}
      <Input
        id={`alt-${image.id}`}
        label={t("altText")}
        value={alt}
        maxLength={100}
        readOnly={!present}
        disabled={action.pending || action.blocked || readPending}
        onChange={(e) => {
          setAlt(e.target.value);
          const dirty = e.target.value !== baseline;
          action.markDirty(formKey, dirty);
          retain(dirty ? { ...image, altText: e.target.value } : undefined);
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button disabled={disabled} onClick={() => void save()}>
          {t("saveImage")}
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={() => setConfirm(true)}>
          {t("deleteImage")}
        </Button>
      </div>
      {confirm && <ConfirmAction title={t("deleteImage")} description={t("deleteImageHint")} onClose={() => setConfirm(false)} onConfirm={remove} />}
    </article>
  );
}

export default function ProjectImages({
  id,
  images,
  refresh,
  readPending,
}: {
  id: string;
  images: readonly ImageMetadataDto[];
  refresh: () => Promise<unknown>;
  readPending: boolean;
}) {
  const { t } = useTranslation("admin");
  const action = useProjectEditor();
  const [file, setFile] = useState<File>();
  const [alt, setAlt] = useState("");
  const [issue, setIssue] = useState<string>();
  const [inputVersion, setInputVersion] = useState(0);
  const [retained, setRetained] = useState<Record<string, ImageMetadataDto>>({});
  const disabled = action.pending || action.blocked || readPending;

  async function upload() {
    const issue = file ? fileIssue(file) : "fileRequired";
    setIssue(issue);
    if (!file || issue || alt.length > 100 || disabled) {
      return;
    }
    const service = projects.addProjectImage;
    const result = await action.run((signal) => service({ id, body: { file, altText: alt || null } }, { signal }), refresh);
    if (result) {
      setFile(undefined);
      setAlt("");
      setInputVersion((v) => v + 1);
      action.markDirty("upload", false);
    }
  }

  return (
    <section className="grid gap-6" aria-label={t("images")}>
      <h2 className="text-2xl font-semibold">{t("images")}</h2>
      <Alert tone="info">{t("deliveryHint")}</Alert>
      <form
        className="grid gap-5 rounded-ui border border-accent/50 bg-accent/15 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void upload();
        }}
      >
        <Input
          key={inputVersion}
          id="upload-file"
          label={t("file")}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          hint={t("fileHint")}
          error={issue ? t(issue) : undefined}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.files?.[0];
            const issue = next ? fileIssue(next) : undefined;
            setIssue(issue);
            setFile(issue ? undefined : next);
            action.markDirty("upload", Boolean(next) || Boolean(alt));
          }}
        />
        {file && <LocalPreview key={inputVersion + file.name + file.lastModified} file={file} />}
        <Input
          id="upload-alt"
          label={t("altText")}
          value={alt}
          maxLength={100}
          disabled={disabled}
          onChange={(e) => {
            setAlt(e.target.value);
            action.markDirty("upload", Boolean(file) || Boolean(e.target.value));
          }}
        />
        <Button type="submit" disabled={disabled || !file} pending={action.pending}>
          {t("upload")}
        </Button>
      </form>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {[...images, ...Object.values(retained).filter((draft) => !images.some((image) => image.id === draft.id))].map((image) => (
          <ImageEditor
            key={image.id}
            image={image}
            id={id}
            refresh={refresh}
            readPending={readPending}
            present={images.some((current) => current.id === image.id)}
            retain={(draft) =>
              setRetained((previous) => {
                const next = { ...previous };
                if (draft) {
                  next[image.id] = draft;
                } else {
                  delete next[image.id];
                }
                return next;
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
