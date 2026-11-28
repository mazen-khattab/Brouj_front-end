import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import { validateStage } from "./validation";
import { stageFields } from "./fields";
import type { TimePlanStageDraft, TimePlanStageFormProps } from "./types";

export function TimePlanStageForm({
  id,
  title,
  initial,
  disabled,
  pending,
  failure,
  onSave,
  onSaved,
  onReset,
  mode,
  nameReadOnly = false,
  isTemplateCopy = false,
  submitLabel,
  resetOnSave = false,
  children,
}: TimePlanStageFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof TimePlanStageDraft)[]>([]);
  const fields = stageFields.filter((field) => !isTemplateCopy || field.template);
  const pricingRequired = mode === "create" && !isTemplateCopy;
  const errors = new Set([...invalid, ...serverFieldErrors(failure, fields.map((field) => field.key))]);
  const messages = new Map(fields.flatMap((field) =>
    errors.has(field.key) ? [[field.key, t("invalidField", { field: field.label(t) })] as const] : [],
  ));

  function change(field: keyof TimePlanStageDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid((previous) => previous.filter((key) => key !== field));
  }

  async function submit() {
    const issues = validateStage(draft.value, mode, isTemplateCopy);
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
    <form
      noValidate
      aria-label={title}
      className="grid min-w-0 gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) void submit();
      }}
    >
      <h3 className="text-xl font-medium">{title}</h3>
      <ValidationSummary
        items={Array.from(messages, ([field, message]) => ({ fieldId: `${id}-${field}`, message }))}
      />
      <fieldset disabled={disabled} className="grid min-w-0 gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <Fragment key={field.key}>
            {field.input({
              id: `${id}-${field.key}`,
              label: field.label(t),
              value: draft.value[field.key],
              error: messages.get(field.key),
              change: (value) => change(field.key, value),
              nameReadOnly,
              pricingRequired,
              t,
            })}
          </Fragment>
        ))}
      </fieldset>
      {children}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled} pending={pending} pendingLabel={t("working")}>
          {submitLabel ?? t("save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            draft.reset();
            setInvalid([]);
            onReset?.();
          }}
        >
          {t("reset")}
        </Button>
      </div>
    </form>
  );
}
