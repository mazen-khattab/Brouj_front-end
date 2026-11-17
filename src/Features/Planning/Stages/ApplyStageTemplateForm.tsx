import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageTemplateDto } from "../../../Types/contracts";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { Alert, ValidationSummary } from "../../../Components/Feedback";
import { useTimePlan } from "../Plans/TimePlanContext";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { ordered } from "../Shared/ordering";
import { TimePlanStageForm } from "./TimePlanStageForm";
import type { TemplateApplicationItemDraft, TimePlanStageDraft } from "./types";
import { stageFromTemplateInput } from "./mapping";
import { validateTemplateItemDates } from "./validation";

/** Stage fields belong to TimePlanStageForm; this editor supplies only the template's dated items. */
export function ApplyStageTemplateForm({ source, disabled }: { source: StageTemplateDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { run, action } = useTimePlan();
  const draft = useEditorDraft<TemplateApplicationItemDraft[]>(`stage-source-${source.id}`, ordered(source.items).map(row => ({
    itemTemplateId: row.itemTemplateId, name: row.name, dueDate: "", confirmedDate: "",
  })));
  const [invalid, setInvalid] = useState<string[]>([]);
  const unusable = !source.isActive || source.items.some(row => !row.isActive);
  const changed = draft.value.length !== source.items.length || draft.value.some(row => !source.items.some(item => item.itemTemplateId === row.itemTemplateId));

  async function save(value: TimePlanStageDraft) {
    const errors = validateTemplateItemDates(draft.value);
    setInvalid(errors);
    if (errors.length) {
      document.getElementById(errors[0]!)?.focus();
      return undefined;
    }
    return run("template-stage", {
      kind: "addStage",
      input: stageFromTemplateInput({ ...source, items: ordered(source.items) }, value, draft.value),
    });
  }

  function changeDate(index: number, field: "dueDate" | "confirmedDate", value: string) {
    draft.update(draft.value.map((item, position) => position === index ? { ...item, [field]: value } : item));
    setInvalid(previous => previous.filter(id => id !== `template-${field === "dueDate" ? "due" : "confirmed"}-${index}`));
  }

  return (
    <div className="grid gap-5">
      <h3 className="text-xl font-medium" dir="auto">{source.name}</h3>
      <p>{t("templateSnapshot")}</p>
      {unusable && <Alert tone="error">{t("inactiveSource")}</Alert>}
      {changed && <Alert tone="error">{t("sourceChanged")}</Alert>}
      {changed && <Button variant="secondary" disabled={disabled} onClick={draft.reset}>{t("resetTemplateDates")}</Button>}
      <TimePlanStageForm
        id="template"
        title={t("applyTemplate")}
        mode="create"
        initial={{ name: source.name, deliveryDate: "", percentage: "" }}
        nameReadOnly
        resetOnSave
        submitLabel={t("applyTemplate")}
        disabled={disabled || unusable || changed}
        pending={action.pending}
        failure={action.failure}
        onSave={save}
        onSaved={() => draft.reset()}
        onReset={() => { draft.reset(); setInvalid([]); }}
      >
        <ValidationSummary items={invalid.map(id => ({ fieldId: id, message: t("dateInvalid") }))} />
        <fieldset disabled={disabled || unusable || changed} className="grid gap-5">
          {!draft.value.length && <p>{t("emptyTemplate")}</p>}
          {draft.value.map((row, index) => (
            <fieldset key={row.itemTemplateId} className="grid gap-4 rounded-ui border border-accent/50 p-4 md:grid-cols-2">
              <legend dir="auto">{source.items.find(item => item.itemTemplateId === row.itemTemplateId)?.name ?? row.name}</legend>
              <Input
                id={`template-due-${index}`}
                label={t("fields.dueDate")}
                dir="ltr"
                required
                hint={t("dateHint")}
                value={row.dueDate}
                error={invalid.includes(`template-due-${index}`) ? t("dateInvalid") : undefined}
                onChange={event => changeDate(index, "dueDate", event.target.value)}
              />
              <Input
                id={`template-confirmed-${index}`}
                label={t("fields.confirmedDate")}
                dir="ltr"
                hint={t("confirmedHint")}
                value={row.confirmedDate}
                error={invalid.includes(`template-confirmed-${index}`) ? t("dateInvalid") : undefined}
                onChange={event => changeDate(index, "confirmedDate", event.target.value)}
              />
            </fieldset>
          ))}
        </fieldset>
      </TimePlanStageForm>
    </div>
  );
}
