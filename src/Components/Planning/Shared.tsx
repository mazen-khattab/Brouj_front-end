import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ErrorPanel, Loading, ValidationSummary } from "../Feedback";
import { Button } from "../Button";
import { Input, Select, Textarea } from "../Fields";
import { Dialog } from "../Dialog";
import type { CatalogueRead } from "../../Hooks/useCatalogueRead";
import type { StaffOperation } from "../../Hooks/useStaffOperation";
import { apiFailureMessage } from "../../i18n/apiFailures";
import { useEditorDraft } from "../../Planning/editorDraft";
import { invalidPlanningFields, planningFieldErrors } from "../../Planning/policy";
import type { Fields } from "../../Planning/policy";
import type { ApiError } from "../../Types/failures";

export function PlanningRead({
  result,
  reload,
  retained = false,
}: {
  result: CatalogueRead<unknown>;
  reload: () => Promise<unknown>;
  retained?: boolean;
}) {
  const { t } = useTranslation("timePlans");
  if (result.status === "loading") {
    return <Loading label={t(retained ? "refreshing" : "loading")} />;
  }
  if (result.status === "error") {
    return (
      <ErrorPanel
        title={t(result.failure.status === 404 ? "missing" : "loadFailed")}
        description={t(apiFailureMessage(result.failure).key, { ns: "errors" })}
        onRetry={() => void reload().catch(() => {})}
      />
    );
  }
  return null;
}

export function PlanningFeedback({ action }: { action: StaffOperation }) {
  const { t } = useTranslation("timePlans");
  return (
    <div className="grid gap-3" aria-live="polite">
      {action.succeeded && <Alert tone="success">{t("saved")}</Alert>}
      {action.failure && (
        <Alert tone="error">
          {action.uncertain
            ? t("uncertain")
            : action.failure.status === 409
              ? t("conflict")
              : t(apiFailureMessage(action.failure).key, { ns: "errors" })}
        </Alert>
      )}
      {action.blocked && (
        <Button variant="secondary" pending={action.pending} onClick={() => void action.check()}>
          {t("check")}
        </Button>
      )}
    </div>
  );
}

export function PlanningForm({
  id,
  title,
  initial,
  disabled,
  pending,
  onSave,
  onSaved,
  completed = false,
  failure,
  children,
}: {
  id: string;
  title: string;
  initial: Fields;
  disabled: boolean;
  pending: boolean;
  onSave: (value: Fields) => Promise<string | undefined>;
  onSaved?: (id: string) => void;
  completed?: boolean;
  failure?: ApiError | undefined;
  children?: ReactNode;
}) {
  const { t } = useTranslation("timePlans");
  const draft = useEditorDraft(id, initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const keys = Object.keys(initial);
  const errors = [...new Set([...invalid, ...planningFieldErrors(failure, keys)])];

  async function submit() {
    const issues = invalidPlanningFields(draft.value, completed);
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
    <form
      noValidate
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) {
          void submit();
        }
      }}
      className="grid min-w-0 gap-5"
    >
      <h3 className="text-xl font-medium">{title}</h3>
      <ValidationSummary items={errors.map((key) => ({ fieldId: `${id}-${key}`, message: t("invalidField", { field: t(`fields.${key}`) }) }))} />
      <fieldset disabled={disabled} className="grid min-w-0 gap-5 md:grid-cols-2">
        {keys.map((key) => {
          const props = {
            id: `${id}-${key}`,
            label: t(`fields.${key}`),
            value: draft.value[key] ?? "",
            error: errors.includes(key) ? t("invalidField", { field: t(`fields.${key}`) }) : undefined,
            onChange: (event: { target: { value: string } }) => {
              draft.update({ ...draft.value, [key]: event.target.value });
              setInvalid((previous) => previous.filter((field) => field !== key));
            },
          };
          if (key === "status") {
            return (
              <Select key={key} {...props}>
                {[0, 1, 2].map((status) => (
                  <option key={status} value={status}>
                    {t(`itemStatus.${status}`, { ns: "account" })}
                  </option>
                ))}
              </Select>
            );
          }
          if (key === "description") {
            return <Textarea key={key} {...props} maxLength={20000} />;
          }
          const date = key.endsWith("Date");
          return (
            <Input
              key={key}
              {...props}
              dir={date || key === "code" ? "ltr" : "auto"}
              maxLength={date ? 40 : key === "code" ? 64 : 100}
              required={key !== "confirmedDate" || completed || draft.value.status === "2"}
              hint={date ? t(key === "confirmedDate" ? "confirmedHint" : "dateHint") : undefined}
            />
          );
        })}
      </fieldset>
      {children}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={disabled} pending={pending} pendingLabel={t("working")}>
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            draft.reset();
            setInvalid([]);
          }}
        >
          {t("reset")}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmButton({
  title,
  description,
  disabled,
  pending,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  disabled: boolean;
  pending: boolean;
  onConfirm: () => Promise<unknown>;
  children: ReactNode;
}) {
  const { t } = useTranslation("timePlans");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} title={title} description={description} pending={pending} onClose={() => setOpen(false)}>
        <div className="flex flex-wrap gap-3">
          <Button
            pending={pending}
            disabled={disabled}
            onClick={() =>
              void onConfirm().then((result) => {
                if (result) {
                  setOpen(false);
                }
              })
            }
          >
            {t("confirm")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function MoveControls({
  name,
  index,
  count,
  disabled,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useTranslation("timePlans");
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" aria-label={t("moveUpName", { name })} disabled={disabled || index <= 0} onClick={() => onMove(-1)}>
        {t("moveUp")}
      </Button>
      <Button variant="secondary" aria-label={t("moveDownName", { name })} disabled={disabled || index >= count - 1} onClick={() => onMove(1)}>
        {t("moveDown")}
      </Button>
    </div>
  );
}
