import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTimePlan } from "../Plans/TimePlanContext";
import { useStaffRead } from "../../../Hooks/useStaffRead";
import { getStageTemplateById } from "../../../Services/Templates";
import { useEditorGuard } from "../Shared/editorDraft";
import { stageFrom, stageInput } from "./mapping";
import { TimePlanStageForm } from "./TimePlanStageForm";
import { ApplyStageTemplateForm } from "./ApplyStageTemplateForm";
import type { StageTemplateDto } from "../../../Types/contracts";
import { useAuth } from "../../../Hooks/useAuth";
import { sessionBoundary } from "../../../Security/sessionBoundary";
import { SourcePicker } from "../SourcePicker";
import type { SourceChoice } from "../SourcePicker";
import { PlanningRead } from "../Shared/Feedback";
import { planningPanel } from "../Shared/classes";
import { Button } from "../../../Components/Button";

function SelectedTemplate({ id, disabled }: { id: string; disabled: boolean }) {
  const { scope, action, lastAction } = useTimePlan();
  const { generation } = useAuth();
  const { t } = useTranslation("timePlans");
  const { epoch } = useEditorGuard();
  const [snapshot, setSnapshot] = useState<StageTemplateDto>();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await getStageTemplateById({ id }, { signal });
      if (!signal.aborted && (sessionBoundary.stamp()?.generation ?? generation) === generation) {
        setSnapshot(data);
      }
      return data;
    },
    [id, generation],
  );
  const read = useStaffRead(`${scope}:source:${id}`, load);
  const reload = read.reload;
  const failure = action.failure;
  useEffect(() => {
    // Recheck source eligibility after a rejected application while retaining date drafts by item ID.
    if (lastAction === "template-stage" && failure?.status === 409 && !action.pending) {
      void reload().catch(() => {});
    }
  }, [lastAction, failure, action.pending, reload]);
  return (
    <>
      <PlanningRead result={read.result} reload={read.reload} retained={Boolean(snapshot)} />
      <Button variant="secondary" disabled={disabled || read.result.status === "loading"} onClick={() => void read.reload().catch(() => {})}>
        {t("refreshSource")}
      </Button>
      {snapshot && <ApplyStageTemplateForm key={`${id}:${epoch}`} source={snapshot} disabled={disabled || read.result.status !== "success"} />}
    </>
  );
}

export function StageComposer({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { scope, run, action, lastAction } = useTimePlan();
  const guard = useEditorGuard();
  const [source, setSource] = useState<SourceChoice | null>(null);
  return (
    <details className={planningPanel}>
      <summary className="cursor-pointer text-xl font-medium">{t("addStage")}</summary>
      <div className="grid gap-6 pt-5">
        <SourcePicker
          kind="stage"
          scope={scope}
          activeOnly
          value={source?.id ?? ""}
          selectedName={source?.name}
          disabled={disabled}
          onChange={(row) => guard.transition(() => setSource(row))}
        />
        {source ? (
          <SelectedTemplate key={source.id} id={source.id} disabled={disabled} />
        ) : (
          <TimePlanStageForm
            key={`manual:${guard.epoch}`}
            id="add-stage"
            title={t("manualStage")}
            mode="create"
            initial={stageFrom()}
            disabled={disabled}
            pending={action.pending && lastAction === "add-stage"}
            failure={lastAction === "add-stage" ? action.failure : undefined}
            onSave={(value) => run("add-stage", { kind: "addStage", input: { stageTemplateId: null, ...stageInput(value), items: [] } })}
          />
        )}
      </div>
    </details>
  );
}
