import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTimePlan } from "../../Context/TimePlanContext";
import { EditorGuardProvider } from "../../Planning/EditorGuard";
import { useEditorGuard } from "../../Planning/editorDraft";
import { itemInput, moveRows, ordered, orderingInput, planInput } from "../../Planning/policy";
import type { PlanStageItemDto, TimePlanStageDto } from "../../Types/contracts";
import { routePaths } from "../../Router/routePaths";
import { useLocale } from "../../Hooks/useLocale";
import { formatDateTime, formatNumber } from "../../i18n/format";
import { Button } from "../../Components/Button";
import { DataTable } from "../../Components/DataTable";
import { ConfirmButton, MoveControls, PlanningFeedback, PlanningForm, PlanningRead } from "../../Components/Planning/Shared";
import { planningPanel } from "../../Components/Planning/classes";
import { StageComposer } from "../../Components/Planning/StageComposer";
import { ItemImages } from "../../Components/Planning/ItemImages";

function ItemEditor({ stage, item, disabled }: { stage: TimePlanStageDto; item: PlanStageItemDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { action, lastAction, run } = useTimePlan();
  const { epoch } = useEditorGuard();
  const label = `item-${item.id}`;
  return (
    <section className={planningPanel} aria-label={t("selectedItem")}>
      <h2 dir="auto" className="break-words text-2xl font-medium">
        {item.name}
      </h2>
      <PlanningForm
        key={`${label}:${epoch}`}
        id={label}
        title={t("editItem")}
        initial={{ name: item.name, dueDate: item.dueDate, confirmedDate: item.confirmedDate ?? "" }}
        completed={item.status === 2}
        disabled={disabled}
        pending={action.pending && lastAction === label}
        failure={lastAction === label ? action.failure : undefined}
        onSave={(value) => run(label, { kind: "updateItem", stageId: stage.id, itemId: item.id, input: itemInput(value) })}
      />
      <p>{t("statusHint")}</p>
      <PlanningForm
        key={`status:${item.id}:${epoch}`}
        id="item-status"
        title={t("changeStatus")}
        initial={{ status: String(item.status), confirmedDate: item.confirmedDate ?? "" }}
        disabled={disabled}
        pending={action.pending && lastAction === "item-status"}
        failure={lastAction === "item-status" ? action.failure : undefined}
        onSave={(value) =>
          run("item-status", {
            kind: "statusItem",
            stageId: stage.id,
            itemId: item.id,
            input: { status: Number(value.status) as 0 | 1 | 2, confirmedDate: value.confirmedDate || null },
          })
        }
      />
      <ConfirmButton
        title={t("deleteItem")}
        description={t("deleteItemDescription")}
        disabled={disabled}
        pending={action.pending}
        onConfirm={() => run("delete-item", { kind: "deleteItem", stageId: stage.id, itemId: item.id })}
      >
        {t("deleteItem")}
      </ConfirmButton>
      <ItemImages key={item.id} stageId={stage.id} item={item} disabled={disabled} />
    </section>
  );
}

function Workspace() {
  const { t } = useTranslation("timePlans");
  const { locale } = useLocale();
  const { snapshot, read, action, lastAction, run } = useTimePlan();
  const guard = useEditorGuard();
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [planReset, setPlanReset] = useState(0);
  const [announcement, setAnnouncement] = useState<{ name: string; position: number }>();
  const plan = snapshot?.plan;
  const stages = ordered(plan?.stages ?? []);
  const stage = stages.find((row) => row.id === selectedStage);
  const items = ordered(stage?.items ?? []);
  const item = items.find((row) => row.id === selectedItem);
  const disabled = action.pending || action.blocked || read.result.status !== "success";

  async function move(kind: "stage" | "item", index: number, direction: -1 | 1) {
    const rows: { id: string; name: string }[] = kind === "stage" ? stages : items;
    const row = rows[index];
    if (!row) {
      return;
    }
    const next = orderingInput(moveRows(rows, index, direction));
    const result =
      kind === "stage"
        ? await run("order-stages", { kind: "orderStages", items: next })
        : stage
          ? await run("order-items", { kind: "orderItems", stageId: stage.id, items: next })
          : undefined;
    if (result) {
      setAnnouncement({ name: row.name, position: index + direction + 1 });
    }
  }

  return (
    <div className="grid min-w-0 gap-7">
      <PlanningRead result={read.result} reload={read.reload} retained={Boolean(snapshot)} />
      <PlanningFeedback action={action} />
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement ? t("moved", { name: announcement.name, position: formatNumber(announcement.position, locale) }) : ""}
      </p>
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
            <PlanningForm
              key={`plan:${planReset}:${guard.epoch}`}
              id="plan"
              title={t(plan ? "editPlan" : "createPlan")}
              initial={{ name: plan?.name ?? "", deliveryDate: plan?.deliveryDate ?? "" }}
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
          {plan && (
            <>
              <section className={planningPanel} aria-label={t("stages")}>
                <h2 className="break-words text-2xl font-medium">{t("stages")}</h2>
                <DataTable
                  caption={t("stages")}
                  scrollLabel={t("stages")}
                  rows={stages}
                  rowKey={(row) => row.id}
                  columns={[
                    {
                      id: "name",
                      header: t("fields.name"),
                      render: (row) => (
                        <Button
                          variant="secondary"
                          disabled={disabled}
                          aria-pressed={stage?.id === row.id}
                          onClick={() =>
                            guard.transition(() => {
                              setSelectedStage(row.id);
                              setSelectedItem("");
                            })
                          }
                        >
                          <span dir="auto" className="whitespace-normal break-words">
                            {row.name}
                          </span>
                        </Button>
                      ),
                    },
                    { id: "delivery", header: t("fields.deliveryDate"), render: (row) => <bdi>{formatDateTime(row.deliveryDate, locale)}</bdi> },
                    {
                      id: "order",
                      header: t("order"),
                      render: (row) => (
                        <MoveControls
                          name={row.name}
                          index={stages.indexOf(row)}
                          count={stages.length}
                          disabled={disabled || stages.length > 1000}
                          onMove={(direction) => void move("stage", stages.indexOf(row), direction)}
                        />
                      ),
                    },
                  ]}
                />
              </section>
              <StageComposer disabled={disabled} />
              {!stage && <p>{t("chooseStage")}</p>}
              {stage && (
                <section className={planningPanel} aria-label={t("selectedStage")}>
                  <h2 className="break-words text-2xl font-medium" dir="auto">
                    {stage.name}
                  </h2>
                  <PlanningForm
                    key={`${stage.id}:${guard.epoch}`}
                    id="stage"
                    title={t("editStage")}
                    initial={{ name: stage.name, deliveryDate: stage.deliveryDate }}
                    disabled={disabled}
                    pending={action.pending && lastAction === "stage"}
                    failure={lastAction === "stage" ? action.failure : undefined}
                    onSave={(value) => run("stage", { kind: "updateStage", stageId: stage.id, input: planInput(value) })}
                  />
                  <ConfirmButton
                    title={t("deleteStage")}
                    description={t("deleteStageDescription")}
                    disabled={disabled}
                    pending={action.pending}
                    onConfirm={() => run("delete-stage", { kind: "deleteStage", stageId: stage.id })}
                  >
                    {t("deleteStage")}
                  </ConfirmButton>
                  <DataTable
                    caption={t("items")}
                    scrollLabel={t("items")}
                    rows={items}
                    rowKey={(row) => row.id}
                    columns={[
                      {
                        id: "name",
                        header: t("fields.name"),
                        render: (row) => (
                          <Button
                            variant="secondary"
                            disabled={disabled}
                            aria-pressed={item?.id === row.id}
                            onClick={() => guard.transition(() => setSelectedItem(row.id))}
                          >
                            <span dir="auto" className="whitespace-normal break-words">
                              {row.name}
                            </span>
                          </Button>
                        ),
                      },
                      { id: "status", header: t("fields.status"), render: (row) => t(`itemStatus.${row.status}`, { ns: "account" }) },
                      { id: "due", header: t("fields.dueDate"), render: (row) => <bdi>{formatDateTime(row.dueDate, locale)}</bdi> },
                      {
                        id: "order",
                        header: t("order"),
                        render: (row) => (
                          <MoveControls
                            name={row.name}
                            index={items.indexOf(row)}
                            count={items.length}
                            disabled={disabled || items.length > 1000}
                            onMove={(direction) => void move("item", items.indexOf(row), direction)}
                          />
                        ),
                      },
                    ]}
                  />
                  <details>
                    <summary className="cursor-pointer text-xl font-medium">{t("addItem")}</summary>
                    <div className="pt-5">
                      <PlanningForm
                        key={`new:${stage.id}:${guard.epoch}`}
                        id="add-item"
                        title={t("addItem")}
                        initial={{ name: "", dueDate: "", confirmedDate: "" }}
                        disabled={disabled}
                        pending={action.pending && lastAction === "add-item"}
                        failure={lastAction === "add-item" ? action.failure : undefined}
                        onSave={(value) => run("add-item", { kind: "addItem", stageId: stage.id, input: itemInput(value) })}
                      />
                    </div>
                  </details>
                </section>
              )}
              {stage && item && <ItemEditor key={item.id} stage={stage} item={item} disabled={disabled} />}
            </>
          )}
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
