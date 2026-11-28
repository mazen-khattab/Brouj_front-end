import { DateTimeInput } from "../../../Components/DateTimeInput";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import { validateItem } from "./validation";
import type { TimePlanItemDraft, TimePlanItemFormProps } from "./types";

export function TimePlanItemForm({ id, title, initial, disabled, pending, failure, onSave, onSaved, completed = false }: TimePlanItemFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof TimePlanItemDraft)[]>([]);
  const fields: readonly (keyof TimePlanItemDraft)[] = ["name","dueDate","confirmedDate"];
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, fields)])];

  function change(field: keyof TimePlanItemDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid(previous => previous.filter(key => key !== field));
  }

  function error(field: keyof TimePlanItemDraft) {
    return errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined;
  }

  async function submit() {
    const issues = validateItem(draft.value, completed);
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
        <DateTimeInput
          id={`${id}-dueDate`}
          label={t("fields.dueDate")}
          value={draft.value.dueDate}
          error={error("dueDate")}
          onValueChange={value => change("dueDate", value)}
          dir="ltr"
          // hint={t("dateHint")}
          required
        />
        <DateTimeInput
          id={`${id}-confirmedDate`}
          label={t("fields.confirmedDate")}
          value={draft.value.confirmedDate}
          error={error("confirmedDate")}
          onValueChange={value => change("confirmedDate", value)}
          dir="ltr"
          hint={t("confirmedHint")}
          required={completed}
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
