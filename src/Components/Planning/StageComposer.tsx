import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTimePlan } from "../../Context/TimePlanContext";
import { useStaffRead } from "../../Hooks/useStaffRead";
import { getStageTemplateById } from "../../Services/Templates";
import { useEditorDraft, useEditorGuard } from "../../Planning/editorDraft";
import { ordered, planInput, stageDraft, validPlanningDate } from "../../Planning/policy";
import type { StageTemplateDto } from "../../Types/contracts";
import { useAuth } from "../../Hooks/useAuth";
import { sessionBoundary } from "../../Security/sessionBoundary";
import { SourcePicker } from "./SourcePicker";
import type { SourceChoice } from "./SourcePicker";
import { PlanningForm, PlanningRead } from "./Shared";
import { planningPanel } from "./classes";
import { Input } from "../Fields";
import { Button } from "../Button";
import { Alert, ValidationSummary } from "../Feedback";

function TemplateStageForm({ source, disabled }: { source: StageTemplateDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { run, action } = useTimePlan();
  const draft = useEditorDraft(`stage-source-${source.id}`, {
    deliveryDate: "",
    items: ordered(source.items).map((row) => ({ ...row, dueDate: "", confirmedDate: "" })),
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const unusable = !source.isActive || source.items.some((row) => !row.isActive);
  const changed =
    draft.value.items.length !== source.items.length ||
    draft.value.items.some((row) => !source.items.some((item) => item.itemTemplateId === row.itemTemplateId));

  async function save() {
    const errors: string[] = [];
    if (!validPlanningDate(draft.value.deliveryDate)) {
      errors.push("template-delivery");
    }
    draft.value.items.forEach((row, index) => {
      if (!validPlanningDate(row.dueDate)) {
        errors.push(`template-due-${index}`);
      }
      if (row.confirmedDate && !validPlanningDate(row.confirmedDate)) {
        errors.push(`template-confirmed-${index}`);
      }
    });
    setInvalid(errors);
    if (errors.length) {
      document.getElementById(errors[0]!)?.focus();
      return;
    }
    const sorted = { ...source, items: ordered(source.items) };
    const result = await run("template-stage", {
      kind: "addStage",
      input: stageDraft(
        source.name,
        draft.value.deliveryDate,
        draft.value.items.map((row) => ({
          itemTemplateId: row.itemTemplateId,
          name: row.name,
          dueDate: row.dueDate,
          confirmedDate: row.confirmedDate,
        })),
        sorted,
      ),
    });
    if (result) {
      draft.reset();
    }
  }

  return (
    <form
      aria-label={t("applyTemplate")}
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !unusable && !changed) {
          void save();
        }
      }}
    >
      <h3 className="text-xl font-medium" dir="auto">
        {source.name}
      </h3>
      <p>{t("templateSnapshot")}</p>
      {unusable && <Alert tone="error">{t("inactiveSource")}</Alert>}
      {changed && <Alert tone="error">{t("sourceChanged")}</Alert>}
      {changed && (
        <Button variant="secondary" disabled={disabled} onClick={draft.reset}>
          {t("resetTemplateDates")}
        </Button>
      )}
      <ValidationSummary items={invalid.map((id) => ({ fieldId: id, message: t("dateInvalid") }))} />
      <fieldset disabled={disabled || unusable || changed} className="grid gap-5">
        <Input
          id="template-delivery"
          label={t("fields.deliveryDate")}
          dir="ltr"
          hint={t("dateHint")}
          value={draft.value.deliveryDate}
          error={invalid.includes("template-delivery") ? t("dateInvalid") : undefined}
          onChange={(event) => draft.update({ ...draft.value, deliveryDate: event.target.value })}
        />
        {!draft.value.items.length && <p>{t("emptyTemplate")}</p>}
        {draft.value.items.map((row, index) => (
          <fieldset key={row.itemTemplateId} className="grid gap-4 rounded-ui border border-accent/50 p-4 md:grid-cols-2">
            <legend dir="auto">{source.items.find((item) => item.itemTemplateId === row.itemTemplateId)?.name ?? row.name}</legend>
            {(["dueDate", "confirmedDate"] as const).map((field) => {
              const id = `template-${field === "dueDate" ? "due" : "confirmed"}-${index}`;
              return (
                <Input
                  key={field}
                  id={id}
                  label={t(`fields.${field}`)}
                  dir="ltr"
                  hint={t(field === "dueDate" ? "dateHint" : "confirmedHint")}
                  value={row[field]}
                  error={invalid.includes(id) ? t("dateInvalid") : undefined}
                  onChange={(event) =>
                    draft.update({
                      ...draft.value,
                      items: draft.value.items.map((item, position) => (position === index ? { ...item, [field]: event.target.value } : item)),
                    })
                  }
                />
              );
            })}
          </fieldset>
        ))}
      </fieldset>
      <Button type="submit" disabled={disabled || unusable || changed} pending={action.pending}>
        {t("applyTemplate")}
      </Button>
    </form>
  );
}

function SelectedTemplate({ id, disabled }: { id: string; disabled: boolean }) {
  const { scope, action, lastAction } = useTimePlan();
  const { generation } = useAuth();
  const { t } = useTranslation("timePlans");
  const { epoch } = useEditorGuard();
  const [snapshot, setSnapshot] = useState<StageTemplateDto>();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await getStageTemplateById({ id }, { signal });
      if (!signal.aborted && (sessionBoundary.stamp()?.generation ?? generation) === generation) {
        setSnapshot(data);
      }
      return data;
    },
    [id, generation],
  );
  const read = useStaffRead(`${scope}:source:${id}`, load);
  const reload = read.reload;
  const failure = action.failure;
  useEffect(() => {
    // Recheck source eligibility after a rejected application while retaining date drafts by item ID.
    if (lastAction === "template-stage" && failure?.status === 409 && !action.pending) {
      void reload().catch(() => {});
    }
  }, [lastAction, failure, action.pending, reload]);
  return (
    <>
      <PlanningRead result={read.result} reload={read.reload} retained={Boolean(snapshot)} />
      <Button variant="secondary" disabled={disabled || read.result.status === "loading"} onClick={() => void read.reload().catch(() => {})}>
        {t("refreshSource")}
      </Button>
      {snapshot && <TemplateStageForm key={`${id}:${epoch}`} source={snapshot} disabled={disabled || read.result.status !== "success"} />}
    </>
  );
}

export function StageComposer({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { scope, run, action, lastAction } = useTimePlan();
  const guard = useEditorGuard();
  const [source, setSource] = useState<SourceChoice | null>(null);
  return (
    <details className={planningPanel}>
      <summary className="cursor-pointer text-xl font-medium">{t("addStage")}</summary>
      <div className="grid gap-6 pt-5">
        <SourcePicker
          kind="stage"
          scope={scope}
          activeOnly
          value={source?.id ?? ""}
          selectedName={source?.name}
          disabled={disabled}
          onChange={(row) => guard.transition(() => setSource(row))}
        />
        {source ? (
          <SelectedTemplate key={source.id} id={source.id} disabled={disabled} />
        ) : (
          <PlanningForm
            key={`manual:${guard.epoch}`}
            id="add-stage"
            title={t("manualStage")}
            initial={{ name: "", deliveryDate: "" }}
            disabled={disabled}
            pending={action.pending && lastAction === "add-stage"}
            failure={lastAction === "add-stage" ? action.failure : undefined}
            onSave={(value) => run("add-stage", { kind: "addStage", input: { stageTemplateId: null, ...planInput(value), items: [] } })}
          />
        )}
      </div>
    </details>
  );
}
