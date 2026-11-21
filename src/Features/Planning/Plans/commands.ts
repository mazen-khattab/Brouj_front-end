import * as plans from "../../../Services/TimePlans";
import { ApiError } from "../../../Types/failures";
import { assertCompleteOrdering } from "../Shared/ordering";
import { approvedPlan } from "./mapping";
import { approvedItem } from "../Items/mapping";
import { approvedStageDraft, approvedStageUpdate } from "../Stages/mapping";
import type {
  TimePlanDto,
  TimePlanInput,
  StageUpdateInput,
  PlanStageItemInput,
  StageDraftInput,
  ReorderItemInput,
  ChangePlanStageItemStatusRequest,
} from "../../../Types/contracts";

export type PlanCommand =
  | { kind: "createPlan" | "updatePlan"; input: TimePlanInput }
  | { kind: "deletePlan" }
  | { kind: "addStage"; input: StageDraftInput }
  | { kind: "updateStage"; stageId: string; input: StageUpdateInput }
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
      const body = approvedStageDraft(command.input);
      if (body.stageTemplateId) {
        const { stageTemplateId, name, deliveryDate, price, pricingDate, items } = body;
        return plans.addStageFromTemplate({ timePlanId: plan.id, body: { stageTemplateId, name, deliveryDate, price, pricingDate, items } }, { signal });
      }
      return plans.addTimePlanStage({ timePlanId: plan.id, body }, { signal });
    }
    case "updateStage":
      return plans.updateTimePlanStage({ timePlanId: plan.id, id: stage!.id, body: approvedStageUpdate(command.input) }, { signal });
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

