import { expect, test } from "./test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { adminCatalogueServer, imageId } from "./adminCatalogueFixtures";
import { seedRouting } from "./routingFixtures";
import { catalogueIds, cataloguePaymentPlan, catalogueProject } from "./catalogueFixtures";
import { ProjectType } from "../../src/Types/contracts";
import en from "../../src/i18n/locales/en/admin.json" with { type: "json" };
import ar from "../../src/i18n/locales/ar/admin.json" with { type: "json" };

const base = "/admin";
test.use({ timezoneId: "Africa/Cairo" });
const projectPath = `${base}/projects/${catalogueIds.project}`;
const unitPath = `${base}/units/${catalogueIds.unit}?projectId=${catalogueIds.project}`;
const save = (page: Page) => page.getByRole("button", { name: "Save record", exact: true });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});
const expectedProject = {
  name: catalogueProject.name,
  areaId: catalogueIds.area,
  description: catalogueProject.description,
  latitude: 30.05,
  longitude: 31.2,
  size: 1200,
  projectType: 1,
  price: 12500000,
  floorCount: 5,
  plannedUnitCount: 20,
  neighborPrice: 13000000,
  drawDate: "2026-12-01T14:00:00+02:00",
};

async function field(page: Page, name: string, value: string) {
  await page.locator(`#field-${name}`).fill(value);
}

async function dashboardLink(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Dashboard navigation", exact: true })
    .getByRole("link", { name, exact: true }).click();
}

async function deleteCurrent(page: Page) {
  await page.getByRole("button", { name: "Delete record", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm action" }).click();
  await expect(page.getByText("The record was deleted.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to list" }).click();
}

test("dashboard exposes four independent features and units only load for the selected project", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin");
  const dashboard = page.getByRole("navigation", { name: "Your Brouj workspace", exact: true });
  for (const [name, path] of [["Cities", "cities"], ["Areas", "areas"], ["Projects", "projects"], ["Units", "units"]]) {
    await expect(dashboard.getByRole("link", { name: name!, exact: true })).toHaveAttribute("href", `/admin/${path}`);
  }
  await dashboard.getByRole("link", { name: "Units", exact: true }).click();
  await expect(page.getByText(en.selectProjectForUnits, { exact: true })).toBeVisible();
  expect(server.calls.filter((call) => call.url.pathname.endsWith("/units"))).toHaveLength(0);
  await page.getByLabel(en.filterByProject, { exact: true }).selectOption(catalogueIds.project);
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  expect(server.calls.some((call) => call.url.pathname.endsWith(`/projects/${catalogueIds.project}/units`))).toBe(true);
  await page.getByLabel(en.filterByProject, { exact: true }).selectOption("");
  await expect(page.locator("table")).toHaveCount(0);
});

test("initiative unit creation and editing capture orientation, excellence and pricing date", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin/units?create=1");
  await expect(page.locator("#field-projectId")).toBeEnabled();
  await expect(save(page)).toBeDisabled();
  expect(server.calls.some((call) => call.method === "POST")).toBe(false);
  await page.locator("#field-projectId").selectOption(catalogueIds.project);
  for (const [key, value] of Object.entries({ number: "Standalone", meterPrice: "50", floorNumber: "1", size: "90", neighborMeterPrice: "60" })) {
    await field(page, key, value);
  }
  const pricingDate = page.getByLabel(en.fields.pricingDate, { exact: true });
  await field(page, "excellencePercentage", "12.345");
  await field(page, "trend", "  North  ");
  await save(page).click();
  await expect(pricingDate).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#field-excellencePercentage")).toHaveAttribute("aria-invalid", "true");
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  await field(page, "excellencePercentage", "12.35");
  await pricingDate.fill("2026-11-25T14:30");
  await save(page).click();
  await expect(page).toHaveURL(/\/admin\/units\/[0-9a-f-]+\?projectId=/);
  await expect(page.getByText(en.paymentPlan.title, { exact: true })).toHaveCount(0);
  expect(server.calls.filter((call) => call.method === "POST").map((call) => call.body)).toEqual([
    {
      number: "Standalone", meterPrice: 50, floorNumber: 1, size: 90, neighborMeterPrice: 60,
      excellencePercentage: 12.35, trend: "North", pricingDate: "2026-11-25T14:30:00+02:00",
    },
  ]);
  await expect(page.locator("#field-projectId")).toHaveValue(catalogueIds.project);
  await expect(page.locator("#field-projectId")).toBeDisabled();
  await expect(page.getByText(en.unitProjectFixed, { exact: true })).toBeVisible();
  await expect(pricingDate).toHaveValue("2026-11-25T14:30");
  await expect(page.getByLabel(en.fields.trend, { exact: true })).toHaveValue("North");
  await expect(page.getByLabel(en.fields.excellencePercentage, { exact: true })).toHaveValue("12.35");
  await field(page, "number", "Updated standalone");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const patch = server.calls.findLast((call) => call.method === "PATCH")!;
  expect(patch.url.searchParams.get("projectId")).toBe(catalogueIds.project);
  expect(patch.body).not.toHaveProperty("projectId");
  expect(patch.body).not.toHaveProperty("paymentPlan");
  expect(patch.body).toMatchObject({ pricingDate: null });

  await pricingDate.fill("2026-11-24T13:15");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "PATCH")?.body).toMatchObject({
    meterPrice: 50, pricingDate: "2026-11-24T13:15:00+02:00",
  });

  await pricingDate.fill("");
  await field(page, "meterPrice", "51");
  await expect(pricingDate).toHaveAttribute("required", "");
  await save(page).click();
  await expect(pricingDate).toHaveAttribute("aria-invalid", "true");
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(2);
  await pricingDate.fill("2026-11-26T09:00");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "PATCH")?.body).toMatchObject({
    meterPrice: 51, pricingDate: "2026-11-26T09:00:00+02:00",
  });
});

test("legacy regular units add and replace payment plans independently of the record draft", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  server.projects.set(catalogueIds.project, { ...catalogueProject, projectType: ProjectType.Regular });
  await seedRouting(page, "admin");
  await page.goto(unitPath);
  const plan = page.getByRole("form", { name: en.paymentPlan.title });
  const name = plan.getByLabel(en.paymentPlan.installmentName, { exact: true });
  const percent = plan.getByLabel(en.paymentPlan.installmentPercentage, { exact: true });
  const number = plan.getByLabel(en.paymentPlan.installmentNumber, { exact: true });
  const savePlan = plan.getByRole("button", { name: en.paymentPlan.save });
  const writes = () => server.calls.filter((call) => call.method === "PUT" && call.url.pathname.endsWith("/payment-plan"));
  await expect(number).toHaveValue("1");
  await expect(plan.getByLabel(en.paymentPlan.installmentPeriodMonths, { exact: true })).toHaveValue("0");
  expect(server.calls.filter((call) => call.url.pathname === `/api/v1/projects/${catalogueIds.project}`)).toHaveLength(1);

  await field(page, "number", "Unsaved record number");
  await name.selectOption("Downpayment");
  await percent.fill("100");
  await savePlan.click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(writes()).toHaveLength(1);
  expect(writes()[0]?.body).toEqual({ paymentPlan: [
    { installmentName: "Downpayment", installmentNumber: 1, installmentPercentage: 100, installmentPeriodMonths: 0 },
  ] });
  await expect(page.locator("#field-number")).toHaveValue("Unsaved record number");

  await name.selectOption("Deposit");
  await percent.fill("٣٣٫٣٣٣٣");
  await plan.getByRole("button", { name: en.paymentPlan.add }).click();
  await name.nth(1).selectOption("Installment");
  await number.nth(1).fill("3");
  await percent.nth(1).fill("٦٦٫٦٦٦٧");
  await plan.getByLabel(en.paymentPlan.installmentPeriodMonths, { exact: true }).nth(1).fill("٦");
  server.state.failNext = 409;
  await savePlan.click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  expect(writes()).toHaveLength(2);
  await expect(percent.nth(0)).toHaveValue("٣٣٫٣٣٣٣");
  await expect(name.nth(1)).toHaveValue("Installment");
  await savePlan.click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(writes()).toHaveLength(3);
  expect(writes()[2]).toMatchObject({ body: { paymentPlan: [
    { installmentName: "Deposit", installmentNumber: 1, installmentPercentage: 33.3333, installmentPeriodMonths: 0 },
    { installmentName: "Installment", installmentNumber: 3, installmentPercentage: 66.6667, installmentPeriodMonths: 6 },
  ] } });
  expect(writes()[2]?.url.search).toBe("");
  await expect(percent.nth(0)).toHaveValue("33.3333");
  await expect(page.locator("#field-number")).toHaveValue("Unsaved record number");
  expect(server.calls.some((call) => call.method === "PATCH")).toBe(false);
});

test("installment name options are localized and saved custom names remain selected", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  server.projects.set(catalogueIds.project, { ...catalogueProject, projectType: ProjectType.Regular });
  const unit = server.units.get(catalogueIds.unit)!;
  server.units.set(unit.id, { ...unit, paymentPlan: cataloguePaymentPlan });
  await seedRouting(page, "admin", "ar");
  await page.goto(unitPath);
  const selects = page.getByRole("combobox", { name: ar.paymentPlan.installmentName, exact: true });
  await expect(selects.nth(1)).toHaveValue(cataloguePaymentPlan[1]!.installmentName);
  await page.getByRole("button", { name: ar.paymentPlan.add, exact: true }).click();
  await expect(selects.nth(2)).toHaveValue("");
  await expect(selects.nth(2).locator("option:not([disabled])")).toHaveText([
    ar.paymentPlan.names.downpayment, ar.paymentPlan.names.installment, ar.paymentPlan.names.deposit,
  ]);
});

test("area editing owns its required city selection and maps the new relationship", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(`/admin/areas/${catalogueIds.area}`);
  await page.locator("#field-cityId").selectOption("");
  await save(page).click();
  await expect(page.locator("#field-cityId")).toHaveAttribute("aria-invalid", "true");
  expect(server.calls.some((call) => call.method === "PATCH")).toBe(false);
  await page.locator("#field-cityId").selectOption(catalogueIds.city2);
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "PATCH")!.body).toEqual({ name: "East Quarter", cityId: catalogueIds.city2 });
});

test("create, edit and delete a complete hierarchy with selected parents and full update payloads", async ({ page, context }) => {
  test.setTimeout(120000);
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(`${base}/cities?create=1`);
  await field(page, "name", "New city");
  await save(page).click();
  await expect(page).toHaveURL(/\/cities\/[0-9a-f-]+$/);
  const cityId = page.url().split("/").at(-1)!;
  await field(page, "name", "Renamed city");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.goto(`${base}/areas?create=1`);
  await field(page, "name", "New area");
  await page.locator("#field-cityId").selectOption(cityId);
  await save(page).click();
  await expect(page).toHaveURL(/\/areas\/[0-9a-f-]+$/);
  const areaId = page.url().split("/").at(-1)!;
  await field(page, "name", "Renamed area");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.goto(`${base}/projects?create=1`);
  await field(page, "name", "New project");
  await page.locator("#field-areaId").selectOption(areaId);
  for (const [key, value] of Object.entries({ size: "1200", price: "100000", floorCount: "4", plannedUnitCount: "8" })) {
    await field(page, key, value);
  }
  await save(page).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
  const projectId = page.url().split("/").at(-1)!;
  await field(page, "description", "Full update without nested images");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: en.createUnit, exact: true }).click();
  for (const [key, value] of Object.entries({ number: "N-1", meterPrice: "50", floorNumber: "1", size: "90", trend: "West", excellencePercentage: "100" })) {
    await field(page, key, value);
  }
  await expect(page.locator("#field-pricingDate")).toHaveCount(0);
  const planName = page.getByLabel(en.paymentPlan.installmentName, { exact: true });
  await expect(planName.locator("option:not([disabled])")).toHaveText(["Downpayment", "Installment", "Deposit"]);
  await planName.selectOption("Downpayment");
  const percentage = page.getByLabel(en.paymentPlan.installmentPercentage, { exact: true });
  await percentage.fill("95");
  await save(page).click();
  await expect(page.getByRole("alert").getByText("Installment percentages must total 100%. The entered total is 95%.")).toBeVisible();
  const createCalls = () => server.calls.filter((call) => call.method === "POST" && call.url.pathname.endsWith("/units"));
  expect(createCalls()).toHaveLength(0);
  await percentage.fill("100");
  await save(page).click();
  await expect(page).toHaveURL(/\/units\/[0-9a-f-]+\?projectId=/);
  expect(createCalls().map((call) => call.body)).toEqual([{
    number: "N-1", meterPrice: 50, floorNumber: 1, size: 90, neighborMeterPrice: null,
    excellencePercentage: 100, trend: "West", pricingDate: null,
    paymentPlan: [{ installmentName: "Downpayment", installmentNumber: 1, installmentPercentage: 100, installmentPeriodMonths: 0 }],
  }]);
  const unitId = new URL(page.url()).pathname.split("/").at(-1)!;
  await field(page, "number", "N-2");
  await field(page, "trend", "");
  await field(page, "excellencePercentage", "0");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const unitPatch = server.calls.findLast((call) => call.method === "PATCH" && call.url.pathname.endsWith(`/units/${unitId}`))!;
  expect(unitPatch.url.searchParams.get("projectId")).toBe(projectId);
  expect(unitPatch.body).toEqual({
    number: "N-2", meterPrice: 50, floorNumber: 1, size: 90, neighborMeterPrice: null,
    excellencePercentage: 0, trend: "", pricingDate: null,
  });
  const projectPatch = server.calls.findLast((call) => call.method === "PATCH" && call.url.pathname.endsWith(`/projects/${projectId}`))!;
  expect(Object.keys(projectPatch.body as object).sort()).toEqual(Object.keys(expectedProject).sort());
  await deleteCurrent(page);
  expect(server.calls.findLast((call) => call.method === "DELETE")!.url.searchParams.get("projectId")).toBe(projectId);
  await page.goto(`${base}/projects/${projectId}`);
  await deleteCurrent(page);
  await page.goto(`${base}/areas/${areaId}`);
  await deleteCurrent(page);
  await page.goto(`${base}/cities/${cityId}`);
  await deleteCurrent(page);
  expect(server.cities.has(cityId)).toBe(false);
  expect(server.areas.has(areaId)).toBe(false);
  expect(server.projects.has(projectId)).toBe(false);
  expect(server.units.has(unitId)).toBe(false);
});

test("project PATCH includes all inputs, preserves nulls and edits after a 409 without replay", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(projectPath);
  await expect(page.locator("#field-drawDate")).toHaveAttribute("type", "datetime-local");
  await expect(page.locator("#field-drawDate")).toHaveValue("2026-12-01T14:00");
  await field(page, "name", "Recovered draft");
  await field(page, "latitude", "");
  server.state.failNext = 409;
  await save(page).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator("#field-name")).toHaveValue("Recovered draft");
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  expect(server.calls.find((call) => call.method === "PATCH")!.body).toEqual({ ...expectedProject, name: "Recovered draft", latitude: null });
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.locator("#field-projectType").selectOption("0");
  await expect(page.locator("#field-neighborPrice")).toHaveValue("");
  await expect(page.locator("#field-drawDate")).toHaveValue("");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect((server.calls.findLast((call) => call.method === "PATCH")!.body as Record<string, unknown>).drawDate).toBeNull();
});

test("amenity replacement confirms full collection loss and keeps independent record edits", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(`${base}/areas/${catalogueIds.area}`);
  await field(page, "name", "Unsaved area name");
  await page.locator("#amenity-name-0").fill("Parking");
  await page.locator("#amenity-value-0").fill("Included");
  await page.getByRole("button", { name: en.replaceAmenities, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(en.replacementHint);
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.find((call) => call.method === "PUT")!.body).toEqual({ amenities: [{ name: "Parking", value: "Included" }] });
  await expect(page.locator("#field-name")).toHaveValue("Unsaved area name");
  await page.getByRole("button", { name: en.removeRow }).click();
  await page.getByRole("button", { name: en.replaceAmenities, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "PUT")!.body).toEqual({ amenities: [] });
});

test("image upload, exact multipart, metadata and confirmed deletion work with delivery placeholders", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(projectPath);
  await page.locator("#amenity-value-0").fill("Updated project garden");
  await page.getByRole("button", { name: en.replaceAmenities, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.find((call) => call.method === "PUT")!.body).toEqual({ amenities: [{ name: "Garden", value: "Updated project garden" }] });
  await page.locator("#upload-file").setInputFiles({ name: "local.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: en.localPreview })).toBeVisible();
  await page.locator("#upload-alt").fill("Uploaded alt");
  await page.getByRole("button", { name: en.upload, exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const upload = server.calls.find((call) => call.method === "POST")!;
  expect(upload.raw.match(/name="File"/g)).toHaveLength(1);
  expect(upload.raw).toContain('name="AltText"');
  expect(upload.raw).toContain("Uploaded alt");
  await expect(page.getByRole("img", { name: en.localPreview })).toHaveCount(0);
  await page.locator(`#alt-${imageId}`).fill("Edited alt");
  await page
    .locator("article")
    .filter({ has: page.locator(`#alt-${imageId}`) })
    .getByRole("button", { name: en.saveImage })
    .click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.find((call) => call.method === "PATCH")!.body).toEqual({ altText: "Edited alt" });
  await page
    .locator("article")
    .filter({ has: page.locator(`#alt-${imageId}`) })
    .getByRole("button", { name: en.deleteImage })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.locator(`#alt-${imageId}`)).toHaveCount(0);
  expect(await page.locator("body").textContent()).not.toContain("PRIVATE-STORAGE");
});

test("unit amenities, upload, nullable metadata and image deletion use their approved parent scope", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(unitPath);
  await page.locator("#amenity-value-0").fill("Updated unit amenity");
  await page.getByRole("button", { name: en.replaceAmenities, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.locator("#upload-file").setInputFiles({ name: "unit.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: en.upload, exact: true }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const image = server.units.get(catalogueIds.unit)!.images[0]!;
  await page.locator(`#alt-${image.id}`).fill("Unit photo");
  await page.getByRole("button", { name: en.saveImage }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  await page.locator(`#alt-${image.id}`).fill("");
  await page.getByRole("button", { name: en.saveImage }).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.findLast((call) => call.method === "PATCH")!.body).toEqual({ altText: null });
  await page.getByRole("button", { name: en.deleteImage }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.locator(`#alt-${image.id}`)).toHaveCount(0);
  const writes = server.calls.filter((call) => call.method !== "GET");
  expect(writes.every((call) => call.url.pathname.startsWith(`/api/v1/admin/units/${catalogueIds.unit}/`) && !call.url.search)).toBe(true);
  expect(writes.find((call) => call.method === "POST")!.raw).not.toContain('name="AltText"');
});

test("invalid files, rejected uploads and uncertain writes keep the draft and do not replay", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(unitPath);
  await page.locator("#upload-file").setInputFiles({ name: "too-big.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByText(en.fileSize, { exact: true })).toBeVisible();
  await page.locator("#upload-file").setInputFiles({ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.getByText(en.fileType, { exact: true })).toBeVisible();
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(0);
  await page.locator("#upload-file").setInputFiles({ name: "valid.png", mimeType: "image/png", buffer: png });
  await page.locator("#upload-alt").fill("Retained upload");
  for (const status of [413, 415, 429]) {
    server.state.failNext = status;
    await page.getByRole("button", { name: en.upload, exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("#upload-alt")).toHaveValue("Retained upload");
    await expect(page.getByRole("button", { name: en.upload, exact: true })).toBeEnabled();
  }
  server.state.failNext = 503;
  await page.getByRole("button", { name: en.upload, exact: true }).click();
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.upload, exact: true })).toBeDisabled();
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(4);
  await page.getByRole("button", { name: en.check }).click();
  await expect(page.getByRole("button", { name: en.upload, exact: true })).toBeEnabled();
  await expect(page.locator("#upload-alt")).toHaveValue("Retained upload");
});

test("a removed image retains its text draft after conflict and local previews are revoked", async ({ page, context }) => {
  await page.addInitScript(() => {
    const nativeCreate = URL.createObjectURL.bind(URL),
      nativeRevoke = URL.revokeObjectURL.bind(URL);
    const counts = { created: 0, revoked: 0 };
    Object.assign(window, { previewCounts: counts });
    URL.createObjectURL = (blob) => {
      counts.created += 1;
      return nativeCreate(blob);
    };
    URL.revokeObjectURL = (url) => {
      counts.revoked += 1;
      nativeRevoke(url);
    };
  });
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(projectPath);
  await page.locator(`#alt-${imageId}`).fill("Recoverable removed image text");
  server.state.removeImageOnConflict = true;
  server.state.failNext = 409;
  await page.getByRole("button", { name: en.saveImage }).click();
  await expect(page.getByText(en.imageRemoved, { exact: true })).toBeVisible();
  await expect(page.locator(`#alt-${imageId}`)).toHaveValue("Recoverable removed image text");
  await expect(page.getByRole("button", { name: en.saveImage })).toBeDisabled();
  await page.locator("#upload-file").setInputFiles({ name: "first.png", mimeType: "image/png", buffer: png });
  await expect(page.getByRole("img", { name: en.localPreview })).toBeVisible();
  await page.locator("#upload-file").setInputFiles({ name: "second.png", mimeType: "image/png", buffer: png });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { previewCounts: { revoked: number } }).previewCounts.revoked))
    .toBeGreaterThan(0);
  await dashboardLink(page, "Cities");
  await page.getByRole("button", { name: en.discard }).click();
  await expect(page.locator("#upload-file")).toHaveCount(0);
  const counts = await page.evaluate(() => (window as unknown as { previewCounts: { created: number; revoked: number } }).previewCounts);
  expect(counts.revoked).toBe(counts.created);
});

test("pending writes block duplicate dispatch and navigation until the current read finishes", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(`${base}/cities/${catalogueIds.city2}`);
  await field(page, "name", "Slow save");
  server.state.delayWrite = 1200;
  await save(page).click();
  await expect(page.locator('form button[type="submit"]')).toBeDisabled();
  await dashboardLink(page, "Areas");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: en.discard })).toBeDisabled();
  await expect(page.getByRole("dialog").getByRole("button", { name: en.stay })).toBeEnabled();
  await page.getByRole("button", { name: en.stay }).click();
  await expect(page.locator("#field-name")).toHaveValue("Slow save");
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
});

test("project links to an independent units list and confirms leaving its draft", async ({ page, context }) => {
  await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(projectPath);
  await field(page, "name", "Draft retained while searching units");
  await page.getByRole("link", { name: en.units, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(en.leaveDescription);
  await page.getByRole("button", { name: en.stay }).click();
  await expect(page.locator("#field-name")).toHaveValue("Draft retained while searching units");
});

test("parent selectors page/search, validation attaches safe server fields, and navigation preserves unsaved edits", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  server.state.extraParents = true;
  await seedRouting(page, "admin");
  await page.goto(`${base}/areas?create=1`);
  const selector = page.locator("#parent-search-city").locator("..").locator("..");
  await selector.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator("#field-cityId")).toContainText("Parent 21");
  await page.locator("#parent-search-city").fill("Cairo");
  await expect(page.locator("#field-cityId")).toContainText("Cairo");
  await save(page).click();
  await expect(page.locator("#field-name")).toHaveAttribute("aria-invalid", "true");
  await field(page, "name", "Draft area");
  await page.locator("#field-cityId").selectOption(catalogueIds.city);
  server.state.failNext = 400;
  await save(page).click();
  await expect(page.locator("#field-name")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("link", { name: "Back to list" }).click();
  await expect(page.getByRole("dialog")).toContainText(en.leaveDescription);
  await page.getByRole("button", { name: en.stay }).click();
  await expect(page.locator("#field-name")).toHaveValue("Draft area");
  await page.getByRole("link", { name: "Back to list" }).click();
  await page.getByRole("button", { name: en.discard }).click();
  await expect(page.locator("#field-name")).toHaveCount(0);
});

test("a conflicting delete reloads the record, a read outage blocks writes, and logout drops the editor", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(`${base}/cities/${catalogueIds.city}`);
  await field(page, "name", "Recoverable city");
  await page.getByRole("button", { name: en.deleteRecord, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm }).click();
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator("#field-name")).toHaveValue("Recoverable city");
  expect(server.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  server.state.failReads = true;
  await save(page).click();
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  await expect(save(page)).toBeDisabled();
  server.state.failReads = false;
  await page.getByRole("button", { name: en.check }).click();
  await expect(save(page)).toBeEnabled();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#field-name")).toHaveCount(0);
  await expect(page.locator("#auth-password")).toBeVisible();
});

for (const language of ["ar", "en"] as const) {
  test(`${language} admin tables, long forms, media and confirmations have RTL/LTR evidence`, async ({ page, context }) => {
    const server = await adminCatalogueServer(context);
    const text = language === "ar" ? ar : en;
    server.projects.set(catalogueIds.project, {
      ...server.projects.get(catalogueIds.project)!,
      name: "A long supplied project name with several words for wrapping and layout review",
    });
    await seedRouting(page, "admin", language);
    await mkdir("test-results/dashboard-features", { recursive: true });
    async function capture(name: string) {
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/dashboard-features/${language}-${page.viewportSize()!.width}-${name}.png`, fullPage: true });
    }
    await page.goto(`${base}/projects`);
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await capture("table");
    await page.getByRole("link", { name: text.editRecord, exact: true }).click();
    await expect(page.locator("#field-name")).toBeVisible();
    await capture("project");
    await page.locator("#upload-file").setInputFiles({ name: "preview.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("img", { name: text.localPreview })).toBeVisible();
    await page.getByRole("heading", { name: text.images, exact: true }).scrollIntoViewIfNeeded();
    await capture("media");
    await page.getByRole("button", { name: text.replaceAmenities, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await capture("confirmation");
    await page.getByRole("dialog").getByRole("button", { name: text.cancel, exact: true }).click();
  });
}
