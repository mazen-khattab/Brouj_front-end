import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { ValidationSummary } from "../../../Components/Feedback";
import { replaceUnitPaymentPlan } from "../../../Services/Units";
import type { UnitDto, UnitPaymentInstallmentDto } from "../../../Types/contracts";
import { useUnitEditor } from "./EditorContext";
import { PaymentPlanEditor } from "./PaymentPlanEditor";
import { paymentPlanDraft, type PaymentPlanRow } from "./paymentPlan";
import { usePaymentPlanValidation } from "./usePaymentPlanValidation";

export function UnitPaymentPlan({ unit, refresh, readPending }: { unit: UnitDto; refresh: () => Promise<UnitDto>; readPending: boolean }) {
  const { t } = useTranslation("admin");
  const action = useUnitEditor();
  const formKey = `plan:unit:${unit.id}`;
  const [draft, setDraft] = useState<PaymentPlanRow[]>();
  const [submitted, setSubmitted] = useState(false);
  const baseline = paymentPlanDraft(unit.paymentPlan.filter((row): row is UnitPaymentInstallmentDto => "installmentNumber" in row));
  const rows = draft ?? baseline;
  const validation = usePaymentPlanValidation(rows, submitted);
  const disabled = action.pending || action.blocked || readPending;

  function change(next: PaymentPlanRow[]) {
    const dirty = JSON.stringify(next) !== JSON.stringify(baseline);
    setDraft(dirty ? next : undefined);
    action.markDirty(formKey, dirty);
  }

  async function submit() {
    setSubmitted(true);
    const { paymentPlan } = validation;
    if (!paymentPlan || disabled) return;
    const result = await action.run((signal) => replaceUnitPaymentPlan({ id: unit.id, body: { paymentPlan } }, { signal }), refresh);
    if (result) {
      action.markDirty(formKey, false);
      setDraft(undefined);
      setSubmitted(false);
    }
  }

  return (
    <form
      className="grid min-w-0 gap-4"
      aria-label={t("paymentPlan.title")}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ValidationSummary items={validation.summary} />
      <PaymentPlanEditor rows={rows} validation={validation} disabled={disabled} onChange={change} />
      <div>
        <Button type="submit" pending={action.pending} disabled={disabled}>
          {t("paymentPlan.save")}
        </Button>
      </div>
    </form>
  );
}
