import { ProjectSelector } from "./ProjectSelector";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { createUnit, updateUnit, getUnitById } from "../../../Services/Units";
import { routePaths } from "../../../Router/browserPaths";
import { draftFrom, unitInput } from "./mapping";
import { invalidFields } from "./validation";
import type { UnitDraft, UnitRecord } from "./types";
import { useUnitEditor } from "./EditorContext";
import { getProjectById } from "../../../Services/Projects";
import { useResourceRead } from "../../../Hooks/useResourceRead";
import { ErrorPanel, ValidationSummary } from "../../../Components/Feedback";

export default function UnitForm({
  data,
  projectId = "",
  refresh,
  readPending = false,
  onCreated,
}: {
  data?: UnitRecord;
  projectId?: string;
  refresh: () => Promise<unknown>;
  readPending?: boolean;
  onCreated?: () => void;
}) {
  const { t } = useTranslation("admin");
  const action = useUnitEditor();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<UnitDraft>(() => ({ ...draftFrom(data), projectId: data?.projectId ?? projectId }));
  const [invalid, setInvalid] = useState<string[]>([]);
  const [baseline, setBaseline] = useState(() => JSON.stringify({ ...draftFrom(data), projectId: data?.projectId ?? projectId }));
  const formKey = `record:unit:${data?.id ?? "new"}`;
  const loadProject = useCallback((signal: AbortSignal) => getProjectById({ id: draft.projectId }, { signal }), [draft.projectId]);
  const parent = useResourceRead(`${action.scope}:parent:${draft.projectId}`, loadProject, Boolean(draft.projectId));
  const project = parent.result.status === "success" ? parent.result.data : undefined;
  const disabled = action.pending || action.blocked || readPending || !project;

  function change(key: keyof UnitDraft, value: string) {
    const next = { ...draft, [key]: value };
    if (key === "projectId") next.neighborMeterPrice = "";
    setDraft(next);
    action.markDirty(formKey, JSON.stringify(next) !== baseline);
  }

  async function submit() {
    const errors = invalidFields(draft, project);
    setInvalid(errors);
    if (errors.length || disabled) {
      return;
    }
    let createdId = "";
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      async (signal) => {
        writeSignal = signal;
        const body = unitInput(draft);
        createdId = data
          ? await updateUnit({ id: data.id, query: { projectId: data.projectId }, body }, { signal })
          : await createUnit({ projectId: draft.projectId, body }, { signal });
        return createdId;
      },
      data
        ? refresh
        : async () => {
            // Confirm the returned create reference before moving to its editor.
            await getUnitById({ id: createdId, query: { projectId: draft.projectId } }, { signal: writeSignal });
            await refresh();
          },
    );
    if (result) {
      action.markDirty(formKey, false);
      setBaseline(JSON.stringify(draft));
      if (!data) {
        onCreated?.();
        navigate(routePaths.admin.unit(draft.projectId, result));
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
      {project && (
        <p className="break-words font-medium">
          {project.name} · {t(project.projectType === 1 ? "initiative" : "regular")}
        </p>
      )}
      {parent.result.status === "error" && <ErrorPanel title={t("parentUnavailable")} onRetry={parent.reload} />}
      <ValidationSummary
        items={["projectId", "number", "meterPrice", "floorNumber", "size", "neighborMeterPrice"]
          .filter((key) => error(key))
          .map((key) => ({ fieldId: `field-${key}`, message: `${t(`fields.${key}`)}: ${t("invalid")}` }))}
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <ProjectSelector
          value={draft.projectId}
          onChange={(value) => change("projectId", value)}
          error={error("projectId")}
          disabled={action.pending || action.blocked || readPending || Boolean(data)}
          hint={data ? t("unitProjectFixed") : undefined}
        />
        <Input
          id="field-number"
          label={t("fields.number")}
          value={draft.number}
          error={error("number")}
          disabled={disabled}
          maxLength={64}
          onChange={(event) => change("number", event.target.value)}
        />
        <Input
          id="field-meterPrice"
          label={t("fields.meterPrice")}
          value={draft.meterPrice}
          error={error("meterPrice")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("meterPrice", event.target.value)}
        />
        <Input
          id="field-floorNumber"
          label={t("fields.floorNumber")}
          value={draft.floorNumber}
          error={error("floorNumber")}
          disabled={disabled}
          inputMode="decimal"
          onChange={(event) => change("floorNumber", event.target.value)}
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
        <Input
          id="field-neighborMeterPrice"
          label={t("fields.neighborMeterPrice")}
          value={draft.neighborMeterPrice}
          error={error("neighborMeterPrice")}
          disabled={disabled || project?.projectType === 0}
          inputMode="decimal"
          hint={t(project?.projectType === 1 ? "initiativeUnitHint" : "nullable")}
          onChange={(event) => change("neighborMeterPrice", event.target.value)}
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
