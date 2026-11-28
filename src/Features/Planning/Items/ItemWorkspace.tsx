import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { DataTable } from "../../../Components/DataTable";
import { operationsPanel as planningPanel } from "../../../Components/panels";
import { useEditorGuard } from "../../../Forms/editorDraft";
import { useLocale } from "../../../Hooks/useLocale";
import { formatDateTime } from "../../../i18n/format";
import type { PlanStageItemDto, TimePlanStageDto } from "../../../Types/contracts";
import { useTimePlan } from "../Plans/TimePlanContext";
import { ConfirmButton, MoveControls } from "../Shared/Feedback";
import { moveRows, ordered, orderingInput } from "../Shared/ordering";
import { ItemImages } from "./ItemImages";
import { TimePlanItemForm } from "./TimePlanItemForm";
import { TimePlanItemStatusForm } from "./TimePlanItemStatusForm";
import { itemFrom, itemInput, itemStatusFrom, itemStatusInput } from "./mapping";

function ItemDetailsForm({ stageId, item, disabled }: {
  stageId: string;
  item?: PlanStageItemDto;
  disabled: boolean;
}) {
  const { t } = useTranslation("timePlans");
  const { action, lastAction, run } = useTimePlan();
  const { epoch } = useEditorGuard();
  const id = item ? `item-${item.id}` : "add-item";
  const label = item ? id : `add-item:${stageId}`;
  return (
    <TimePlanItemForm
      key={`${label}:${epoch}`}
      id={id}
      title={t(item ? "editItem" : "addItem")}
      initial={itemFrom(item)}
      completed={item?.status === 2}
      disabled={disabled}
      pending={action.pending && lastAction === label}
      failure={lastAction === label ? action.failure : undefined}
      onSave={(value) => {
        const input = itemInput(value);
        return item
          ? run(label, { kind: "updateItem", stageId, itemId: item.id, input })
          : run(label, { kind: "addItem", stageId, input });
      }}
    />
  );
}

function ItemEditor({ stageId, item, disabled }: { stageId: string; item: PlanStageItemDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { action, lastAction, run } = useTimePlan();
  const { epoch } = useEditorGuard();
  const statusLabel = `item-status:${item.id}`;
  return (
    <section className={planningPanel} aria-label={t("selectedItem")}>
      <h2 dir="auto" className="break-words text-2xl font-medium">{item.name}</h2>
      <ItemDetailsForm stageId={stageId} item={item} disabled={disabled} />
      <p>{t("statusHint")}</p>
      <TimePlanItemStatusForm
        key={`${statusLabel}:${epoch}`}
        id="item-status"
        title={t("changeStatus")}
        initial={itemStatusFrom(item)}
        disabled={disabled}
        pending={action.pending && lastAction === statusLabel}
        failure={lastAction === statusLabel ? action.failure : undefined}
        onSave={(value) =>
          run(statusLabel, { kind: "statusItem", stageId, itemId: item.id, input: itemStatusInput(value) })
        }
      />
      <ConfirmButton
        title={t("deleteItem")}
        description={t("deleteItemDescription")}
        disabled={disabled}
        pending={action.pending}
        onConfirm={() => run("delete-item", { kind: "deleteItem", stageId, itemId: item.id })}
      >
        {t("deleteItem")}
      </ConfirmButton>
      <ItemImages stageId={stageId} item={item} disabled={disabled} />
    </section>
  );
}

export function ItemWorkspace({ stage, disabled, onMoved }: {
  stage: TimePlanStageDto;
  disabled: boolean;
  onMoved: (row: { name: string; position: number }) => void;
}) {
  const { t } = useTranslation("timePlans");
  const { locale } = useLocale();
  const { run } = useTimePlan();
  const guard = useEditorGuard();
  const [selectedId, setSelectedId] = useState<string>();
  const items = ordered(stage.items);
  const item = items.find((row) => row.id === selectedId);
  if (selectedId && !item) {
    setSelectedId(undefined);
  }

  async function move(row: PlanStageItemDto, direction: -1 | 1) {
    const index = items.indexOf(row);
    const next = orderingInput(moveRows(items, index, direction));
    if (await run("order-items", { kind: "orderItems", stageId: stage.id, items: next })) {
      onMoved({ name: row.name, position: index + direction + 1 });
    }
  }

  return (
    <>
      <section className={planningPanel} aria-label={t("items")}>
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
                  onClick={() => {
                    if (item?.id !== row.id) guard.transition(() => setSelectedId(row.id));
                  }}
                >
                  <span dir="auto" className="whitespace-normal break-words">{row.name}</span>
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
                  onMove={(direction) => void move(row, direction)}
                />
              ),
            },
          ]}
        />
        <details>
          <summary className="cursor-pointer text-xl font-medium">{t("addItem")}</summary>
          <div className="pt-5">
            <ItemDetailsForm stageId={stage.id} disabled={disabled} />
          </div>
        </details>
      </section>
      {item && <ItemEditor key={item.id} stageId={stage.id} item={item} disabled={disabled} />}
    </>
  );
}
