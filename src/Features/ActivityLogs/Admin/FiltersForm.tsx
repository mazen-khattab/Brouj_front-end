import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { Dialog } from "../../../Components/Dialog";
import { ValidationSummary } from "../../../Components/Feedback";
import { Input, Select } from "../../../Components/Fields";
import { useEditorDraft } from "../../../Forms/editorDraft";
import { serverFieldErrors } from "../../../Forms/fieldErrors";
import type { ApiError } from "../../../Types/failures";
import type { AuditFilters } from "./types";
import { validateAuditFilters } from "./validation";

/** Forms retain edits across rejected writes; secrets are held only in this mounted route. */
export function FiltersForm({
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
  initial: AuditFilters;
  disabled: boolean;
  pending: boolean;
  failure?: ApiError | undefined;
  onSave: (values: AuditFilters) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const { t } = useTranslation("governance");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const errors = [...new Set([...invalid, ...serverFieldErrors(failure, ["userId", "entityType", "action", "dateFrom", "dateTo"])])];

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
    const issues = validateAuditFilters(draft.value);
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

  function control(field: keyof AuditFilters) {
    return {
      id: `${id}-${field}`,
      label: t(`fields.${field}`),
      value: draft.value[field],
      required: false,
      error: errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined,
      onChange: (event: { target: { value: string } }) => {
        draft.update({ ...draft.value, [field]: event.target.value });
        setInvalid((previous) => previous.filter((value) => value !== field));
      },
    };
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
        <Input {...control("userId")} type="text" dir="ltr" autoComplete="off" />
        <Input {...control("entityType")} type="text" dir="auto" maxLength={128} autoComplete="off" />
        <Select {...control("action")}>
          <option value="">{t("all")}</option>
          {[0, 1, 2].map((value) => (
            <option key={value} value={value}>
              {t(`action.${value}`)}
            </option>
          ))}
        </Select>
        <Input {...control("dateFrom")} type="text" dir="ltr" maxLength={40} autoComplete="off" hint={t("dateHint")} />
        <Input {...control("dateTo")} type="text" dir="ltr" maxLength={40} autoComplete="off" hint={t("dateHint")} />
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled || confirming} pending={pending}>
          {t("apply")}
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
