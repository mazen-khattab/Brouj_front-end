import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Select } from "../../../Components/Fields";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import { validateItemStatus } from "./validation";
import type { TimePlanItemStatusDraft, TimePlanItemStatusFormProps } from "./types";

export function TimePlanItemStatusForm({ id, title, initial, disabled, pending, failure, onSave, onSaved }: TimePlanItemStatusFormProps) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<(keyof TimePlanItemStatusDraft)[]>([]);
  const fields: readonly (keyof TimePlanItemStatusDraft)[] = ["status","confirmedDate"];
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, fields)])];

  function change(field: keyof TimePlanItemStatusDraft, value: string) {
    draft.update({ ...draft.value, [field]: value });
    setInvalid(previous => previous.filter(key => key !== field));
  }

  function error(field: keyof TimePlanItemStatusDraft) {
    return errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined;
  }

  async function submit() {
    const issues = validateItemStatus(draft.value);
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
        <Select
          id={`${id}-status`}
          label={t("fields.status")}
          value={draft.value.status}
          error={error("status")}
          onChange={event => change("status", event.target.value)}
        >
          <option value="0">{t("itemStatus.0", { ns: "account" })}</option>
          <option value="1">{t("itemStatus.1", { ns: "account" })}</option>
          <option value="2">{t("itemStatus.2", { ns: "account" })}</option>
        </Select>
        <Input
          id={`${id}-confirmedDate`}
          label={t("fields.confirmedDate")}
          value={draft.value.confirmedDate}
          error={error("confirmedDate")}
          onChange={event => change("confirmedDate", event.target.value)}
          dir="ltr"
          maxLength={40}
          hint={t("confirmedHint")}
          required={draft.value.status === "2"}
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
