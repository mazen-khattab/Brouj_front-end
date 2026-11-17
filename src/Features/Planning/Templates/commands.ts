import * as templates from "../../../Services/Templates";
import { ApiError } from "../../../Types/failures";
import { assertCompleteOrdering } from "../Shared/ordering";
import type { StageTemplateDto, ItemTemplateDto, StageTemplateItemInput } from "../../../Types/contracts";

export type TemplateKind = "stage" | "item";
export type TemplateRecord = StageTemplateDto | ItemTemplateDto;
export type TemplateCommand =
  | { kind: "create" | "update"; input: { name: string; code: string } }
  | { kind: "active"; isActive: boolean }
  | { kind: "delete" }
  | { kind: "assign"; items: StageTemplateItemInput[] };

export async function executeTemplate(kind: TemplateKind, command: TemplateCommand, detail: TemplateRecord | null, signal: AbortSignal) {
  if (command.kind === "create" || command.kind === "update") {
    const body = { name: command.input.name, code: command.input.code };
    if (command.kind === "create") {
      return kind === "stage" ? templates.createStageTemplate({ body }, { signal }) : templates.createItemTemplate({ body }, { signal });
    }
    if (!detail) {
      throw new ApiError("transport", { status: 404 });
    }
    return kind === "stage"
      ? templates.updateStageTemplate({ id: detail.id, body }, { signal })
      : templates.updateItemTemplate({ id: detail.id, body }, { signal });
  }
  if (!detail) {
    throw new ApiError("transport", { status: 404 });
  }
  if (command.kind === "delete") {
    return kind === "stage"
      ? templates.deleteStageTemplate({ id: detail.id }, { signal })
      : templates.deleteItemTemplate({ id: detail.id }, { signal });
  }
  if (command.kind === "active") {
    return kind === "stage"
      ? templates.setStageTemplateActive({ id: detail.id, body: { isActive: command.isActive } }, { signal })
      : templates.setItemTemplateActive({ id: detail.id, body: { isActive: command.isActive } }, { signal });
  }
  if (command.kind !== "assign") {
    throw new ApiError("transport", { status: 400 });
  }
  const ids = command.items.map((row) => row.itemTemplateId);
  if (kind !== "stage" || ids.length > 100 || new Set(ids).size !== ids.length) {
    throw new ApiError("transport", { status: 400 });
  }
  assertCompleteOrdering(
    ids.map((id) => ({ id })),
    command.items.map((row) => ({ id: row.itemTemplateId, sortOrder: row.sortOrder })),
  );
  return templates.setStageTemplateItems(
    { id: detail.id, body: { items: command.items.map(({ itemTemplateId, sortOrder }) => ({ itemTemplateId, sortOrder })) } },
    { signal },
  );
}
