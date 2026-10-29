import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTemplates } from "../../Context/TemplatesContext";
import { useEditorDraft } from "../../Planning/editorDraft";
import { moveRows, ordered } from "../../Planning/policy";
import type { StageTemplateDto } from "../../Types/contracts";
import { SourcePicker } from "./SourcePicker";
import type { SourceChoice } from "./SourcePicker";
import { ConfirmButton, MoveControls } from "./Shared";
import { Button } from "../Button";
import { Alert } from "../Feedback";
import { DataTable } from "../DataTable";
import { useLocale } from "../../Hooks/useLocale";
import { formatNumber } from "../../i18n/format";

/** Assignment changes are a full replacement draft; saving never creates plan entities. */
export function TemplateAssignments({ source, disabled }: { source: StageTemplateDto; disabled: boolean }) {
  const { t } = useTranslation("timePlans");
  const { locale } = useLocale();
  const { scope, run, action } = useTemplates();
  const draft = useEditorDraft(
    `assign-${source.id}`,
    ordered(source.items).map((row) => ({ id: row.itemTemplateId, name: row.name, isActive: row.isActive })),
  );
  const [choice, setChoice] = useState<SourceChoice | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [moved, setMoved] = useState<{ name: string; position: number }>();

  function add() {
    if (!choice) {
      return;
    }
    if (draft.value.some((row) => row.id === choice.id)) {
      setDuplicate(true);
      return;
    }
    if (draft.value.length >= 100) {
      return;
    }
    draft.update([...draft.value, { id: choice.id, name: choice.name, isActive: choice.isActive ?? true }]);
    setChoice(null);
    setDuplicate(false);
  }

  async function save() {
    const result = await run("assign", {
      kind: "assign",
      items: draft.value.map((row, index) => ({ itemTemplateId: row.id, sortOrder: index + 1 })),
    });
    if (result) {
      draft.accept();
    }
    return result;
  }

  return (
    <section className="grid min-w-0 gap-5" aria-label={t("assignments")}>
      <h3 className="text-2xl font-medium">{t("assignments")}</h3>
      <p>{t("assignmentHint")}</p>
      <SourcePicker
        kind="item"
        scope={scope}
        value={choice?.id ?? ""}
        selectedName={choice?.name}
        disabled={disabled}
        onChange={(row) => {
          setChoice(row);
          setDuplicate(false);
        }}
      />
      <Button variant="secondary" disabled={disabled || !choice || draft.value.length >= 100} onClick={add}>
        {t("addAssignment")}
      </Button>
      {duplicate && <Alert tone="error">{t("duplicateAssignment")}</Alert>}
      {draft.value.length >= 100 && <p>{t("assignmentLimit")}</p>}
      <p role="status" className="sr-only">
        {moved ? t("moved", { name: moved.name, position: formatNumber(moved.position, locale) }) : ""}
      </p>
      <DataTable
        caption={t("assignments")}
        scrollLabel={t("assignments")}
        rows={draft.value}
        rowKey={(row) => row.id}
        columns={[
          {
            id: "name",
            header: t("fields.name"),
            render: (row) => (
              <span dir="auto" className="whitespace-normal break-words">
                {row.name}
              </span>
            ),
          },
          { id: "active", header: t("activeState"), render: (row) => t(row.isActive ? "active" : "inactive") },
          {
            id: "order",
            header: t("order"),
            render: (row) => (
              <MoveControls
                name={row.name}
                index={draft.value.indexOf(row)}
                count={draft.value.length}
                disabled={disabled}
                onMove={(direction) => {
                  const index = draft.value.indexOf(row);
                  draft.update(moveRows(draft.value, index, direction));
                  setMoved({ name: row.name, position: index + direction + 1 });
                }}
              />
            ),
          },
          {
            id: "remove",
            header: t("remove"),
            render: (row) => (
              <Button
                variant="secondary"
                disabled={disabled}
                aria-label={t("removeName", { name: row.name })}
                onClick={() => draft.update(draft.value.filter((item) => item.id !== row.id))}
              >
                {t("remove")}
              </Button>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <ConfirmButton
          title={t("saveAssignments")}
          description={t("replaceAssignments")}
          disabled={disabled}
          pending={action.pending}
          onConfirm={save}
        >
          {t("saveAssignments")}
        </ConfirmButton>
        <Button variant="secondary" disabled={disabled} onClick={draft.reset}>
          {t("reset")}
        </Button>
      </div>
    </section>
  );
}
