import { AreaSelector } from "./AreaSelector";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input, Select, Textarea } from "../../Components/Fields";
import { Button } from "../../Components/Button";
import { createProject, updateProject, getProjectById } from "../../Services/Projects";
import { routePaths } from "../../Router/browserPaths";
import { draftFrom, projectInput } from "./mapping";
import { invalidFields } from "./validation";
import type { ProjectDraft, ProjectRecord } from "./types";
import { useProjectEditor } from "./EditorContext";
import { ValidationSummary } from "../../Components/Feedback";

export default function ProjectForm({
  data,
  refresh,
  readPending = false,
  onCreated,
}: {
  data?: ProjectRecord;
  refresh: () => Promise<unknown>;
  readPending?: boolean;
  onCreated?: () => void;
}) {
  const { t } = useTranslation("admin");
  const action = useProjectEditor();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProjectDraft>(() => draftFrom(data));
  const [invalid, setInvalid] = useState<string[]>([]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draftFrom(data)));
  const formKey = `record:project:${data?.id ?? "new"}`;
  const disabled = action.pending || action.blocked || readPending;

  function change(key: keyof ProjectDraft, value: string) {
    const next = { ...draft, [key]: value };
    // Changing to a regular project clears the two fields its contract requires to be null.
    if (key === "projectType" && value === "0") {
      next.neighborPrice = "";
      next.drawDate = "";
    }
    setDraft(next);
    action.markDirty(formKey, JSON.stringify(next) !== baseline);
  }

  async function submit() {
    const errors = invalidFields(draft);
    setInvalid(errors);
    if (errors.length || disabled) {
      return;
    }
    let createdId = "";
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      async (signal) => {
        writeSignal = signal;
        const body = projectInput(draft);
        createdId = data
          ? await updateProject({ id: data.id, body }, { signal })
          : await createProject({ body }, { signal });
        return createdId;
      },
      data
        ? refresh
        : async () => {
            // Confirm the returned create reference before moving to its editor.
            await getProjectById({ id: createdId }, { signal: writeSignal });
            await refresh();
          },
    );
    if (result) {
      action.markDirty(formKey, false);
      setBaseline(JSON.stringify(draft));
      if (!data) {
        onCreated?.();
        navigate(routePaths.admin.project(result));
      }
    }
  }

  function error(key: string) {
    const server = Object.keys(action.failure?.fieldErrors ?? {}).some((field) => field.split(".").at(-1)?.toLowerCase() === key.toLowerCase());
    return invalid.includes(key) || server ? t("invalid") : undefined;
  }

  return (
    <form
      className="grid min-w-0 gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      aria-label={t(data ? "editRecord" : "createRecord")}
    >
      <h2 className="text-2xl font-semibold">{t(data ? "editRecord" : "createRecord")}</h2>
      <p className="text-sm leading-7 text-muted">{t("formHint")}</p>
      <ValidationSummary
        items={["name", "areaId", "description", "latitude", "longitude", "size", "projectType", "price", "floorCount", "plannedUnitCount", "neighborPrice", "drawDate"]
          .filter((key) => error(key))
          .map((key) => ({ fieldId: `field-${key}`, message: `${t(`fields.${key}`)}: ${t("invalid")}` }))}
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Input
          id="field-name"
          label={t("fields.name")}
          value={draft.name}
          error={error("name")}
          disabled={disabled}
          maxLength={100}
          onChange={(event) => change("name", event.target.value)}
        />
        <AreaSelector
          value={draft.areaId}
          onChange={(value) => change("areaId", value)}
          error={error("areaId")}
          disabled={disabled}
        />
        <Textarea
          id="field-description"
          label={t("fields.description")}
          value={draft.description}
          error={error("description")}
          disabled={disabled}
          maxLength={20000}
          onChange={(event) => change("description", event.target.value)}
        />
        <Input
          id="field-latitude"
          label={t("fields.latitude")}
          value={draft.latitude}
          error={error("latitude")}
          disabled={disabled}
          inputMode="decimal"
          hint={t("nullable")}
          onChange={(event) => change("latitude", event.target.value)}
        />
        <Input
          id="field-longitude"
          label={t("fields.longitude")}
          value={draft.longitude}
          error={error("longitude")}
          disabled={disabled}
          inputMode="decimal"
          hint={t("nullable")}
          onChange={(event) => change("longitude", event.target.value)}
        />
        <Input
          id="field-size"
          label={t("fields.size")}
          value={draft.size}
          error={error("size")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("size", event.target.value)}
        />
        <Select
          id="field-projectType"
          label={t("fields.projectType")}
          value={draft.projectType}
          error={error("projectType")}
          disabled={disabled}
          onChange={(event) => change("projectType", event.target.value)}
        >
          <option value="0">{t("regular")}</option>
          <option value="1">{t("initiative")}</option>
        </Select>
        <Input
          id="field-price"
          label={t("fields.price")}
          value={draft.price}
          error={error("price")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("price", event.target.value)}
        />
        <Input
          id="field-floorCount"
          label={t("fields.floorCount")}
          value={draft.floorCount}
          error={error("floorCount")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("floorCount", event.target.value)}
        />
        <Input
          id="field-plannedUnitCount"
          label={t("fields.plannedUnitCount")}
          value={draft.plannedUnitCount}
          error={error("plannedUnitCount")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("plannedUnitCount", event.target.value)}
        />
        <Input
          id="field-neighborPrice"
          label={t("fields.neighborPrice")}
          value={draft.neighborPrice}
          error={error("neighborPrice")}
          disabled={disabled || draft.projectType === "0"}
          inputMode="decimal"
          hint={t("nullable")}
          onChange={(event) => change("neighborPrice", event.target.value)}
        />
        <Input
          id="field-drawDate"
          label={t("fields.drawDate")}
          value={draft.drawDate}
          error={error("drawDate")}
          disabled={disabled || draft.projectType === "0"}
          hint={t("dateHint")}
          onChange={(event) => change("drawDate", event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={action.pending} disabled={disabled}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
