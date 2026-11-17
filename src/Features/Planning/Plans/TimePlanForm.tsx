import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../Shared/editorDraft";
import { planningFieldErrors } from "../Shared/fieldErrors";
import { validatePlan } from "./validation";
import type { TimePlanDraft, TimePlanFormProps } from "./types";

export function TimePlanForm({ id, title, initial, disabled, pending, failure, onSave, onSaved }: TimePlanFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof TimePlanDraft)[]>([]);
  const fields: readonly (keyof TimePlanDraft)[] = ["name","deliveryDate"];
  const errors = [...new Set([...invalid, ...planningFieldErrors(failure, fields)])];

  function change(field: keyof TimePlanDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid(previous => previous.filter(key => key !== field));
  }

  function error(field: keyof TimePlanDraft) {
    return errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined;
  }

  async function submit() {
    const issues = validatePlan(draft.value);
    setInvalid(issues);
    if (issues.length) {
      document.getElementById(`${id}-${issues[0]}`)?.focus();
      return;
    }
    const saved = await onSave(draft.value);
    if (saved) {
      draft.accept();
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
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled} pending={pending} pendingLabel={t("working")}>
          {t("save")}
        </Button>
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => { draft.reset(); setInvalid([]); }}>
          {t("reset")}
        </Button>
      </div>
    </form>
  );
}
