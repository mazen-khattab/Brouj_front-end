import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import { validateImageDescription } from "./validation";
import type { ItemImageDescriptionDraft, ItemImageDescriptionFormProps } from "./types";

export function ItemImageDescriptionForm({ id, title, initial, disabled, pending, failure, onSave, onSaved }: ItemImageDescriptionFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof ItemImageDescriptionDraft)[]>([]);
  const fields: readonly (keyof ItemImageDescriptionDraft)[] = ["description"];
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, fields)])];

  function change(field: keyof ItemImageDescriptionDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid(previous => previous.filter(key => key !== field));
  }

  function error(field: keyof ItemImageDescriptionDraft) {
    return errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined;
  }

  async function submit() {
    const issues = validateImageDescription(draft.value);
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
        <Textarea
          id={`${id}-description`}
          label={t("fields.description")}
          value={draft.value.description}
          error={error("description")}
          onChange={event => change("description", event.target.value)}
          maxLength={20000}
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
