import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../Components/Button";
import { DataTable, type TableColumn } from "../../../Components/DataTable";
import { operationsPanel as planningPanel } from "../../../Components/panels";
import { useEditorGuard } from "../../../Forms/editorDraft";
import { useLocale } from "../../../Hooks/useLocale";
import { formatNumber } from "../../../i18n/format";
import type { TimePlanStageDto } from "../../../Types/contracts";
import { ItemWorkspace } from "../Items/ItemWorkspace";
import { useTimePlan } from "../Plans/TimePlanContext";
import { MoveControls } from "../Shared/Feedback";
import { moveRows, ordered, orderingInput } from "../Shared/ordering";
import { StageEditor, stageEditorId } from "./StageEditor";
import { stageFields } from "./fields";

type StageSelection = { mode: "create" } | { mode: "edit"; id: string };

export function StageWorkspace({ stages: source, disabled }: { stages: readonly TimePlanStageDto[]; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { locale } = useLocale();
  const { run } = useTimePlan();
  const guard = useEditorGuard();
  const addButton = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<StageSelection>();
  const [announcement, setAnnouncement] = useState<{ name: string; position: number }>();
  const stages = ordered(source);
  const stage = selection?.mode === "edit" ? stages.find((row) => row.id === selection.id) : undefined;
  const creating = selection?.mode === "create";
  const editorOpen = creating || Boolean(stage);

  if (selection?.mode === "edit" && !stage) {
    setSelection(undefined);
  }

  async function move(row: TimePlanStageDto, direction: -1 | 1) {
    const index = stages.indexOf(row);
    const items = orderingInput(moveRows(stages, index, direction));
    if (await run("order-stages", { kind: "orderStages", items })) {
      setAnnouncement({ name: row.name, position: index + direction + 1 });
    }
  }

  const columns = stageFields.flatMap<TableColumn<TimePlanStageDto>>(({ key, label, cell }) => {
    if (!cell) return [];
    return [{
      id: key,
      header: label(t),
      render: (row) => key === "name" ? (
        <Button
          variant="secondary"
          disabled={disabled}
          aria-pressed={stage?.id === row.id}
          aria-controls={editorOpen ? stageEditorId : undefined}
          onClick={() => {
            if (stage?.id !== row.id) guard.transition(() => setSelection({ mode: "edit", id: row.id }));
          }}
        >
          {cell(row, locale, t)}
        </Button>
      ) : cell(row, locale, t),
    }];
  });
  columns.push({
    id: "order",
    header: t("order"),
    render: (row) => (
      <MoveControls
        name={row.name}
        index={stages.indexOf(row)}
        count={stages.length}
        disabled={disabled || stages.length > 1000}
        onMove={(direction) => void move(row, direction)}
      />
    ),
  });

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement ? t("moved", { name: announcement.name, position: formatNumber(announcement.position, locale) }) : ""}
      </p>
      <section className={planningPanel} aria-label={t("stages")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="break-words text-2xl font-medium">{t("stages")}</h2>
          <Button
            ref={addButton}
            disabled={disabled}
            aria-pressed={creating}
            aria-controls={editorOpen ? stageEditorId : undefined}
            onClick={() => {
              if (!creating) guard.transition(() => setSelection({ mode: "create" }));
            }}
          >
            {t("addStage")}
          </Button>
        </div>
        <DataTable caption={t("stages")} scrollLabel={t("stages")} rows={stages} rowKey={(row) => row.id} columns={columns} />
      </section>
      {!editorOpen && <p>{t("chooseStage")}</p>}
      {editorOpen && (
        <StageEditor
          key={stage ? `editor:${stage.id}` : "create"}
          stage={stage}
          disabled={disabled}
          onCancel={() => guard.transition(() => {
            setSelection(undefined);
            addButton.current?.focus();
          })}
        />
      )}
      {stage && <ItemWorkspace key={`items:${stage.id}`} stage={stage} disabled={disabled} onMoved={setAnnouncement} />}
    </>
  );
}
