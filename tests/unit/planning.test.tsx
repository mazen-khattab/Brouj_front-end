import { StrictMode, useRef } from "react";
import type { ReactNode } from "react";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthContext } from "../../src/Context/AuthContext";
import type { AuthValue } from "../../src/Context/AuthContext";
import { TimePlanProvider } from "../../src/Context/TimePlanProvider";
import { useTimePlan } from "../../src/Context/TimePlanContext";
import { TemplatesProvider } from "../../src/Context/TemplatesProvider";
import { useTemplates } from "../../src/Context/TemplatesContext";
import { useStaffOperation } from "../../src/Hooks/useStaffOperation";
import { executePlan, executeTemplate } from "../../src/Planning/commands";
import type { PlanCommand } from "../../src/Planning/commands";
import {
  assertCompleteOrdering,
  invalidPlanningFields,
  moveRows,
  orderingInput,
  planningFieldErrors,
  stageDraft,
  validPlanningDate,
} from "../../src/Planning/policy";
import { ApiError } from "../../src/Types/failures";
import * as plans from "../../src/Services/TimePlans";
import * as templates from "../../src/Services/Templates";
import * as projects from "../../src/Services/Projects";
import {
  planningDate as date,
  planningIds as ids,
  planningItem,
  planningPlan as plan,
  planningTemplate as template,
} from "../browser/planningFixtures";
import { catalogueProject } from "../browser/catalogueFixtures";
import { sessionBoundary } from "../../src/Security/sessionBoundary";
import { LocaleProvider } from "../../src/Context/LocaleProvider";
import { createLocaleInstance } from "../../src/i18n/instance";
import { SourcePicker } from "../../src/Components/Planning/SourcePicker";

const signal = new AbortController().signal;
const auth: AuthValue = {
  status: "staff",
  actor: "staff",
  role: 1,
  profile: { id: ids.project, name: "Staff", email: "staff@example.test", phone: "01000000000", role: 1, deletedAt: null },
  generation: 1,
  pending: false,
  automaticRefresh: true,
  logoutRequired: true,
  loginCustomer: vi.fn(),
  loginStaff: vi.fn(),
  registerCustomer: vi.fn(),
  logout: vi.fn(),
  retryBootstrap: vi.fn(),
  reloadIdentity: vi.fn(),
};

function staff({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <AuthContext value={auth}>{children}</AuthContext>
    </StrictMode>
  );
}

afterEach(() => vi.restoreAllMocks());

test.each(["2026-12-01T09:00:00+02:00", "2026-12-01T09:00:00Z", "2028-02-29T09:00:00.1234567-14:00"])(
  "explicit real offset date passes: %s",
  (value) => {
    expect(validPlanningDate(value)).toBe(true);
  },
);

test.each([
  "",
  "2026-02-29T09:00:00Z",
  "2026-02-31T09:00:00Z",
  "2026-12-01",
  "2026-12-01T09:00",
  "2026-12-01T24:00:00Z",
  "2026-12-01T09:00:00+14:01",
  "2026-12-01T09:00:00+01:60",
  "0000-12-01T09:00:00Z",
])("missing or invalid planning date is rejected: %s", (value) => {
  expect(validPlanningDate(value)).toBe(false);
});

test("client validation matches required plan dates, names/codes, optional confirmation and completed rules", () => {
  expect(invalidPlanningFields({ name: " ", deliveryDate: "" })).toEqual(["name", "deliveryDate"]);
  expect(invalidPlanningFields({ name: "Stage", deliveryDate: date })).toEqual([]);
  expect(invalidPlanningFields({ name: "x".repeat(101), code: "x".repeat(65) })).toEqual(["name", "code"]);
  expect(invalidPlanningFields({ name: "Item", dueDate: date, confirmedDate: "" })).toEqual([]);
  expect(invalidPlanningFields({ name: "Item", dueDate: date, confirmedDate: "" }, true)).toEqual(["confirmedDate"]);
  expect(invalidPlanningFields({ status: "2", confirmedDate: "" })).toEqual(["confirmedDate"]);
  expect(invalidPlanningFields({ status: "2", confirmedDate: date })).toEqual([]);
  expect(invalidPlanningFields({ status: "3", description: "x".repeat(20001) })).toEqual(["status", "description"]);
  expect(planningFieldErrors(new ApiError("transport", { fieldErrors: { "Input.Name": ["Untrusted text"] } }), ["name", "code"])).toEqual(["name"]);
});

test("ordering preserves input arrays and checks the complete unique sibling set and contiguous positions", () => {
  const rows = plan.stages;
  const moved = moveRows(rows, 0, 1);
  expect(rows[0]!.id).toBe(ids.stage);
  expect(moved[0]!.id).toBe(ids.stage2);
  expect(() => assertCompleteOrdering(rows, orderingInput(moved))).not.toThrow();
  for (const invalid of [
    [],
    [{ id: ids.stage, sortOrder: 1 }],
    [
      { id: ids.stage, sortOrder: 1 },
      { id: ids.stage, sortOrder: 2 },
    ],
    [
      { id: ids.item, sortOrder: 1 },
      { id: ids.stage2, sortOrder: 2 },
    ],
    [
      { id: ids.stage, sortOrder: 0 },
      { id: ids.stage2, sortOrder: 1 },
    ],
    [
      { id: ids.stage, sortOrder: 1 },
      { id: ids.stage2, sortOrder: 1 },
    ],
    [
      { id: ids.stage, sortOrder: 1.5 },
      { id: ids.stage2, sortOrder: 2 },
    ],
  ]) {
    expect(() => assertCompleteOrdering(rows, invalid)).toThrow(ApiError);
  }
  expect(() => moveRows(rows, 0, -1)).toThrow(ApiError);
  expect(() => moveRows(rows, rows.length - 1, 1)).toThrow(ApiError);
  expect(() => assertCompleteOrdering([], [])).not.toThrow();
});

test("template drafts carry source references, explicit dates and reject inactive/incomplete sources", () => {
  const rows = template.items.map((row) => ({ itemTemplateId: row.itemTemplateId, dueDate: date, confirmedDate: "" }));
  const input = stageDraft("Ignored manual name", date, rows, template);
  expect(input.stageTemplateId).toBe(ids.stageTemplate);
  expect(input.items.map((row) => row.itemTemplateId)).toEqual([ids.itemTemplate, ids.itemTemplate2]);
  expect(input.items.every((row) => row.dueDate === date && row.confirmedDate === null)).toBe(true);
  expect(() => stageDraft("", date, rows, { ...template, isActive: false })).toThrow(ApiError);
  expect(() => stageDraft("", date, rows, { ...template, items: template.items.map((row) => ({ ...row, isActive: false })) })).toThrow(ApiError);
  expect(() => stageDraft("", date, [], template)).toThrow(ApiError);
  expect(() =>
    stageDraft(
      "",
      date,
      rows.map((row) => ({ ...row, itemTemplateId: ids.item })),
      template,
    ),
  ).toThrow(ApiError);
  expect(stageDraft("Manual", date, [{ name: "Manual item", dueDate: date, confirmedDate: "" }]).items[0]!.itemTemplateId).toBeNull();
});

test.each([
  { kind: "updateStage", stageId: ids.stage2, input: { name: "x", deliveryDate: date } },
  { kind: "deleteItem", stageId: ids.stage, itemId: ids.stage2 },
  { kind: "deleteImage", stageId: ids.stage, itemId: ids.item2, imageId: ids.image },
  { kind: "statusItem", stageId: ids.stage2, itemId: ids.item, input: { status: 2, confirmedDate: date } },
] as PlanCommand[])("foreign hierarchy references are rejected before reaching transport ($kind)", async (command) => {
  // Remove the selected stage in the first case to model a stale parent selection.
  const current = command.kind === "updateStage" ? { ...plan, stages: [plan.stages[0]!] } : plan;
  const spies = [
    vi.spyOn(plans, "updateTimePlanStage"),
    vi.spyOn(plans, "deletePlanStageItem"),
    vi.spyOn(plans, "deleteStageItemImage"),
    vi.spyOn(plans, "changePlanStageItemStatus"),
  ];
  await expect(executePlan(command, ids.project, current, signal)).rejects.toMatchObject({ status: 404 });
  spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
});

test("project mismatch and duplicate/stale ordering cannot mutate a different loaded parent", async () => {
  const write = vi.spyOn(plans, "reorderTimePlanStages").mockResolvedValue(ids.plan);
  await expect(executePlan({ kind: "deletePlan" }, ids.stage, plan, signal)).rejects.toMatchObject({ status: 404 });
  await expect(executePlan({ kind: "orderStages", items: [{ id: ids.stage, sortOrder: 1 }] }, ids.project, plan, signal)).rejects.toMatchObject({
    status: 400,
  });
  expect(write).not.toHaveBeenCalled();
});

test("commands strip display-only item fields, separate status writes and retain the approved stage update body", async () => {
  const update = vi.spyOn(plans, "updatePlanStageItem").mockResolvedValue(ids.item);
  const status = vi.spyOn(plans, "changePlanStageItemStatus").mockResolvedValue(ids.item);
  const stage = vi.spyOn(plans, "updateTimePlanStage").mockResolvedValue(ids.stage);
  await executePlan(
    { kind: "updateItem", stageId: ids.stage, itemId: ids.item, input: { ...planningItem, dueDate: date } },
    ids.project,
    plan,
    signal,
  );
  expect(update.mock.calls[0]![0]).toEqual({
    stageId: ids.stage,
    id: ids.item,
    body: { name: planningItem.name, dueDate: date, confirmedDate: null },
  });
  await executePlan(
    { kind: "statusItem", stageId: ids.stage, itemId: ids.item, input: { status: 2, confirmedDate: date } },
    ids.project,
    plan,
    signal,
  );
  expect(status.mock.calls[0]![0].body).toEqual({ status: 2, confirmedDate: date });
  await executePlan({ kind: "updateStage", stageId: ids.stage, input: { name: "Stage", deliveryDate: date } }, ids.project, plan, signal);
  expect(stage.mock.calls[0]![0]).toEqual({ timePlanId: ids.plan, id: ids.stage, body: { name: "Stage", deliveryDate: date } });
});

test("template assignment rejects duplicate IDs and sends only the complete ordered mapping", async () => {
  const assign = vi.spyOn(templates, "setStageTemplateItems").mockResolvedValue(ids.stageTemplate);
  await expect(
    executeTemplate(
      "stage",
      {
        kind: "assign",
        items: [
          { itemTemplateId: ids.itemTemplate, sortOrder: 1 },
          { itemTemplateId: ids.itemTemplate, sortOrder: 2 },
        ],
      },
      template,
      signal,
    ),
  ).rejects.toMatchObject({ status: 400 });
  expect(assign).not.toHaveBeenCalled();
  await executeTemplate("stage", { kind: "assign", items: [] }, template, signal);
  expect(assign.mock.calls[0]![0]).toEqual({ id: template.id, body: { items: [] } });
  await expect(executeTemplate("item", { kind: "assign", items: [] }, template, signal)).rejects.toMatchObject({ status: 400 });
});

test.each([400, 429, 500])("ordering reloads after %s, preserves uncertainty when needed and never replays", async (status) => {
  function useAction() {
    const gate = useRef({ locked: false, unresolved: new Set<string>() });
    return useStaffOperation("order", gate);
  }
  const hook = renderHook(useAction, { wrapper: staff });
  const write = vi.fn().mockRejectedValue(new ApiError("transport", { status }));
  const reconcile = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    await hook.result.current.run({ id: ids.plan, reconcileOnFailure: true, write, refresh: vi.fn(), reconcile });
  });
  expect(reconcile).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledTimes(1);
  expect(hook.result.current.blocked).toBe(status === 500);
  if (status === 500) {
    await act(async () => {
      await hook.result.current.check();
    });
    expect(reconcile).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(1);
  }
});

test("a verified existing project can have no plan, but a project 404 never produces a create snapshot", async () => {
  vi.spyOn(projects, "getProjectById").mockResolvedValue(catalogueProject);
  vi.spyOn(plans, "getProjectTimePlan").mockRejectedValue(new ApiError("transport", { status: 404 }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={auth}>
      <TimePlanProvider scope="test" projectId={ids.project}>
        {children}
      </TimePlanProvider>
    </AuthContext>
  );
  const hook = renderHook(useTimePlan, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  expect(hook.result.current.snapshot?.plan).toBeNull();
  hook.unmount();
  vi.spyOn(projects, "getProjectById").mockRejectedValue(new ApiError("transport", { status: 404 }));
  const missing = renderHook(useTimePlan, { wrapper });
  await waitFor(() => expect(missing.result.current.read.result.status).toBe("error"));
  expect(missing.result.current.snapshot).toBeUndefined();
});

test("plan provider holds one write through reload, preserves failure snapshots and uses the correct project", async () => {
  vi.spyOn(projects, "getProjectById").mockResolvedValue(catalogueProject);
  const read = vi.spyOn(plans, "getProjectTimePlan").mockResolvedValue(plan);
  let finish!: (value: string) => void;
  const write = vi.spyOn(plans, "updateTimePlan").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={auth}>
      <TimePlanProvider scope="test" projectId={ids.project}>
        {children}
      </TimePlanProvider>
    </AuthContext>
  );
  const hook = renderHook(useTimePlan, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = hook.result.current.run("plan", { kind: "updatePlan", input: { name: "Draft", deliveryDate: date } });
    await hook.result.current.run("plan", { kind: "deletePlan" });
  });
  expect(write).toHaveBeenCalledTimes(1);
  read.mockRejectedValue(new ApiError("transport", { status: 503 }));
  await act(async () => {
    finish(ids.plan);
    await pending;
  });
  expect(hook.result.current.action.blocked).toBe(true);
  expect(hook.result.current.snapshot?.plan).toEqual(plan);
  read.mockResolvedValue({ ...plan, name: "Draft" });
  await act(async () => {
    await hook.result.current.action.check();
  });
  expect(hook.result.current.snapshot?.plan?.name).toBe("Draft");
  expect(write).toHaveBeenCalledTimes(1);
});

test.each([false, true])("generation-obsolete project reads cannot publish a planning snapshot (unmounted=%s)", async (unmount) => {
  vi.spyOn(projects, "getProjectById").mockResolvedValue(catalogueProject);
  let finish!: (value: typeof plan) => void;
  const read = vi.spyOn(plans, "getProjectTimePlan").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const stamp = vi.spyOn(sessionBoundary, "stamp").mockReturnValue({ revision: 1, generation: 1 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={auth}>
      <TimePlanProvider scope="test" projectId={ids.project}>
        {children}
      </TimePlanProvider>
    </AuthContext>
  );
  const hook = renderHook(useTimePlan, { wrapper });
  await waitFor(() => expect(read).toHaveBeenCalled());
  stamp.mockReturnValue({ revision: 2, generation: 2 });
  if (unmount) {
    hook.unmount();
  }
  await act(async () => {
    finish(plan);
  });
  expect(hook.result.current.snapshot).toBeUndefined();
});

test("template provider reloads the latest search after a conflict while keeping the selected target fixed", async () => {
  const get = vi
    .spyOn(templates, "getStageTemplates")
    .mockResolvedValue({ items: [template], pageNumber: 1, pageSize: 20, totalCount: 1, totalPages: 1 });
  vi.spyOn(templates, "getStageTemplateById").mockResolvedValue(template);
  const write = vi.spyOn(templates, "updateStageTemplate").mockRejectedValue(new ApiError("transport", { status: 409 }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={auth}>
      <TemplatesProvider scope="test" selectedId={template.id} kind="stage">
        {children}
      </TemplatesProvider>
    </AuthContext>
  );
  const hook = renderHook(useTemplates, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => {
    hook.result.current.setActive("false");
  });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => {
    await hook.result.current.run("template", { kind: "update", input: { name: "New", code: "CODE" } });
  });
  expect(get.mock.calls.at(-1)![0].query.isActive).toBe(false);
  expect(write.mock.calls[0]![0].id).toBe(template.id);
  expect(hook.result.current.snapshot?.detail?.id).toBe(template.id);
});

test("an initial search timer cannot undo a quick template page change, while a new search resets it", async () => {
  const get = vi
    .spyOn(templates, "getStageTemplates")
    .mockImplementation(async ({ query }) => ({ items: [template], pageNumber: query.pageNumber ?? 1, pageSize: 20, totalCount: 21, totalPages: 2 }));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext value={auth}>
      <TemplatesProvider scope="paging" selectedId="" kind="stage">
        {children}
      </TemplatesProvider>
    </AuthContext>
  );
  const hook = renderHook(useTemplates, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => {
    hook.result.current.setPage(2);
  });
  await waitFor(() => expect(get.mock.calls.at(-1)![0].query.pageNumber).toBe(2));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(hook.result.current.page).toBe(2);
  expect(get.mock.calls.at(-1)![0].query.pageNumber).toBe(2);
  await act(async () => {
    hook.result.current.setSearch("Survey");
  });
  await waitFor(() => expect(get.mock.calls.at(-1)![0].query.search).toBe("Survey"));
  expect(hook.result.current.page).toBe(1);
});

test("source picker paging is not reset by the initial empty search", async () => {
  const get = vi
    .spyOn(templates, "getItemTemplates")
    .mockImplementation(async ({ query }) => ({ items: [template], pageNumber: query.pageNumber ?? 1, pageSize: 20, totalCount: 21, totalPages: 2 }));
  const view = render(
    <LocaleProvider instance={createLocaleInstance("en")}>
      <AuthContext value={auth}>
        <SourcePicker scope="source-paging" kind="item" value="" disabled={false} onChange={vi.fn()} />
      </AuthContext>
    </LocaleProvider>,
  );
  await waitFor(() => expect(view.getByRole("button", { name: "Next page" })).toBeEnabled());
  fireEvent.click(view.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(get.mock.calls.at(-1)![0].query.pageNumber).toBe(2));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(get.mock.calls.at(-1)![0].query.pageNumber).toBe(2);
  expect(view.getByRole("button", { name: "Previous page" })).toBeEnabled();
});
