import * as plans from "../Services/TimePlans";
import * as templates from "../Services/Templates";
import { ApiError } from "../Types/failures";
import { assertCompleteOrdering } from "./policy";
import type {
  TimePlanDto,
  TimePlanInput,
  PlanStageItemInput,
  StageDraftInput,
  ReorderItemInput,
  ChangePlanStageItemStatusRequest,
  StageTemplateDto,
  ItemTemplateDto,
  StageTemplateItemInput,
} from "../Types/contracts";

export type PlanCommand =
  | { kind: "createPlan" | "updatePlan"; input: TimePlanInput }
  | { kind: "deletePlan" }
  | { kind: "addStage"; input: StageDraftInput }
  | { kind: "updateStage"; stageId: string; input: TimePlanInput }
  | { kind: "deleteStage"; stageId: string }
  | { kind: "orderStages"; items: ReorderItemInput[] }
  | { kind: "addItem"; stageId: string; input: PlanStageItemInput }
  | { kind: "updateItem"; stageId: string; itemId: string; input: PlanStageItemInput }
  | { kind: "deleteItem"; stageId: string; itemId: string }
  | { kind: "statusItem"; stageId: string; itemId: string; input: ChangePlanStageItemStatusRequest }
  | { kind: "orderItems"; stageId: string; items: ReorderItemInput[] }
  | { kind: "addImage"; stageId: string; itemId: string; file: File; description: string | null }
  | { kind: "updateImage"; stageId: string; itemId: string; imageId: string; description: string | null }
  | { kind: "deleteImage"; stageId: string; itemId: string; imageId: string }
  | { kind: "orderImages"; stageId: string; itemId: string; items: ReorderItemInput[] };

function approvedPlan(input: TimePlanInput): TimePlanInput {
  return { name: input.name, deliveryDate: input.deliveryDate };
}

function approvedItem(input: PlanStageItemInput): PlanStageItemInput {
  return { name: input.name, dueDate: input.dueDate, confirmedDate: input.confirmedDate };
}

/** Bind every parent from the loaded hierarchy, never from editable IDs or a previous project's selection. */
export async function executePlan(command: PlanCommand, projectId: string, plan: TimePlanDto | null, signal: AbortSignal) {
  if (command.kind === "createPlan") {
    return plans.createTimePlan({ projectId, body: { input: approvedPlan(command.input), stages: [] } }, { signal });
  }
  if (!plan || plan.projectId !== projectId) {
    throw new ApiError("transport", { status: 404 });
  }
  const stage = "stageId" in command ? plan.stages.find((row) => row.id === command.stageId) : undefined;
  if ("stageId" in command && !stage) {
    throw new ApiError("transport", { status: 404 });
  }
  const item = "itemId" in command ? stage?.items.find((row) => row.id === command.itemId) : undefined;
  if ("itemId" in command && !item) {
    throw new ApiError("transport", { status: 404 });
  }
  if ("imageId" in command && !item?.images.some((row) => row.id === command.imageId)) {
    throw new ApiError("transport", { status: 404 });
  }
  switch (command.kind) {
    case "updatePlan":
      return plans.updateTimePlan({ id: plan.id, body: approvedPlan(command.input) }, { signal });
    case "deletePlan":
      return plans.deleteTimePlan({ id: plan.id }, { signal });
    case "addStage": {
      const body: StageDraftInput = {
        stageTemplateId: command.input.stageTemplateId,
        name: command.input.name,
        deliveryDate: command.input.deliveryDate,
        items: command.input.items.map((row) => ({
          itemTemplateId: row.itemTemplateId,
          name: row.name,
          dueDate: row.dueDate,
          confirmedDate: row.confirmedDate,
        })),
      };
      return body.stageTemplateId
        ? plans.addStageFromTemplate({ timePlanId: plan.id, body }, { signal })
        : plans.addTimePlanStage({ timePlanId: plan.id, body }, { signal });
    }
    case "updateStage":
      return plans.updateTimePlanStage({ timePlanId: plan.id, id: stage!.id, body: approvedPlan(command.input) }, { signal });
    case "deleteStage":
      return plans.deleteTimePlanStage({ timePlanId: plan.id, id: stage!.id }, { signal });
    case "orderStages":
      assertCompleteOrdering(plan.stages, command.items);
      return plans.reorderTimePlanStages({ timePlanId: plan.id, body: { items: orderingInput(command.items) } }, { signal });
    case "addItem":
      return plans.addPlanStageItem({ stageId: stage!.id, body: approvedItem(command.input) }, { signal });
    case "updateItem":
      return plans.updatePlanStageItem({ stageId: stage!.id, id: item!.id, body: approvedItem(command.input) }, { signal });
    case "deleteItem":
      return plans.deletePlanStageItem({ stageId: stage!.id, id: item!.id }, { signal });
    case "statusItem":
      return plans.changePlanStageItemStatus(
        { stageId: stage!.id, id: item!.id, body: { status: command.input.status, confirmedDate: command.input.confirmedDate } },
        { signal },
      );
    case "orderItems":
      assertCompleteOrdering(stage!.items, command.items);
      return plans.reorderPlanStageItems({ stageId: stage!.id, body: { items: orderingInput(command.items) } }, { signal });
    case "addImage":
      return plans.addStageItemImage({ itemId: item!.id, body: { file: command.file, description: command.description } }, { signal });
    case "updateImage":
      return plans.updateStageItemImage({ itemId: item!.id, imageId: command.imageId, body: { description: command.description } }, { signal });
    case "deleteImage":
      return plans.deleteStageItemImage({ itemId: item!.id, imageId: command.imageId }, { signal });
    case "orderImages":
      assertCompleteOrdering(item!.images, command.items);
      return plans.reorderStageItemImages({ itemId: item!.id, body: { items: orderingInput(command.items) } }, { signal });
  }
}

function orderingInput(items: readonly ReorderItemInput[]) {
  return items.map(({ id, sortOrder }) => ({ id, sortOrder }));
}

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
