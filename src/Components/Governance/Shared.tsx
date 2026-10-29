import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ErrorPanel, Loading, ValidationSummary } from "../Feedback";
import { Input, Select, Textarea } from "../Fields";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { useEditorDraft } from "../../Planning/editorDraft";
import { planningFieldErrors } from "../../Planning/policy";
import { invalidGovernanceFields } from "../../Governance/policy";
import type { FormKind, GovernanceFields } from "../../Governance/policy";
import type { ApiError } from "../../Types/failures";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";
import type { StaffOperation } from "../../Hooks/useStaffOperation";
import { apiFailureMessage } from "../../i18n/apiFailures";

export const governancePanel = "grid min-w-0 gap-6 rounded-ui border border-accent/40 bg-ivory p-5 text-primary shadow-panel sm:p-8";

export function GovernanceRead({ result, reload }: { result: CatalogueRead<unknown>; reload: () => Promise<unknown> }) {
  const { t } = useTranslation("governance");
  if (result.status === "loading") {
    return <Loading label={t("loading")} />;
  }
  if (result.status === "error") {
    return <ErrorPanel title={t(result.failure.status === 404 ? "missing" : "loadFailed")}
      description={t(apiFailureMessage(result.failure).key, { ns: "errors" })} onRetry={() => void reload().catch(() => {})} />;
  }
  return null;
}

export function GovernanceFeedback({ action, password = false }: { action: StaffOperation; password?: boolean }) {
  const { t } = useTranslation("governance");
  return <div className="grid gap-3" aria-live="polite">
    {action.succeeded && <Alert tone="success">{t(password ? "passwordSaved" : "saved")}</Alert>}
    {action.failure && <Alert tone="error">{action.uncertain ? t("uncertain") : password && action.failure.status === 401 && action.failure.featureCode === 1 ? t("wrongPassword") : action.failure.status === 409 ? t("conflict") : t(apiFailureMessage(action.failure).key, { ns: "errors" })}</Alert>}
    {action.blocked && <Button variant="secondary" pending={action.pending} onClick={() => void action.check()}>{t("check")}</Button>}
  </div>;
}

export function GovernanceConfirm({ title, description, disabled, pending, onConfirm, children }: {
  title: string; description: string; disabled: boolean; pending: boolean; onConfirm: () => Promise<unknown>; children: ReactNode;
}) {
  const { t } = useTranslation("governance");
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>{children}</Button>
    <Dialog open={open} title={title} description={description} pending={pending} onClose={() => setOpen(false)}>
      <div className="flex flex-wrap gap-3">
        <Button pending={pending} disabled={disabled} onClick={() => void onConfirm().finally(() => setOpen(false))}>{t("confirm")}</Button>
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>{t("cancel")}</Button>
      </div>
    </Dialog>
  </>;
}

/** Forms retain edits across rejected writes; secrets are held only in this mounted route. */
export function GovernanceForm({ id, title, kind, initial, disabled, pending, failure, onSave, onSaved, confirm, resetOnSuccess = false }: {
  id: string; title: string; kind: FormKind; initial: GovernanceFields; disabled: boolean; pending: boolean;
  failure?: ApiError | undefined; onSave: (values: GovernanceFields) => Promise<string | undefined>;
  onSaved?: (id: string) => void; confirm?: string; resetOnSuccess?: boolean;
}) {
  const { t } = useTranslation("governance");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const errors = [...new Set([...invalid, ...planningFieldErrors(failure, Object.keys(initial))])];

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
    const issues = invalidGovernanceFields(kind, draft.value);
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

  return <form aria-label={title} noValidate className="grid min-w-0 gap-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <h2 className="text-2xl font-medium">{title}</h2>
    <ValidationSummary items={errors.map((field) => ({ fieldId: `${id}-${field}`, message: t("invalidField", { field: t(`fields.${field}`) }) }))} />
    <fieldset disabled={disabled || confirming} className="grid min-w-0 gap-5 md:grid-cols-2">
      {Object.keys(initial).map((field) => {
        const props = {
          id: `${id}-${field}`, label: t(`fields.${field}`), value: draft.value[field] ?? "", required: kind !== "auditFilters",
          error: errors.includes(field) ? t("invalidField", { field: t(`fields.${field}`) }) : undefined,
          onChange: (event: { target: { value: string } }) => {
            draft.update({ ...draft.value, [field]: event.target.value });
            setInvalid((previous) => previous.filter((value) => value !== field));
          },
        };
        if (field === "role" || field === "action") {
          return <Select key={field} {...props}>
            {field === "action" && <option value="">{t("all")}</option>}
            {(field === "role" ? [0, 1] : [0, 1, 2]).map((value) => <option key={value} value={value}>{t(`${field}.${value}`)}</option>)}
          </Select>;
        }
        if (field === "content") {
          return <div className="md:col-span-2" key={field}><Textarea {...props} dir="auto" maxLength={100000} rows={12} hint={t("legalHint")} /></div>;
        }
        const secret = field.toLowerCase().includes("password");
        const date = ["effectiveDate", "dateFrom", "dateTo"].includes(field);
        const maxLength = field === "name" ? 100 : field === "title" ? 300 : field === "email" ? 254 : field === "phone" ? 11 : field === "entityType" ? 128 : date ? 40 : undefined;
        return <Input key={field} {...props} type={secret ? "password" : field === "email" ? "email" : field === "phone" ? "tel" : "text"}
          dir={secret || date || ["versionNumber", "userId", "email", "phone"].includes(field) ? "ltr" : "auto"} maxLength={maxLength}
          autoComplete={secret ? field === "currentPassword" ? "current-password" : "new-password" : "off"}
          inputMode={field === "versionNumber" ? "numeric" : undefined} hint={date ? t("dateHint") : undefined} data-private={secret || kind.includes("Staff") || undefined} />;
      })}
    </fieldset>
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={disabled || confirming} pending={pending}>{t(kind === "auditFilters" ? "apply" : "save")}</Button>
      <Button variant="secondary" disabled={disabled || confirming} onClick={() => { draft.reset(); setInvalid([]); }}>{t("reset")}</Button>
    </div>
    <Dialog open={confirming} title={title} description={confirm ?? ""} pending={pending} onClose={() => setConfirming(false)}>
      <div className="flex flex-wrap gap-3">
        <Button disabled={disabled} pending={pending} onClick={() => void commit()}>{t("confirm")}</Button>
        <Button variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>{t("cancel")}</Button>
      </div>
    </Dialog>
  </form>;
}
