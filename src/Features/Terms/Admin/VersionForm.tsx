import { DateTimeInput } from "../../../Components/DateTimeInput";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Dialog } from "../../../Components/Dialog";
import { ValidationSummary } from "../../../Components/Feedback";
import { Input, Textarea } from "../../../Components/Fields";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import type { ApiError } from "../../../Types/failures";
import type { TermsValues } from "./types";
import { validateTerms } from "./validation";

/** Forms retain edits across rejected writes; secrets are held only in this mounted route. */
export function VersionForm({
  id,
  title,
  initial,
  disabled,
  pending,
  failure,
  onSave,
  onSaved,
  confirm,
  resetOnSuccess = false,
}: {
  id: string;
  title: string;
  initial: TermsValues;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (values: TermsValues) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const { t } = useTranslation("governance");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, ["title", "versionNumber", "effectiveDate", "content"])])];

  async function commit() {
    const saved = await onSave(draft.value);
    setConfirming(false);
    if (saved) {
      if (resetOnSuccess) {
        draft.reset();
      } else {
        draft.accept();
      }
      onSaved?.(saved);
    }
  }

  function submit() {
    if (disabled) {
      return;
    }
    const issues = validateTerms(draft.value);
    setInvalid(issues);
    if (issues.length) {
      document.getElementById(`${id}-${issues[0]}`)?.focus();
      return;
    }
    if (confirm) {
      setConfirming(true);
    } else {
      void commit();
    }
  }

  function control(field: keyof TermsValues) {
    return {
      id: `${id}-${field}`,
      label: t(`fields.${field}`),
      value: draft.value[field],
      required: true,
      error: errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined,
      onChange: (event: { target: { value: string } }) => {
        draft.update({ ...draft.value, [field]: event.target.value });
        setInvalid((previous) => previous.filter((value) => value !== field));
      },
    };
  }

  function dateControl(field: "effectiveDate") {
    const { onChange, ...props } = control(field);
    return { ...props, onValueChange: (value: string) => onChange({ target: { value } }) };
  }

  return (
    <form
      aria-label={title}
      noValidate
      className="grid min-w-0 gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2 className="text-2xl font-medium">{title}</h2>
      <ValidationSummary
        items={errors.map((field) => ({ fieldId: `${id}-${field}`, message: t("invalidField", { field: t(`fields.${field}`) }) }))}
      />
      <fieldset disabled={disabled || confirming} className="grid min-w-0 gap-5 md:grid-cols-2">
        <Input {...control("title")} type="text" dir="auto" maxLength={300} autoComplete="off" />
        <Input {...control("versionNumber")} type="text" dir="ltr" maxLength={32} autoComplete="off" />
        <DateTimeInput {...dateControl("effectiveDate")} autoComplete="off" /*hint={t("dateHint")}*/ />
        <div className="md:col-span-2">
          <Textarea {...control("content")} dir="auto" maxLength={100000} rows={12} hint={t("legalHint")} />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled || confirming} pending={pending}>
          {t("save")}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled || confirming}
          onClick={() => {
            draft.reset();
            setInvalid([]);
          }}
        >
          {t("reset")}
        </Button>
      </div>
      <Dialog open={confirming} title={title} description={confirm ?? ""} pending={pending} onClose={() => setConfirming(false)}>
        <div className="flex flex-wrap gap-3">
          <Button disabled={disabled} pending={pending} onClick={() => void commit()}>
            {t("confirm")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Dialog>
    </form>
  );
}
