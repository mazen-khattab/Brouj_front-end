import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import { validateStage } from "./validation";
import type { TimePlanStageDraft, TimePlanStageFormProps } from "./types";

export function TimePlanStageForm({
  id, title, initial, disabled, pending, failure, onSave, onSaved, onReset,
  mode, nameReadOnly = false, submitLabel, resetOnSave = false, children,
}: TimePlanStageFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof TimePlanStageDraft)[]>([]);
  const fields: readonly (keyof TimePlanStageDraft)[] = mode === "create"
    ? ["name", "deliveryDate", "percentage"]
    : ["name", "deliveryDate"];
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, fields)])];

  function change(field: keyof TimePlanStageDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid(previous => previous.filter(key => key !== field));
  }

  function error(field: keyof TimePlanStageDraft) {
    return errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined;
  }

  async function submit() {
    const issues = validateStage(draft.value, mode);
    setInvalid(issues);
    if (issues.length) {
      document.getElementById(`${id}-${issues[0]}`)?.focus();
      return;
    }
    const saved = await onSave(draft.value);
    if (saved) {
      if (resetOnSave) draft.reset();
      else draft.accept();
      onSaved?.(saved);
    }
  }

  return (
    <form noValidate aria-label={title} className="grid min-w-0 gap-5" onSubmit={event => {
      event.preventDefault();
      if (!disabled) void submit();
    }}>
      <h3 className="text-xl font-medium">{title}</h3>
      <ValidationSummary items={errors.map(field => ({ fieldId: `${id}-${field}`, message: t("invalidField", { field: t(`fields.${field}`) }) }))} />
      <fieldset disabled={disabled} className="grid min-w-0 gap-5 md:grid-cols-2">
        <Input
          id={`${id}-name`}
          label={t("fields.name")}
          value={draft.value.name}
          error={error("name")}
          onChange={event => change("name", event.target.value)}
          dir="auto"
          maxLength={100}
          required
          readOnly={nameReadOnly}
        />
        <Input
          id={`${id}-deliveryDate`}
          label={t("fields.deliveryDate")}
          value={draft.value.deliveryDate}
          error={error("deliveryDate")}
          onChange={event => change("deliveryDate", event.target.value)}
          dir="ltr"
          maxLength={40}
          hint={t("dateHint")}
          required
        />
        {mode === "create" && (
          <Input
            id={`${id}-percentage`}
            label={t("fields.percentage")}
            value={draft.value.percentage}
            error={error("percentage")}
            onChange={event => change("percentage", event.target.value)}
            dir="ltr"
            inputMode="decimal"
            hint={t("percentageHint")}
            required
          />
        )}
      </fieldset>
      {children}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled} pending={pending} pendingLabel={t("working")}>
          {submitLabel ?? t("save")}
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => { draft.reset(); setInvalid([]); onReset?.(); }}>
          {t("reset")}
        </Button>
      </div>
    </form>
  );
}
