import type { BrowserContext } from "@playwright/test";
import { routingServer } from "./routingFixtures";
import { sessionCors } from "./sessionFixtures";
import { catalogueIds, catalogueProject } from "./catalogueFixtures";
import type {
  ItemTemplateDto,
  StageTemplateDto,
  TimePlanDto,
  TimePlanStageDto,
  PlanStageItemDto,
  StageItemImageDto,
} from "../../src/Types/contracts";

export const planningIds = {
  project: catalogueIds.project,
  plan: "71000000-0000-4000-8000-000000000001",
  stage: "72000000-0000-4000-8000-000000000001",
  stage2: "72000000-0000-4000-8000-000000000002",
  item: "73000000-0000-4000-8000-000000000001",
  item2: "73000000-0000-4000-8000-000000000002",
  image: "74000000-0000-4000-8000-000000000001",
  image2: "74000000-0000-4000-8000-000000000002",
  stageTemplate: "75000000-0000-4000-8000-000000000001",
  emptyTemplate: "75000000-0000-4000-8000-000000000002",
  itemTemplate: "76000000-0000-4000-8000-000000000001",
  itemTemplate2: "76000000-0000-4000-8000-000000000002",
};
export const planningDate = "2026-12-01T09:00:00+02:00";
export const planningItem: PlanStageItemDto = {
  id: planningIds.item,
  name: "Foundation inspection",
  dueDate: planningDate,
  confirmedDate: null,
  status: 0,
  sortOrder: 1,
  images: [
    { id: planningIds.image, imagePath: "PRIVATE-STORAGE/one.webp", description: "First progress photo", sortOrder: 1 },
    { id: planningIds.image2, imagePath: "PRIVATE-STORAGE/two.webp", description: "Second progress photo", sortOrder: 2 },
  ],
};
export const planningPlan: TimePlanDto = {
  id: planningIds.plan,
  projectId: planningIds.project,
  name: "Project construction plan",
  deliveryDate: planningDate,
  stages: [
    {
      id: planningIds.stage,
      name: "Foundations",
      deliveryDate: planningDate,
      sortOrder: 1,
      items: [planningItem, { ...planningItem, id: planningIds.item2, name: "Concrete work", sortOrder: 2, images: [] }],
    },
    { id: planningIds.stage2, name: "Finishing", deliveryDate: planningDate, sortOrder: 2, items: [] },
  ],
};
export const planningTemplate: StageTemplateDto = {
  id: planningIds.stageTemplate,
  name: "Reusable construction stage",
  code: "STAGE-1",
  isActive: true,
  items: [
    { itemTemplateId: planningIds.itemTemplate, name: "Survey", code: "ITEM-1", isActive: true, sortOrder: 1 },
    { itemTemplateId: planningIds.itemTemplate2, name: "Approval", code: "ITEM-2", isActive: true, sortOrder: 2 },
  ],
};

/** Synthetic server state validates parent membership and full ordering instead of accepting any write. */
export async function planningServer(context: BrowserContext, actor: "admin" | "superAdmin" = "admin") {
  const session = await routingServer(context, actor);
  const state = {
    plan: structuredClone(planningPlan) as TimePlanDto | null,
    failNext: 0,
    readStatus: 0,
    projectMissing: false,
    delayWrite: 0,
    commitOnError: false,
    failReadAfterWrite: false,
    malformedId: false,
    staleOrder: false,
    extraTemplates: 0,
  };
  const stages = new Map<string, StageTemplateDto>([
    [planningIds.stageTemplate, structuredClone(planningTemplate)],
    [planningIds.emptyTemplate, { ...planningTemplate, id: planningIds.emptyTemplate, name: "Empty template", code: "EMPTY", items: [] }],
  ]);
  const items = new Map<string, ItemTemplateDto>(
    planningTemplate.items.map((row) => [row.itemTemplateId, { id: row.itemTemplateId, name: row.name, code: row.code, isActive: row.isActive }]),
  );
  const calls: { method: string; url: URL; body: Record<string, unknown>; raw: string }[] = [];
  let sequence = 10;
  const id = () => `79000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
  const cors = {
    ...sessionCors,
    "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, X-CSRF-TOKEN",
  };
  await context.route(
    /https:\/\/localhost:7249\/api\/v1\/(?:admin\/)?(?:projects|time-plans|time-plan-stages|time-plan-items|stage-templates|item-templates)(?:\/|\?|$)/,
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        method = request.method();
      if (method === "OPTIONS") {
        return route.fulfill({ status: 204, headers: cors });
      }
      const raw = request.postDataBuffer()?.toString("utf8") ?? "";
      const body = raw.startsWith("{") ? (request.postDataJSON() as Record<string, unknown>) : {};
      calls.push({ method, url, body, raw });
      const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
      const fail = (status: number) =>
        route.fulfill({ status, headers: cors, json: { status, ...(status === 400 ? { errors: { "Input.Name": ["Invalid name"] } } : {}) } });
      const path = url.pathname
        .replace("/api/v1/", "")
        .replace(/^admin\//, "")
        .split("/");
      const collection = path[0],
        target = path[1];
      if (method === "GET") {
        if (state.readStatus) {
          return fail(state.readStatus);
        }
        const page = <T extends { name: string; code?: string; isActive?: boolean }>(rows: T[]) => {
          const pageNumber = Number(url.searchParams.get("pageNumber") ?? 1),
            pageSize = Number(url.searchParams.get("pageSize") ?? 20),
            query = url.searchParams.get("search")?.toLowerCase() ?? "";
          const filtered = rows.filter(
            (row) =>
              `${row.name} ${row.code ?? ""}`.toLowerCase().includes(query) &&
              (!url.searchParams.has("isActive") || String(row.isActive) === url.searchParams.get("isActive")),
          );
          return ok({
            items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
            pageNumber,
            pageSize,
            totalCount: filtered.length,
            totalPages: Math.ceil(filtered.length / pageSize),
          });
        };
        if (collection === "projects") {
          if (state.projectMissing) {
            return fail(404);
          }
          if (path[2] === "time-plan") {
            return state.plan ? ok(state.plan) : fail(404);
          }
          return target ? ok(catalogueProject) : page([catalogueProject]);
        }
        const map: ReadonlyMap<string, ItemTemplateDto | StageTemplateDto> = collection === "stage-templates" ? stages : items;
        if (target) {
          const row = map.get(target);
          if (row && "items" in row) {
            return ok({
              ...row,
              items: row.items.map((entry) => ({ ...entry, ...items.get(entry.itemTemplateId), itemTemplateId: entry.itemTemplateId })),
            });
          }
          return row ? ok(row) : fail(404);
        }
        return page([
          ...map.values(),
          ...Array.from({ length: state.extraTemplates }, (_, index) => ({
            id: `78000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            name: `Extra template ${index + 1}`,
            code: `EXTRA-${index + 1}`,
            isActive: index % 2 === 0,
          })),
        ]);
      }
      if (state.delayWrite) {
        await new Promise((resolve) => setTimeout(resolve, state.delayWrite));
      }
      const rejected = state.failNext;
      state.failNext = 0;
      if (rejected && !state.commitOnError) {
        if (state.staleOrder && state.plan) {
          state.plan = {
            ...state.plan,
            stages: [...state.plan.stages, { id: id(), name: "Concurrent stage", deliveryDate: planningDate, sortOrder: 3, items: [] }],
          };
        }
        return fail(rejected);
      }
      function result(value: string) {
        if (state.failReadAfterWrite) {
          state.readStatus = 503;
        }
        if (rejected) {
          return fail(rejected);
        }
        return ok(state.malformedId ? "invalid" : value);
      }
      if (collection === "stage-templates" || collection === "item-templates") {
        const map: Map<string, ItemTemplateDto | StageTemplateDto> = collection === "stage-templates" ? stages : items;
        if (method === "POST") {
          const created = id();
          map.set(created, {
            id: created,
            name: String(body.name),
            code: String(body.code),
            isActive: true,
            ...(collection === "stage-templates" ? { items: [] } : {}),
          });
          return result(created);
        }
        const row = target ? map.get(target) : undefined;
        if (!row || !target) {
          return fail(404);
        }
        if (method === "PATCH") {
          map.set(target, { ...row, name: String(body.name), code: String(body.code) });
        }
        if (method === "PUT" && path[2] === "active") {
          map.set(target, { ...row, isActive: Boolean(body.isActive) });
        }
        if (method === "PUT" && path[2] === "items") {
          const entries = body.items as { itemTemplateId: string; sortOrder: number }[];
          if (
            !("items" in row) ||
            new Set(entries.map((entry) => entry.itemTemplateId)).size !== entries.length ||
            entries.some((entry, index) => !items.has(entry.itemTemplateId) || entry.sortOrder !== index + 1)
          ) {
            return fail(409);
          }
          map.set(target, { ...row, items: entries.map((entry) => ({ ...items.get(entry.itemTemplateId)!, ...entry })) });
        }
        if (method === "DELETE") {
          map.delete(target);
          if (collection === "item-templates") {
            for (const [key, stage] of stages) {
              stages.set(key, {
                ...stage,
                items: stage.items.filter((entry) => entry.itemTemplateId !== target).map((entry, index) => ({ ...entry, sortOrder: index + 1 })),
              });
            }
          }
        }
        return result(target);
      }
      if (collection === "projects" && method === "POST") {
        if (state.plan) {
          return fail(409);
        }
        const created = id();
        state.plan = { id: created, projectId: target!, ...(body.input as { name: string; deliveryDate: string }), stages: [] };
        return result(created);
      }
      const plan = state.plan;
      if (!plan) {
        return fail(404);
      }
      if (collection === "time-plans" && target !== plan.id) {
        return fail(404);
      }
      function replaceStage(stage: TimePlanStageDto) {
        state.plan = { ...state.plan!, stages: state.plan!.stages.map((entry) => (entry.id === stage.id ? stage : entry)) };
      }
      function replaceItem(stage: TimePlanStageDto, item: PlanStageItemDto) {
        replaceStage({ ...stage, items: stage.items.map((entry) => (entry.id === item.id ? item : entry)) });
      }
      function reorder<T extends { id: string; sortOrder: number }>(rows: readonly T[]): T[] | null {
        const entries = body.items as { id: string; sortOrder: number }[];
        if (
          !entries ||
          entries.length !== rows.length ||
          new Set(entries.map((entry) => entry.id)).size !== rows.length ||
          entries.some((entry, index) => !rows.some((row) => row.id === entry.id) || entry.sortOrder !== index + 1)
        ) {
          return null;
        }
        return entries.map((entry) => ({ ...rows.find((row) => row.id === entry.id)!, sortOrder: entry.sortOrder }));
      }
      if (collection === "time-plans" && path.length === 2) {
        if (method === "PATCH") {
          state.plan = { ...plan, ...(body as unknown as { name: string; deliveryDate: string }) };
        }
        if (method === "DELETE") {
          state.plan = null;
        }
        return result(plan.id);
      }
      if (collection === "time-plans" && path[3] === "order") {
        const next = reorder(plan.stages);
        if (!next) {
          return fail(400);
        }
        state.plan = { ...plan, stages: next };
        return result(plan.id);
      }
      if (collection === "time-plans" && method === "POST") {
        const source = body.stageTemplateId ? stages.get(String(body.stageTemplateId)) : undefined;
        if (
          path[3] === "from-template" &&
          (!source || !source.isActive || source.items.some((entry) => !items.get(entry.itemTemplateId)?.isActive))
        ) {
          return fail(409);
        }
        const created = id(),
          drafts = body.items as { name: string; dueDate: string; confirmedDate: string | null; itemTemplateId: string | null }[];
        const stage: TimePlanStageDto = {
          id: created,
          name: source?.name ?? String(body.name),
          deliveryDate: String(body.deliveryDate),
          sortOrder: plan.stages.length + 1,
          items: drafts.map((entry, index) => ({
            id: id(),
            name: source ? items.get(entry.itemTemplateId!)!.name : entry.name,
            dueDate: entry.dueDate,
            confirmedDate: entry.confirmedDate,
            sortOrder: index + 1,
            status: 0,
            images: [],
          })),
        };
        state.plan = { ...plan, stages: [...plan.stages, stage] };
        return result(created);
      }
      const stageId = collection === "time-plans" ? path[3] : collection === "time-plan-stages" ? target : undefined;
      const stage = stageId
        ? plan.stages.find((row) => row.id === stageId)
        : plan.stages.find((row) => row.items.some((entry) => entry.id === target));
      if (!stage) {
        return fail(404);
      }
      if (collection === "time-plans") {
        if (method === "PATCH") {
          replaceStage({ ...stage, ...(body as unknown as { name: string; deliveryDate: string }) });
        }
        if (method === "DELETE") {
          state.plan = { ...plan, stages: plan.stages.filter((row) => row.id !== stage.id).map((row, index) => ({ ...row, sortOrder: index + 1 })) };
        }
        return result(stage.id);
      }
      if (collection === "time-plan-stages" && path[3] === "order") {
        const next = reorder(stage.items);
        if (!next) {
          return fail(400);
        }
        replaceStage({ ...stage, items: next });
        return result(stage.id);
      }
      if (collection === "time-plan-stages" && method === "POST" && path.length === 3) {
        const created = id();
        replaceStage({
          ...stage,
          items: [
            ...stage.items,
            {
              id: created,
              ...(body as unknown as { name: string; dueDate: string; confirmedDate: string | null }),
              status: 0,
              sortOrder: stage.items.length + 1,
              images: [],
            },
          ],
        });
        return result(created);
      }
      const itemId = collection === "time-plan-stages" ? path[3] : target;
      const item = stage.items.find((row) => row.id === itemId);
      if (!item) {
        return fail(404);
      }
      if (collection === "time-plan-stages") {
        if (path[4] === "status") {
          if (body.status === 2 && !body.confirmedDate) {
            return fail(400);
          }
          replaceItem(stage, { ...item, status: body.status as 0 | 1 | 2, confirmedDate: body.confirmedDate as string | null });
        } else if (method === "PATCH") {
          replaceItem(stage, { ...item, ...(body as unknown as { name: string; dueDate: string; confirmedDate: string | null }) });
        }
        if (method === "DELETE") {
          replaceStage({ ...stage, items: stage.items.filter((row) => row.id !== item.id).map((row, index) => ({ ...row, sortOrder: index + 1 })) });
        }
        return result(item.id);
      }
      if (path[3] === "order") {
        const next = reorder(item.images);
        if (!next) {
          return fail(400);
        }
        replaceItem(stage, { ...item, images: next });
        return result(item.id);
      }
      if (method === "POST") {
        const created = id();
        const description = /name="Description"\r\n\r\n([^]*?)\r\n--/.exec(raw)?.[1] ?? null;
        const image: StageItemImageDto = { id: created, imagePath: "PRIVATE-STORAGE/new.png", description, sortOrder: item.images.length + 1 };
        replaceItem(stage, { ...item, images: [...item.images, image] });
        return result(created);
      }
      if (!item.images.some((row) => row.id === path[3])) {
        return fail(404);
      }
      replaceItem(stage, {
        ...item,
        images:
          method === "DELETE"
            ? item.images.filter((row) => row.id !== path[3]).map((row, index) => ({ ...row, sortOrder: index + 1 }))
            : item.images.map((row) => (row.id === path[3] ? { ...row, description: body.description as string | null } : row)),
      });
      return result(path[3]!);
    },
  );
  return { state, calls, stages, items, session };
}
