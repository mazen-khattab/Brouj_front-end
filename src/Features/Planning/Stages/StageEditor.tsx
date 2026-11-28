import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTimePlan } from "../Plans/TimePlanContext";
import { useStaffRead } from "../../../Hooks/useStaffRead";
import { getStageTemplateById } from "../../../Services/Templates";
import { useEditorGuard } from "../../../Forms/editorDraft";
import { stageFrom, stageUpdateInput } from "./mapping";
import { TimePlanStageForm } from "./TimePlanStageForm";
import { ApplyStageTemplateForm } from "./ApplyStageTemplateForm";
import type { StageTemplateDto, TimePlanStageDto } from "../../../Types/contracts";
import { useAuth } from "../../../Hooks/useAuth";
import { sessionBoundary } from "../../../Security/sessionBoundary";
import { SourcePicker } from "../SourcePicker";
import type { SourceChoice } from "../SourcePicker";
import { ConfirmButton, PlanningRead } from "../Shared/Feedback";
import { operationsPanel as planningPanel } from "../../../Components/panels";
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
    if (lastAction === `template-stage:${id}` && failure?.status === 409 && !action.pending) {
      void reload().catch(() => {});
    }
  }, [id, lastAction, failure, action.pending, reload]);
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

export const stageEditorId = "time-plan-stage-editor";

function ManualStageForm({ stage, disabled }: { stage?: TimePlanStageDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { run, action, lastAction } = useTimePlan();
  const { epoch } = useEditorGuard();
  const [revision, setRevision] = useState(0);
  const label = stage ? `stage:${stage.id}` : "add-stage";

  return (
    <TimePlanStageForm
      key={`${label}:${epoch}:${revision}`}
      id={stage ? "stage" : "add-stage"}
      title={t(stage ? "editStage" : "manualStage")}
      mode={stage ? "edit" : "create"}
      initial={stageFrom(stage)}
      disabled={disabled}
      pending={action.pending && lastAction === label}
      failure={lastAction === label ? action.failure : undefined}
      onSave={(value) => {
        const input = stageUpdateInput(value);
        return stage
          ? run(label, { kind: "updateStage", stageId: stage.id, input })
          : run(label, { kind: "addStage", input: { stageTemplateId: null, ...input, items: [] } });
      }}
      onSaved={() => setRevision((value) => value + 1)}
    />
  );
}

function CreateStageEditor({ disabled }: { disabled: boolean }) {
  const { scope } = useTimePlan();
  const guard = useEditorGuard();
  const [source, setSource] = useState<SourceChoice | null>(null);
  return (
    <>
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
        <ManualStageForm disabled={disabled} />
      )}
    </>
  );
}

export function StageEditor({ stage, disabled, onCancel }: {
  stage: TimePlanStageDto | undefined;
  disabled: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation("timePlans");
  const { action, run } = useTimePlan();
  const editor = useRef<HTMLElement>(null);
  useEffect(() => editor.current?.focus(), []);

  return (
    <section ref={editor} id={stageEditorId} className={planningPanel} tabIndex={-1} aria-label={t(stage ? "selectedStage" : "addStage")}>
      {stage ? (
        <>
          <h2 className="break-words text-2xl font-medium" dir="auto">{stage.name}</h2>
          <ManualStageForm stage={stage} disabled={disabled} />
          <ConfirmButton
            title={t("deleteStage")}
            description={t("deleteStageDescription")}
            disabled={disabled}
            pending={action.pending}
            onConfirm={() => run("delete-stage", { kind: "deleteStage", stageId: stage.id })}
          >
            {t("deleteStage")}
          </ConfirmButton>
        </>
      ) : (
        <>
          <CreateStageEditor disabled={disabled} />
          <div><Button variant="secondary" disabled={disabled} onClick={onCancel}>{t("cancel")}</Button></div>
        </>
      )}
    </section>
  );
}
