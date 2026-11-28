import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { operationsPanel as planningPanel } from "../../../Components/panels";
import { EditorGuardProvider } from "../../../Forms/EditorGuard";
import { useEditorGuard } from "../../../Forms/editorDraft";
import { routePaths } from "../../../Router/routePaths";
import { ConfirmButton, PlanningFeedback, PlanningRead } from "../Shared/Feedback";
import { StageWorkspace } from "../Stages/StageWorkspace";
import { TimePlanForm } from "./TimePlanForm";
import { useTimePlan } from "./TimePlanContext";
import { planFrom, planInput } from "./mapping";

function Workspace() {
  const { t } = useTranslation("timePlans");
  const { snapshot, read, action, lastAction, run } = useTimePlan();
  const { epoch } = useEditorGuard();
  const [planReset, setPlanReset] = useState(0);
  const plan = snapshot?.plan;
  const disabled = action.pending || action.blocked || read.result.status !== "success";

  return (
    <div className="grid min-w-0 gap-7">
      <PlanningRead result={read.result} reload={read.reload} retained={Boolean(snapshot)} />
      <PlanningFeedback action={action} />
      {snapshot && (
        <>
          <section className={planningPanel}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 dir="auto" className="break-words text-3xl font-medium">
                {snapshot.project.name}
              </h2>
              <Button variant="secondary" disabled={action.pending} onClick={() => void read.reload().catch(() => {})}>
                {t("refresh")}
              </Button>
            </div>
            <Link className="underline" to={routePaths.admin.timePlans}>
              {t("changeProject")}
            </Link>
            {plan && (
              <Link className="underline" to={routePaths.timePlan(snapshot.project.id)}>
                {t("viewMemberPlan")}
              </Link>
            )}
            {!plan && <p>{t("noPlan")}</p>}
            <TimePlanForm
              key={`plan:${planReset}:${epoch}`}
              id="plan"
              title={t(plan ? "editPlan" : "createPlan")}
              initial={planFrom(plan)}
              disabled={disabled}
              pending={action.pending && lastAction === "plan"}
              failure={lastAction === "plan" ? action.failure : undefined}
              onSave={(value) => run("plan", { kind: plan ? "updatePlan" : "createPlan", input: planInput(value) })}
            />
            {plan && (
              <ConfirmButton
                title={t("deletePlan")}
                description={t("deletePlanDescription")}
                disabled={disabled}
                pending={action.pending}
                onConfirm={async () => {
                  const result = await run("delete-plan", { kind: "deletePlan" });
                  // An acknowledged deletion discards this plan's draft. A create conflict keeps it for review.
                  if (result) {
                    setPlanReset((value) => value + 1);
                  }
                  return result;
                }}
              >
                {t("deletePlan")}
              </ConfirmButton>
            )}
          </section>
          {plan && <StageWorkspace key={plan.id} stages={plan.stages} disabled={disabled} />}
        </>
      )}
    </div>
  );
}

export default function TimePlanWorkspace() {
  const { action } = useTimePlan();
  return (
    <EditorGuardProvider pending={action.pending}>
      <Workspace />
    </EditorGuardProvider>
  );
}
