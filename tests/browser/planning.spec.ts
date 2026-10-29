import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { planningDate, planningIds as ids, planningPlan, planningServer } from "./planningFixtures";
import { seedRouting } from "./routingFixtures";
import en from "../../src/i18n/locales/en/timePlans.json" with { type: "json" };
import ar from "../../src/i18n/locales/ar/timePlans.json" with { type: "json" };

const planPath = `/admin/time-plans/${ids.project}`;
const templatePath = `/admin/templates/stages?id=${ids.stageTemplate}`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");

async function saveForm(page: Page, title: string) {
  await page.getByRole("form", { name: title, exact: true }).getByRole("button", { name: en.save, exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
}

async function confirm(page: Page, title: string) {
  await page.getByRole("button", { name: title, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function selectItem(page: Page) {
  await page.getByRole("region", { name: en.stages, exact: true }).getByRole("button", { name: "Foundations", exact: true }).click();
  await page.getByRole("region", { name: en.items, exact: true }).getByRole("button", { name: "Foundation inspection", exact: true }).click();
  await expect(page.getByRole("form", { name: en.editItem, exact: true })).toBeVisible();
}

test("complete empty plan → manual stage → item → image workflow uses precise bodies and cascaded deletion", async ({ page, context }) => {
  test.setTimeout(120000);
  const server = await planningServer(context);
  server.state.plan = null;
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.locator("#plan-name").fill("New project schedule");
  await page.locator("#plan-deliveryDate").fill(planningDate);
  await saveForm(page, en.createPlan);
  expect(server.calls.find((call) => call.method === "POST")!.body).toEqual({
    input: { name: "New project schedule", deliveryDate: planningDate },
    stages: [],
  });
  await page.locator("#plan-name").fill("Updated schedule");
  await saveForm(page, en.editPlan);
  await page.getByText(en.addStage, { exact: true }).click();
  await page.locator("#add-stage-name").fill("New manual stage");
  await page.locator("#add-stage-deliveryDate").fill(planningDate);
  await saveForm(page, en.manualStage);
  const stage = server.state.plan!.stages[0]!;
  await page.getByRole("button", { name: stage.name, exact: true }).click();
  await page.locator("#stage-name").fill("Updated manual stage");
  await saveForm(page, en.editStage);
  await page.locator("summary").filter({ hasText: en.addItem }).click();
  await page.locator("#add-item-name").fill("New work item");
  await page.locator("#add-item-dueDate").fill(planningDate);
  await saveForm(page, en.addItem);
  const item = server.state.plan!.stages[0]!.items[0]!;
  await page.getByRole("button", { name: item.name, exact: true }).click();
  const itemForm = page.getByRole("form", { name: en.editItem, exact: true });
  await itemForm.getByLabel(en.fields.name, { exact: true }).fill("Updated work item");
  await saveForm(page, en.editItem);
  await page.locator("#item-status-status").selectOption("2");
  await page.locator("#item-status-confirmedDate").fill(planningDate);
  await saveForm(page, en.changeStatus);
  expect(server.calls.findLast((call) => call.url.pathname.endsWith("/status"))!.body).toEqual({ status: 2, confirmedDate: planningDate });
  expect(server.calls.findLast((call) => call.method === "PATCH" && call.url.pathname.includes("/items/"))!.body).toEqual({
    name: "Updated work item",
    dueDate: planningDate,
    confirmedDate: null,
  });
  await page.locator("#item-image-file").setInputFiles({ name: "progress.png", mimeType: "image/png", buffer: png });
  await page.locator("#image-upload-description").fill("Site progress");
  await page.getByRole("form", { name: en.uploadImage }).getByRole("button", { name: en.uploadImage }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const upload = server.calls.findLast((call) => call.method === "POST")!;
  expect(upload.raw).toContain('name="File"');
  expect(upload.raw).toContain('name="Description"');
  expect(upload.raw).not.toContain("AltText");
  const image = server.state.plan!.stages[0]!.items[0]!.images[0]!;
  await page.locator(`[id="image-${image.id}-description"]`).fill("Edited progress");
  await saveForm(page, en.editDescription);
  expect(server.calls.findLast((call) => call.method === "PATCH")!.body).toEqual({ description: "Edited progress" });
  expect(await page.locator("body").innerHTML()).not.toContain("PRIVATE-STORAGE");
  await confirm(page, en.deleteImage);
  await expect(page.getByText(en.noImages, { exact: true })).toBeVisible();
  await confirm(page, en.deleteItem);
  await expect(page.getByRole("form", { name: en.editItem })).toHaveCount(0);
  await confirm(page, en.deleteStage);
  await expect(page.getByRole("form", { name: en.editStage })).toHaveCount(0);
  await confirm(page, en.deletePlan);
  await expect(page.getByRole("form", { name: en.createPlan })).toBeVisible();
  expect(server.state.plan).toBeNull();
});

test("keyboard ordering sends every sibling and preserves selected stage and item after reload", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  for (const [name, suffix, expected] of [
    ["Foundations", "/stages/order", [ids.stage2, ids.stage]],
    ["Foundation inspection", "/items/order", [ids.item2, ids.item]],
    ["First progress photo", "/images/order", [ids.image2, ids.image]],
  ] as const) {
    const button = page.getByRole("button", { name: en.moveDownName.replace("{{name}}", name), exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
    await expect
      .poll(() => server.calls.findLast((call) => call.url.pathname.endsWith(suffix))?.body)
      .toEqual({ items: expected.map((id, index) => ({ id, sortOrder: index + 1 })) });
    await expect(button).toBeDisabled();
    await expect(page.getByRole("form", { name: en.editItem })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Move Finishing up", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move Concrete work up", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move Second progress photo up", exact: true })).toBeDisabled();
});

test("a concurrent plan creation retains the create draft, and confirmed deletion resets it", async ({ page, context }) => {
  const server = await planningServer(context);
  server.state.plan = null;
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.locator("#plan-name").fill("Retained creation draft");
  await page.locator("#plan-deliveryDate").fill(planningDate);
  server.state.plan = structuredClone(planningPlan);
  await page.getByRole("form", { name: en.createPlan }).getByRole("button", { name: en.save, exact: true }).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: en.editPlan })).toBeVisible();
  await expect(page.locator("#plan-name")).toHaveValue("Retained creation draft");
  expect(server.calls.filter((call) => call.method !== "GET")).toHaveLength(1);
  await page.getByRole("form", { name: en.editPlan }).getByRole("button", { name: en.reset, exact: true }).click();
  await expect(page.locator("#plan-name")).toHaveValue(planningPlan.name);
  await page.locator("#plan-name").fill("Discard after deletion");
  await confirm(page, en.deletePlan);
  await expect(page.getByRole("form", { name: en.createPlan })).toBeVisible();
  await expect(page.locator("#plan-name")).toHaveValue("");
  await expect(page.locator("#plan-deliveryDate")).toHaveValue("");
});

test("an image removed by another writer keeps its failed description draft without a retry", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  const description = page.locator(`[id="image-${ids.image}-description"]`);
  await description.fill("Retain this unsaved description");
  server.state.plan = {
    ...server.state.plan!,
    stages: server.state.plan!.stages.map((stage) => ({
      ...stage,
      items: stage.items.map((item) => ({ ...item, images: item.images.filter((image) => image.id !== ids.image) })),
    })),
  };
  const form = description.locator("xpath=ancestor::form");
  await form.getByRole("button", { name: en.save, exact: true }).click();
  await expect(page.getByText(en.imageUnavailable, { exact: true })).toBeVisible();
  await expect(description).toHaveValue("Retain this unsaved description");
  await expect(form.getByRole("button", { name: en.save, exact: true })).toBeDisabled();
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
});

test("all status transitions use the dedicated endpoint and Completed requires a valid date", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  const status = page.getByRole("form", { name: en.changeStatus });
  await page.locator("#item-status-status").selectOption("2");
  await status.getByRole("button", { name: en.save, exact: true }).click();
  await expect(page.locator("#item-status-confirmedDate")).toHaveAttribute("aria-invalid", "true");
  expect(server.calls.filter((call) => call.method !== "GET")).toHaveLength(0);
  for (const value of ["1", "2", "0", "2", "1", "0"]) {
    await page.locator("#item-status-status").selectOption(value);
    await page.locator("#item-status-confirmedDate").fill(value === "2" ? planningDate : "");
    await saveForm(page, en.changeStatus);
    expect(server.state.plan!.stages[0]!.items[0]!.status).toBe(Number(value));
    expect(server.state.plan!.stages[0]!.items[1]!.status).toBe(0);
  }
  expect(server.calls.filter((call) => call.method === "POST" && call.url.pathname.endsWith("/status"))).toHaveLength(6);
});

test("server template application supplies every mapped item date and also supports empty templates", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.getByText(en.addStage, { exact: true }).click();
  await page.getByLabel(en.source.stage, { exact: true }).selectOption(ids.stageTemplate);
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect(page.locator("#template-delivery")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#template-delivery").fill(planningDate);
  await page.locator("#template-due-0").fill(planningDate);
  await page.locator("#template-due-1").fill(planningDate);
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "POST")!.url.pathname).toBe(`/api/v1/admin/time-plans/${ids.plan}/stages/from-template`);
  expect(server.calls.findLast((call) => call.method === "POST")!.body).toEqual({
    stageTemplateId: ids.stageTemplate,
    name: "Reusable construction stage",
    deliveryDate: planningDate,
    items: [
      { itemTemplateId: ids.itemTemplate, name: "Survey", dueDate: planningDate, confirmedDate: null },
      { itemTemplateId: ids.itemTemplate2, name: "Approval", dueDate: planningDate, confirmedDate: null },
    ],
  });
  await page.getByLabel(en.source.stage, { exact: true }).selectOption(ids.emptyTemplate);
  await expect(page.getByText(en.emptyTemplate, { exact: true })).toBeVisible();
  await page.locator("#template-delivery").fill(planningDate);
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect.poll(() => server.state.plan!.stages.length).toBe(4);
  expect(server.calls.findLast((call) => call.method === "POST")!.body.items).toEqual([]);
});

test("inactive mapped templates cannot be applied and a newly stale template reports 409 without losing dates", async ({ page, context }) => {
  const server = await planningServer(context);
  server.items.set(ids.itemTemplate, { ...server.items.get(ids.itemTemplate)!, isActive: false });
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.getByText(en.addStage, { exact: true }).click();
  await page.getByLabel(en.source.stage, { exact: true }).selectOption(ids.stageTemplate);
  await expect(page.getByText(en.inactiveSource, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.applyTemplate, exact: true })).toBeDisabled();
  server.items.set(ids.itemTemplate, { ...server.items.get(ids.itemTemplate)!, isActive: true });
  await page.reload();
  await page.getByText(en.addStage, { exact: true }).click();
  await page.getByLabel(en.source.stage, { exact: true }).selectOption(ids.stageTemplate);
  await page.locator("#template-delivery").fill(planningDate);
  await page.locator("#template-due-0").fill(planningDate);
  await page.locator("#template-due-1").fill(planningDate);
  server.state.failNext = 409;
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator("#template-due-0")).toHaveValue(planningDate);
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

for (const kind of ["stages", "items"] as const) {
  test(`${kind} templates support create, full edit, active state and deletion with real IDs`, async ({ page, context }) => {
    const server = await planningServer(context);
    await seedRouting(page, "admin");
    await page.goto(`/admin/templates/${kind}?create=1`);
    await page.locator("#template-name").fill("New reusable template");
    await page.locator("#template-code").fill("NEW-1");
    await page.getByRole("form", { name: en.createTemplate, exact: true }).getByRole("button", { name: en.save, exact: true }).click();
    await expect(page).toHaveURL(/\?id=[0-9a-f-]+$/);
    const created = new URL(page.url()).searchParams.get("id")!;
    await expect(page.getByRole("form", { name: en.editTemplate, exact: true })).toBeVisible();
    await page.locator("#template-name").fill("Renamed reusable template");
    await saveForm(page, en.editTemplate);
    expect(server.calls.findLast((call) => call.method === "PATCH")!.body).toEqual({ name: "Renamed reusable template", code: "NEW-1" });
    await confirm(page, en.deactivateTemplate);
    expect(server.calls.findLast((call) => call.method === "PUT")!.body).toEqual({ isActive: false });
    await confirm(page, en.activateTemplate);
    await confirm(page, en.deleteTemplate);
    await expect(page.getByText(en.templateDeleted, { exact: true })).toBeVisible();
    expect((kind === "stages" ? server.stages : server.items).has(created)).toBe(false);
    expect(server.state.plan).toEqual(planningPlan);
  });
}

test("stage assignments support keyboard ordering, duplicates, inactive sources and full empty replacement", async ({ page, context }) => {
  const server = await planningServer(context);
  server.items.set(ids.itemTemplate, { ...server.items.get(ids.itemTemplate)!, isActive: false });
  await seedRouting(page, "admin");
  await page.goto(templatePath);
  const button = page.getByRole("button", { name: "Move Survey down", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await page.getByLabel(en.source.item, { exact: true }).selectOption(ids.itemTemplate);
  await page.getByRole("button", { name: en.addAssignment, exact: true }).click();
  await expect(page.getByText(en.duplicateAssignment, { exact: true })).toBeVisible();
  await confirm(page, en.saveAssignments);
  expect(server.calls.findLast((call) => call.method === "PUT")!.body).toEqual({
    items: [
      { itemTemplateId: ids.itemTemplate2, sortOrder: 1 },
      { itemTemplateId: ids.itemTemplate, sortOrder: 2 },
    ],
  });
  await page.getByRole("button", { name: "Remove Survey from assignments", exact: true }).click();
  await page.getByRole("button", { name: "Remove Approval from assignments", exact: true }).click();
  await confirm(page, en.saveAssignments);
  expect(server.calls.findLast((call) => call.method === "PUT")!.body).toEqual({ items: [] });
  expect(server.state.plan).toEqual(planningPlan);
});

test("changed template assignments keep dates tied to their source IDs until an explicit reset", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.getByText(en.addStage, { exact: true }).click();
  await page.getByLabel(en.source.stage, { exact: true }).selectOption(ids.stageTemplate);
  await page.locator("#template-delivery").fill(planningDate);
  await page.locator("#template-due-0").fill(planningDate);
  await page.locator("#template-due-1").fill(planningDate);
  server.stages.set(ids.stageTemplate, { ...server.stages.get(ids.stageTemplate)!, items: [server.stages.get(ids.stageTemplate)!.items[1]!] });
  server.state.failNext = 409;
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect(page.getByText(en.sourceChanged, { exact: true })).toBeVisible();
  await expect(page.locator("#template-due-0")).toHaveValue(planningDate);
  await expect(page.getByRole("button", { name: en.applyTemplate, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: en.resetTemplateDates, exact: true }).click();
  await expect(page.locator("#template-due-1")).toHaveCount(0);
  await expect(page.locator("#template-due-0")).toHaveValue("");
  await page.locator("#template-delivery").fill(planningDate);
  await page.locator("#template-due-0").fill(planningDate);
  await page.getByRole("button", { name: en.applyTemplate, exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(
    (server.calls.findLast((call) => call.method === "POST")!.body.items as { itemTemplateId: string }[]).map((row) => row.itemTemplateId),
  ).toEqual([ids.itemTemplate2]);
});

test("duplicate submits share one pending lock through reload and navigation waits for the write", async ({ page, context }) => {
  const server = await planningServer(context);
  server.state.delayWrite = 700;
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await page.locator("#plan-name").fill("Single save");
  await page.getByRole("form", { name: en.editPlan }).evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page.locator("#plan-name")).toBeDisabled();
  await page.getByRole("link", { name: en.changeProject, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  await page.getByRole("dialog").getByRole("button", { name: en.discard, exact: true }).click();
  await expect(page).toHaveURL("/admin/time-plans");
});

test("logout removes planning drafts and selected image previews from the private route", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  await page.locator("#plan-name").fill("Discarded private draft");
  await page.locator("#item-image-file").setInputFiles({ name: "private.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText(en.localPreview)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#auth-password")).toBeVisible();
  await expect(page.getByRole("form", { name: en.editPlan })).toHaveCount(0);
  await expect(page.getByAltText(en.localPreview)).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/login\?returnTo=/);
  expect(server.state.plan).toEqual(planningPlan);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("Discarded private draft");
});

test("conflicts preserve independent drafts and stale order retries include newly added siblings", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  await page.locator("#stage-name").fill("Unsaved stage name");
  await page.locator("#plan-name").fill("Unsaved plan name");
  server.state.failNext = 409;
  await page.getByRole("form", { name: en.editPlan }).getByRole("button", { name: en.save, exact: true }).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator("#plan-name")).toHaveValue("Unsaved plan name");
  await expect(page.locator("#stage-name")).toHaveValue("Unsaved stage name");
  server.state.failNext = 400;
  server.state.staleOrder = true;
  await page.getByRole("button", { name: "Move Foundations down", exact: true }).click();
  await expect(page.getByRole("button", { name: "Concurrent stage", exact: true })).toBeVisible();
  expect(server.calls.filter((call) => call.url.pathname.endsWith("/stages/order"))).toHaveLength(1);
  await page.getByRole("button", { name: "Move Foundations down", exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.url.pathname.endsWith("/stages/order"))!.body.items as unknown[]).toHaveLength(3);
  await expect(page.locator("#stage-name")).toHaveValue("Unsaved stage name");
});

test("uncertain committed ordering blocks retries until an explicit read succeeds without replay", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  server.state.failNext = 500;
  server.state.commitOnError = true;
  await page.getByRole("button", { name: "Move Foundations down", exact: true }).click();
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Move Foundations up", exact: true })).toBeDisabled();
  expect(server.state.plan!.stages[0]!.id).toBe(ids.stage2);
  await page.getByRole("button", { name: en.check, exact: true }).click();
  await expect(page.getByRole("button", { name: en.check, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Move Foundations up", exact: true })).toBeEnabled();
  expect(server.calls.filter((call) => call.method === "PUT")).toHaveLength(1);
});

for (const failure of ["follow-up", "malformed"] as const) {
  test(`${failure} after a committed edit blocks writes and checks outcome without replay`, async ({ page, context }) => {
    const server = await planningServer(context);
    await seedRouting(page, "admin");
    await page.goto(planPath);
    await page.locator("#plan-name").fill("Saved once");
    if (failure === "follow-up") {
      server.state.failReadAfterWrite = true;
    } else {
      server.state.malformedId = true;
    }
    await page.getByRole("form", { name: en.editPlan }).getByRole("button", { name: en.save, exact: true }).click();
    await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
    await expect(page.locator("#plan-name")).toHaveValue("Saved once");
    await expect(page.locator("#plan-name")).toBeDisabled();
    server.state.readStatus = 0;
    await page.getByRole("button", { name: en.check, exact: true }).click();
    await expect(page.getByRole("button", { name: en.check, exact: true })).toHaveCount(0);
    expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });
}

test("image file limits and failed upload preserve the local preview, description and file selection", async ({ page, context }) => {
  const server = await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  await page.locator("#item-image-file").setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByText(en.fileSize, { exact: true })).toBeVisible();
  await page.locator("#item-image-file").setInputFiles({ name: "wrong.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.getByText(en.fileType, { exact: true })).toBeVisible();
  await page.locator("#item-image-file").setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: png });
  await page.locator("#image-upload-description").fill("Retained upload");
  server.state.failNext = 409;
  await page.getByRole("form", { name: en.uploadImage }).getByRole("button", { name: en.uploadImage, exact: true }).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.getByAltText(en.localPreview)).toBeVisible();
  await expect(page.locator("#image-upload-description")).toHaveValue("Retained upload");
  expect(await page.locator("#item-image-file").evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe("valid.png");
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("unsaved edits protect stage, item, project and template navigation with keyboard cancellation", async ({ page, context }) => {
  await planningServer(context);
  await seedRouting(page, "admin");
  await page.goto(planPath);
  await selectItem(page);
  await page.locator("#plan-name").fill("Private in-memory draft");
  await page.getByRole("button", { name: "Finishing", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(en.discardDescription);
  await page.keyboard.press("Escape");
  await expect(page.locator("#plan-name")).toHaveValue("Private in-memory draft");
  await page.getByRole("button", { name: "Concrete work", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.keepEditing }).click();
  await expect(page.getByRole("form", { name: en.editItem })).toBeVisible();
  await page.getByRole("link", { name: en.changeProject, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: en.discard, exact: true }).click();
  await expect(page).toHaveURL("/admin/time-plans");
  await page.getByLabel(en.source.project, { exact: true }).selectOption(ids.project);
  await expect(page.locator("#plan-name")).toHaveValue(planningPlan.name);
  await page.goto(templatePath);
  await page.locator("#template-name").fill("Unsaved template");
  await page.getByRole("link", { name: "Empty template", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: en.discard, exact: true }).click();
  await expect(page.locator("#template-name")).toHaveValue("Empty template");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("Private in-memory draft");
});

test("project selection avoids plan preloads and templates use bounded paging, search and active filters", async ({ page, context }) => {
  const server = await planningServer(context);
  server.state.extraTemplates = 25;
  await seedRouting(page, "admin");
  await page.goto("/admin/time-plans");
  await expect(page.getByLabel(en.source.project, { exact: true })).toBeEnabled();
  expect(server.calls.some((call) => call.url.pathname.endsWith("/time-plan"))).toBe(false);
  await page.goto("/admin/templates/items");
  await expect(page.getByRole("region", { name: en.templatesList }).getByRole("link")).toHaveCount(20);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect.poll(() => server.calls.findLast((call) => call.method === "GET")!.url.searchParams.get("pageNumber")).toBe("2");
  await page.locator("#templates-search").fill("EXTRA-25");
  await expect(page.getByRole("region", { name: en.templatesList }).getByRole("link")).toHaveCount(1);
  await page.locator("#templates-state").selectOption("false");
  await expect(page.getByRole("region", { name: en.templatesList }).getByRole("link")).toHaveCount(0);
  expect(
    server.calls.filter((call) => call.url.searchParams.has("pageSize")).every((call) => Number(call.url.searchParams.get("pageSize")) <= 100),
  ).toBe(true);
});

for (const status of [403, 404]) {
  test(`project read ${status} never offers accidental plan creation`, async ({ page, context }) => {
    const server = await planningServer(context);
    if (status === 404) {
      server.state.projectMissing = true;
    } else {
      server.state.readStatus = status;
    }
    await seedRouting(page, "admin");
    await page.goto(planPath);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("form", { name: en.createPlan })).toHaveCount(0);
    expect(server.calls.filter((call) => call.method !== "GET")).toHaveLength(0);
  });
}

for (const language of ["ar", "en"] as const) {
  test(`${language} dates, hierarchy, keyboard order, long names and template dialogs have bilingual visual evidence`, async ({ page, context }) => {
    test.setTimeout(90000);
    const server = await planningServer(context, "superAdmin");
    const labels = language === "ar" ? ar : en;
    const longName =
      language === "ar"
        ? "مرحلة أعمال الأساسات والمراجعة الهندسية للمشروع مع اسم طويل للتحقق من العرض"
        : "Foundation engineering inspection and approval with a long supplied project stage name";
    server.state.plan = { ...planningPlan, stages: planningPlan.stages.map((row, index) => (index === 0 ? { ...row, name: longName } : row)) };
    await seedRouting(page, "superAdmin", language);
    await mkdir("docs/evidence/part_10", { recursive: true });
    async function capture(name: string) {
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: `docs/evidence/part_10/${language}-${page.viewportSize()!.width}-${name}.png`,
        fullPage: true,
        mask: [page.locator("[data-private]")],
      });
    }
    await page.goto(planPath);
    await page.getByRole("button", { name: longName, exact: true }).click();
    await page.getByRole("button", { name: "Foundation inspection", exact: true }).click();
    await capture("hierarchy");
    const down = page.getByRole("button", { name: labels.moveDownName.replace("{{name}}", longName), exact: true });
    await down.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(labels.saved, { exact: true })).toBeVisible();
    await capture("ordered");
    await page.getByRole("button", { name: labels.deleteItem, exact: true }).click();
    await capture("delete-item");
    await page.keyboard.press("Escape");
    await page.goto(templatePath);
    await expect(page.locator("#template-code")).toHaveValue("STAGE-1");
    await capture("stage-template");
    await page.getByRole("button", { name: labels.saveAssignments, exact: true }).click();
    await capture("assignments");
    await page.keyboard.press("Escape");
    await page.goto(`/admin/templates/items?id=${ids.itemTemplate}`);
    await expect(page.locator("#template-code")).toHaveValue("ITEM-1");
    await capture("item-template");
  });
}
