import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { adminCatalogueServer, imageId } from "./adminCatalogueFixtures";
import { seedRouting } from "./routingFixtures";
import { catalogueIds, catalogueProject } from "./catalogueFixtures";
import en from "../../src/i18n/locales/en/admin.json" with { type: "json" };
import ar from "../../src/i18n/locales/ar/admin.json" with { type: "json" };

const base = "/admin/catalogue";
const projectPath = `${base}/projects/${catalogueIds.project}`;
const unitPath = `${projectPath}/units/${catalogueIds.unit}`;
const save = (page: Page) => page.getByRole("button", { name: "Save record", exact: true });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64");
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
  drawDate: "2026-12-01T12:00:00Z",
};

async function field(page: Page, name: string, value: string) {
  await page.locator(`#field-${name}`).fill(value);
}

async function deleteCurrent(page: Page) {
  await page.getByRole("button", { name: "Delete record", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm action" }).click();
  await expect(page.getByText("The record was deleted.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to list" }).click();
}

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
  await page.getByRole("link", { name: "Create record", exact: true }).click();
  for (const [key, value] of Object.entries({ number: "N-1", meterPrice: "50", floorNumber: "1", size: "90" })) {
    await field(page, key, value);
  }
  await save(page).click();
  await expect(page).toHaveURL(/\/units\/[0-9a-f-]+$/);
  const unitId = page.url().split("/").at(-1)!;
  await field(page, "number", "N-2");
  await save(page).click();
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const unitPatch = server.calls.findLast((call) => call.method === "PATCH" && call.url.pathname.endsWith(`/units/${unitId}`))!;
  expect(unitPatch.url.searchParams.get("projectId")).toBe(projectId);
  expect(unitPatch.body).toEqual({ number: "N-2", meterPrice: 50, floorNumber: 1, size: 90, neighborMeterPrice: null });
  const projectPatch = server.calls.findLast((call) => call.method === "PATCH" && call.url.pathname.endsWith(`/projects/${projectId}`))!;
  expect(Object.keys(projectPatch.body as object).sort()).toEqual(Object.keys(expectedProject).sort());
  await deleteCurrent(page);
  expect(server.calls.findLast((call) => call.method === "DELETE")!.url.searchParams.get("projectId")).toBe(projectId);
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
  await page.getByRole("navigation", { name: "Catalogue", exact: true }).getByRole("link", { name: "Cities", exact: true }).click();
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
  await page.getByRole("navigation", { name: "Catalogue", exact: true }).getByRole("link", { name: "Areas", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: en.discard })).toBeDisabled();
  await expect(page.getByRole("dialog").getByRole("button", { name: en.stay })).toBeEnabled();
  await page.getByRole("button", { name: en.stay }).click();
  await expect(page.locator("#field-name")).toHaveValue("Slow save");
  expect(server.calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
});

test("unit-list search retains the project draft and its later leave confirmation", async ({ page, context }) => {
  const server = await adminCatalogueServer(context);
  await seedRouting(page, "admin");
  await page.goto(projectPath);
  await field(page, "name", "Draft retained while searching units");
  await page.locator("#search-unit").fill("A-204");
  await expect
    .poll(() => server.calls.some((call) => call.url.pathname.endsWith("/units") && call.url.searchParams.get("search") === "A-204"))
    .toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#field-name")).toHaveValue("Draft retained while searching units");
  await page.getByRole("navigation", { name: "Catalogue", exact: true }).getByRole("link", { name: "Cities", exact: true }).click();
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
    await mkdir("docs/evidence/part_08", { recursive: true });
    async function capture(name: string) {
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/evidence/part_08/${language}-${page.viewportSize()!.width}-${name}.png`, fullPage: true });
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
