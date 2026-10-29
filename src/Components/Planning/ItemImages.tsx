import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTimePlan } from "../../Context/TimePlanContext";
import { useEditorDraft, useEditorGuard } from "../../Planning/editorDraft";
import { moveRows, ordered, orderingInput } from "../../Planning/policy";
import { fileIssue } from "../../AdminCatalogue/model";
import type { PlanStageItemDto } from "../../Types/contracts";
import { Button } from "../Button";
import { Input, Textarea } from "../Fields";
import { Alert } from "../Feedback";
import { MediaGallery } from "../Catalogue/MediaGallery";
import { ConfirmButton, MoveControls, PlanningForm } from "./Shared";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";

function ImageUpload({ stageId, itemId, disabled }: { stageId: string; itemId: string; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { action, lastAction, run } = useTimePlan();
  const draft = useEditorDraft(`upload-${itemId}`, { description: "", file: "" });
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [issue, setIssue] = useState("");
  const [inputKey, setInputKey] = useState(0);
  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  async function upload() {
    const error = file ? fileIssue(file) : "fileRequired";
    if (error || draft.value.description.length > 20000) {
      setIssue(error ?? "descriptionTooLong");
      return;
    }
    const result = await run("upload-image", { kind: "addImage", stageId, itemId, file: file!, description: draft.value.description || null });
    if (result) {
      draft.reset();
      setFile(undefined);
      setPreview("");
      setInputKey((value) => value + 1);
      setIssue("");
    }
  }

  return (
    <form
      aria-label={t("uploadImage")}
      className="grid gap-4 rounded-ui border border-accent/50 p-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) {
          void upload();
        }
      }}
    >
      <h3 className="text-xl font-medium">{t("uploadImage")}</h3>
      <p>{t("uploadHint")}</p>
      {issue && <Alert tone="error">{t(issue)}</Alert>}
      {lastAction === "upload-image" && action.failure && Object.keys(action.failure.fieldErrors).length > 0 && (
        <Alert tone="error">{t("uploadRejected")}</Alert>
      )}
      <Input
        key={inputKey}
        id="item-image-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        label={t("fields.file")}
        disabled={disabled}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          setFile(selected);
          setIssue(selected ? (fileIssue(selected) ?? "") : "");
          setPreview(selected && !fileIssue(selected) ? URL.createObjectURL(selected) : "");
          draft.update({ ...draft.value, file: selected ? `${selected.name}:${selected.size}:${selected.lastModified}` : "" });
        }}
      />
      {preview && <img src={preview} alt={t("localPreview")} className="max-h-60 max-w-full rounded-ui object-contain" />}
      <Textarea
        id="image-upload-description"
        label={t("fields.description")}
        maxLength={20000}
        value={draft.value.description}
        disabled={disabled}
        onChange={(event) => draft.update({ ...draft.value, description: event.target.value })}
      />
      <Button type="submit" disabled={disabled} pending={action.pending && lastAction === "upload-image"}>
        {t("uploadImage")}
      </Button>
    </form>
  );
}

export function ItemImages({ stageId, item, disabled }: { stageId: string; item: PlanStageItemDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { locale } = useLocale();
  const { run, action, lastAction } = useTimePlan();
  const { epoch } = useEditorGuard();
  const images = ordered(item.images);
  const [retained, setRetained] = useState({ source: item.images, rows: images });
  if (retained.source !== item.images) {
    // Keep the same editor mounted if another writer removes its image, so a failed save cannot erase text.
    setRetained({ source: item.images, rows: [...images, ...retained.rows.filter((row) => !images.some((image) => image.id === row.id))] });
  }
  const [moved, setMoved] = useState<{ name: string; position: number }>();

  async function move(index: number, direction: -1 | 1) {
    const result = await run("order-images", {
      kind: "orderImages",
      stageId,
      itemId: item.id,
      items: orderingInput(moveRows(images, index, direction)),
    });
    if (result) {
      setMoved({
        name: images[index]?.description || t("imageNumber", { number: formatNumber(index + 1, locale) }),
        position: index + direction + 1,
      });
    }
  }

  return (
    <section aria-label={t("images")} className="grid min-w-0 gap-6">
      <h3 className="text-2xl font-medium">{t("images")}</h3>
      <p role="status" className="sr-only">
        {moved ? t("moved", { name: moved.name, position: formatNumber(moved.position, locale) }) : ""}
      </p>
      <ImageUpload key={`${item.id}:${epoch}`} stageId={stageId} itemId={item.id} disabled={disabled} />
      {!images.length && <p>{t("noImages")}</p>}
      {retained.rows.map((image, index) => (
        <article key={image.id} className="grid min-w-0 gap-4 rounded-ui border border-accent/50 p-5">
          <h4 className="text-xl font-medium">{t("imageNumber", { number: formatNumber(index + 1, locale) })}</h4>
          <MediaGallery images={[{ id: image.id, imagePath: image.imagePath, altText: image.description }]} />
          {!images.some((row) => row.id === image.id) && <Alert>{t("imageUnavailable")}</Alert>}
          <PlanningForm
            key={`${image.id}:${epoch}`}
            id={`image-${image.id}`}
            title={t("editDescription")}
            initial={{ description: image.description ?? "" }}
            disabled={disabled || !images.some((row) => row.id === image.id)}
            pending={action.pending && lastAction === image.id}
            failure={lastAction === image.id ? action.failure : undefined}
            onSave={(value) =>
              run(image.id, { kind: "updateImage", stageId, itemId: item.id, imageId: image.id, description: value.description || null })
            }
          />
          <MoveControls
            name={image.description || t("imageNumber", { number: formatNumber(index + 1, locale) })}
            index={images.findIndex((row) => row.id === image.id)}
            count={images.length}
            disabled={disabled || images.length > 1000 || !images.some((row) => row.id === image.id)}
            onMove={(direction) =>
              void move(
                images.findIndex((row) => row.id === image.id),
                direction,
              )
            }
          />
          <ConfirmButton
            title={t("deleteImage")}
            description={t("deleteImageDescription")}
            disabled={disabled || !images.some((row) => row.id === image.id)}
            pending={action.pending}
            onConfirm={async () => {
              const result = await run(`delete-${image.id}`, { kind: "deleteImage", stageId, itemId: item.id, imageId: image.id });
              if (result) {
                setRetained((previous) => ({ ...previous, rows: previous.rows.filter((row) => row.id !== image.id) }));
              }
              return result;
            }}
          >
            {t("deleteImage")}
          </ConfirmButton>
        </article>
      ))}
    </section>
  );
}
