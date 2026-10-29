import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input, Select, Textarea } from "../../Components/Fields";
import { Button } from "../../Components/Button";
import { ParentSelector } from "../../Components/AdminCatalogue/ParentSelector";
import { draftFrom, invalidFields, saveRecord, detailPath, readRecord, inputKeys } from "../../AdminCatalogue/model";
import type { Draft, Kind, RecordData } from "../../AdminCatalogue/model";
import { useAdminCatalogue } from "../../Context/AdminCatalogueContext";
import { getProjectById } from "../../Services/Projects";
import { useCatalogueRead } from "../../Hooks/useCatalogueRead";
import { ErrorPanel, ValidationSummary } from "../../Components/Feedback";

export default function CatalogueForm({
  kind,
  data,
  projectId = "",
  refresh,
  readPending = false,
  onCreated,
}: {
  kind: Kind;
  data?: RecordData;
  projectId?: string;
  refresh: () => Promise<unknown>;
  readPending?: boolean;
  onCreated?: () => void;
}) {
  const { t } = useTranslation("admin");
  const action = useAdminCatalogue();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(kind, data));
  const [invalid, setInvalid] = useState<string[]>([]);
  const [baseline, setBaseline] = useState(() => JSON.stringify(draftFrom(kind, data)));
  const formKey = `record:${kind}:${data?.id ?? "new"}`;
  const loadProject = useCallback((signal: AbortSignal) => getProjectById({ id: projectId }, { signal }), [projectId]);
  const parent = useCatalogueRead(`${action.scope}:parent:${projectId}`, loadProject, kind === "unit");
  const project = parent.result.status === "success" ? parent.result.data : undefined;
  const disabled = action.pending || action.blocked || readPending || (kind === "unit" && !project);

  function change(key: string, value: string) {
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
    const errors = invalidFields(kind, draft);
    if (kind === "unit" && project) {
      if (project.projectType === 1 && (!draft.neighborMeterPrice || Number(draft.size) * Number(draft.meterPrice) > project.price)) {
        errors.push("neighborMeterPrice");
      }
      if (project.projectType === 0 && draft.neighborMeterPrice) {
        errors.push("neighborMeterPrice");
      }
    }
    setInvalid(errors);
    if (errors.length || disabled) {
      return;
    }
    let createdId = "";
    let writeSignal = new AbortController().signal;
    const result = await action.run(
      async (signal) => {
        writeSignal = signal;
        createdId = await saveRecord(kind, draft, data?.id, projectId, signal);
        return createdId;
      },
      data
        ? refresh
        : async () => {
            // Confirm the returned create reference before moving to its editor.
            await readRecord(kind, createdId, projectId, writeSignal);
            await refresh();
          },
    );
    if (result) {
      action.markDirty(formKey, false);
      setBaseline(JSON.stringify(draft));
      if (!data) {
        onCreated?.();
        navigate(detailPath(kind, result, projectId));
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
        items={inputKeys[kind]
          .filter((key) => error(key))
          .map((key) => ({ fieldId: `field-${key}`, message: `${t(`fields.${key}`)}: ${t("invalid")}` }))}
      />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {inputKeys[kind].map((key) => {
          if (key === "cityId" || key === "areaId") {
            return (
              <ParentSelector
                key={key}
                kind={key === "cityId" ? "city" : "area"}
                value={draft[key] ?? ""}
                onChange={(value) => change(key, value)}
                error={error(key)}
                disabled={disabled}
              />
            );
          }
          if (key === "projectType") {
            return (
              <Select
                key={key}
                id={`field-${key}`}
                label={t(`fields.${key}`)}
                value={draft[key]}
                error={error(key)}
                disabled={disabled}
                onChange={(e) => change(key, e.target.value)}
              >
                <option value="0">{t("regular")}</option>
                <option value="1">{t("initiative")}</option>
              </Select>
            );
          }
          if (key === "description") {
            return (
              <Textarea
                key={key}
                id={`field-${key}`}
                label={t(`fields.${key}`)}
                value={draft[key] ?? ""}
                error={error(key)}
                maxLength={20000}
                disabled={disabled}
                onChange={(e) => change(key, e.target.value)}
              />
            );
          }
          const text = key === "name" || key === "number" || key === "drawDate";
          const regularOnly =
            (kind === "project" && draft.projectType === "0" && (key === "neighborPrice" || key === "drawDate")) ||
            (kind === "unit" && project?.projectType === 0 && key === "neighborMeterPrice");
          return (
            <Input
              key={key}
              id={`field-${key}`}
              label={t(`fields.${key}`)}
              value={draft[key] ?? ""}
              error={error(key)}
              disabled={disabled || regularOnly}
              inputMode={text ? "text" : "decimal"}
              maxLength={key === "name" ? 100 : key === "number" ? 64 : undefined}
              hint={
                key === "drawDate"
                  ? t("dateHint")
                  : key === "neighborMeterPrice" && project?.projectType === 1
                    ? t("initiativeUnitHint")
                    : ["latitude", "longitude", "neighborPrice", "neighborMeterPrice"].includes(key)
                      ? t("nullable")
                      : undefined
              }
              onChange={(e) => change(key, e.target.value)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" pending={action.pending} disabled={disabled}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
