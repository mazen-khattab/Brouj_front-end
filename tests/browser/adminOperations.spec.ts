import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { adminOperationsServer, operationsIds as ids } from "./adminOperationsFixtures";
import { seedRouting } from "./routingFixtures";
import en from "../../src/i18n/locales/en/admin.json" with { type: "json" };
import ar from "../../src/i18n/locales/ar/admin.json" with { type: "json" };
import errors from "../../src/i18n/locales/en/errors.json" with { type: "json" };
import common from "../../src/i18n/locales/en/common.json" with { type: "json" };

const text = en.operations;
const customerPath = `/admin/customers/${ids.customer}`;
const reservationPath = `/admin/reservations/${ids.reservation}`;
const orderPath = `/admin/orders/${ids.order}`;

async function confirm(page: Page, title: string) {
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: text.confirm, exact: true }).click();
}

test("customer soft deletion and restoration preserve records and work from table/detail with keyboard", async ({ page, context }) => {
  const server = await adminOperationsServer(context, "superAdmin");
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/customers");
  await page.locator("#ops-deleted").selectOption("false");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const remove = page.getByRole("button", { name: text.softDelete, exact: true });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(text.deletionDescription);
  await page.getByRole("dialog").getByRole("button", { name: text.confirm, exact: true }).press("Enter");
  await expect(page.getByText(text.deletionSaved, { exact: true })).toBeVisible();
  expect(server.customers.get(ids.customer)?.deletedAt).not.toBeNull();
  await page.locator("#ops-deleted").selectOption("true");
  await page.getByRole("link", { name: "Synthetic Customer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/customers/${ids.customer}$`));
  await expect(page.getByRole("button", { name: text.restore, exact: true })).toBeEnabled();
  await confirm(page, text.restore);
  await expect(page.getByText(text.restorationSaved, { exact: true })).toBeVisible();
  expect(server.customers.get(ids.customer)?.deletedAt).toBeNull();
  expect(server.calls.filter((call) => call.method !== "GET").map((call) => [call.method, call.url.pathname, call.bodyBytes])).toEqual([
    ["DELETE", `/api/v1/admin/customers/${ids.customer}`, 0],
    ["POST", `/api/v1/admin/customers/${ids.customer}/restore`, 0],
  ]);
  await expect(page.getByRole("button", { name: /register|edit customer/i })).toHaveCount(0);
});

test("customer paging/search is bounded, keeps failed filters and excludes personal search text from SPA history/storage", async ({
  page,
  context,
}) => {
  const server = await adminOperationsServer(context);
  server.state.extraCustomers = 22;
  await seedRouting(page, "admin");
  await page.goto("/admin/customers?pageSize=20&dateFrom=2020&extra=1");
  await expect(page).toHaveURL(/\/admin\/customers$/);
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: common.pagination.next, exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.locator("#ops-page-size").selectOption("100");
  await expect(page.locator("tbody tr")).toHaveCount(24);
  const previousHistory = await page.evaluate(() => history.length);
  await page.locator("#ops-search").fill("fixture-customer@example.test");
  await expect.poll(() => server.calls.some((call) => call.url.searchParams.get("search") === "fixture-customer@example.test")).toBe(true);
  expect(await page.evaluate(() => history.length)).toBe(previousHistory);
  server.state.readStatus = 503;
  await page.getByRole("button", { name: text.refresh, exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#ops-search")).toHaveValue("fixture-customer@example.test");
  expect(page.url()).not.toContain("fixture-customer");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("fixture-customer");
  server.state.readStatus = 0;
  await page.getByRole("button", { name: common.retry, exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(24);
  expect(
    server.calls
      .filter((call) => call.method === "GET" && call.url.pathname === "/api/v1/admin/customers")
      .every((call) => [...call.url.searchParams.keys()].every((key) => ["pageNumber", "pageSize", "search", "isDeleted"].includes(key))),
  ).toBe(true);
});

test("restoration conflict reloads the customer and preserves deleted status without replay", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto(`/admin/customers/${ids.deletedCustomer}`);
  server.state.writeStatus = 409;
  await confirm(page, text.restore);
  await expect(page.getByText(text.restorationConflict, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.restore, exact: true })).toBeEnabled();
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(server.customers.get(ids.deletedCustomer)?.deletedAt).not.toBeNull();
});

test("staff reservation lookup converts once with no body and re-reads the returned order and reservation", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin/reservations?status=0&dateFrom=2020&customerId=unsupported");
  await expect(page).toHaveURL(/\/admin\/reservations\?status=0$/);
  await page.getByRole("link", { name: "R-OPEN", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/reservations/${ids.reservation}$`));
  await expect(page.getByRole("button", { name: text.convert, exact: true })).toBeEnabled();
  server.state.delayWrite = 500;
  await page.getByRole("button", { name: text.convert, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(text.conversionDescription);
  await page.getByRole("dialog").getByRole("button", { name: text.confirm, exact: true }).dblclick();
  await expect(page.getByText(text.conversionSaved, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.convert, exact: true })).toHaveCount(0);
  const writes = server.calls.filter((call) => call.method === "POST");
  expect(writes).toHaveLength(1);
  expect(writes[0]!.bodyBytes).toBe(0);
  expect(server.calls.some((call) => call.url.pathname === `/api/v1/admin/orders/${ids.created}` && call.method === "GET")).toBe(true);
  await page.getByRole("link", { name: "Order details", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${ids.created}$`));
  await expect(page.getByText("O-CREATED", { exact: true })).toBeVisible();
  await expect(page.getByText(/987,654\.32/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservation details", exact: true })).toHaveAttribute("href", reservationPath);
  expect(server.session.calls.filter((path) => /\/(reservations|orders)\/me/.test(path))).toEqual([]);
  await expect(page.getByRole("link").filter({ hasText: "A-204" })).toHaveCount(0);
  await expect(page.getByLabel(text.customerName)).toHaveCount(0);
});

test("stale/repeated conversion refreshes the linked order without creating another one", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto(reservationPath);
  server.state.writeStatus = 409;
  server.state.staleConversion = true;
  await confirm(page, text.convert);
  await expect(page.getByText(text.conversionConflict, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.convert, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Order details", exact: true })).toHaveAttribute("href", `/admin/orders/${ids.created}`);
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("initiative completion confirms competing-order cancellation, submits no body, and refreshes server state", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin/orders?status=0");
  await page.getByRole("link", { name: "O-PENDING", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${ids.order}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order details");
  await page.getByRole("button", { name: text.complete, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(text.completionDescription);
  server.state.delayWrite = 500;
  await page.getByRole("dialog").getByRole("button", { name: text.confirm, exact: true }).dblclick();
  await expect(page.getByText(text.completionSaved, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.complete, exact: true })).toHaveCount(0);
  expect(server.orders.get(ids.order)?.status).toBe(2);
  expect(server.orders.get(ids.competitor)?.status).toBe(3);
  expect(server.calls.filter((call) => call.method === "POST").map((call) => [call.url.pathname, call.bodyBytes])).toEqual([
    [`/api/v1/admin/orders/${ids.order}/complete`, 0],
  ]);
  await page.goto(`/admin/orders/${ids.regular}`);
  await expect(page.getByText("O-REGULAR", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.complete, exact: true })).toHaveCount(0);
  await page.goto(`/admin/orders/${ids.completed}`);
  await expect(page.getByText("O-COMPLETED", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.complete, exact: true })).toHaveCount(0);
});

test("completion status races and unsupported initiative eligibility are rejected safely by the handler", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto(orderPath);
  server.state.staleCompletion = true;
  server.state.writeStatus = 409;
  await confirm(page, text.complete);
  await expect(page.getByText(text.completionConflict, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.complete, exact: true })).toHaveCount(0);
  // The DTO lacks project type; this deliberately inconsistent Pending regular fixture must still be refused by the server.
  server.orders.set(ids.regular, { ...server.orders.get(ids.regular)!, status: 0 });
  await page.goto(`/admin/orders/${ids.regular}`);
  await confirm(page, text.complete);
  await expect(page.getByText(text.completionConflict, { exact: true })).toBeVisible();
  expect(server.orders.get(ids.regular)?.status).toBe(0);
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(2);
});

test("an uncertain committed conversion is checked by reads and never automatically repeated", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto(reservationPath);
  server.state.writeStatus = 503;
  server.state.commitOnError = true;
  await confirm(page, text.convert);
  await expect(page.getByText(text.conversionUncertain, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: text.convert, exact: true })).toBeDisabled();
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await page.getByRole("button", { name: text.check, exact: true }).click();
  await expect(page.getByRole("link", { name: "Order details", exact: true })).toHaveAttribute("href", `/admin/orders/${ids.created}`);
  await expect(page.getByRole("button", { name: text.convert, exact: true })).toHaveCount(0);
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("a failed post-conversion order read retains the known result and checks it without another POST", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto(reservationPath);
  server.state.failOrderRead = true;
  await confirm(page, text.convert);
  await expect(page.getByText(text.conversionUncertain, { exact: true })).toBeVisible();
  server.state.failOrderRead = false;
  await page.getByRole("button", { name: text.check, exact: true }).click();
  await expect(page.getByRole("button", { name: text.check, exact: true })).toHaveCount(0);
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(server.calls.filter((call) => call.url.pathname.endsWith(`/orders/${ids.created}`))).toHaveLength(2);
});

test("checking an uncertain list action preserves a subsequently selected status filter", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin/reservations?status=0");
  server.state.writeStatus = 503;
  server.state.commitOnError = true;
  await confirm(page, text.convert);
  await expect(page.getByText(text.conversionUncertain, { exact: true })).toBeVisible();
  await page.locator("#ops-status").selectOption("2");
  await expect(page.getByRole("link", { name: "R-OPEN", exact: true })).toBeVisible();
  await page.getByRole("button", { name: text.check, exact: true }).click();
  await expect(page.getByRole("button", { name: text.check, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "R-OPEN", exact: true })).toBeVisible();
  await expect(page.locator("#ops-status")).toHaveValue("2");
  expect(
    server.calls.findLast((call) => call.method === "GET" && call.url.pathname === "/api/v1/admin/reservations")!.url.searchParams.get("status"),
  ).toBe("2");
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

for (const operation of ["deletion", "completion"] as const) {
  test(`uncertain ${operation} and failed current-data reads stay blocked until explicit reconciliation`, async ({ page, context }) => {
    const server = await adminOperationsServer(context);
    await seedRouting(page, "admin");
    await page.goto(operation === "deletion" ? customerPath : orderPath);
    server.state.writeStatus = 503;
    server.state.commitOnError = true;
    await confirm(page, operation === "deletion" ? text.softDelete : text.complete);
    await expect(page.getByText(text[`${operation}Uncertain`], { exact: true })).toBeVisible();
    server.state.readStatus = 503;
    await page.getByRole("button", { name: text.check, exact: true }).click();
    await expect(page.getByRole("button", { name: text.check, exact: true })).toBeEnabled();
    server.state.readStatus = 0;
    await page.getByRole("button", { name: text.check, exact: true }).click();
    await expect(page.getByRole("button", { name: text.check, exact: true })).toHaveCount(0);
    if (operation === "deletion") {
      await expect(page.getByRole("button", { name: text.restore, exact: true })).toBeEnabled();
    } else {
      await expect(page.getByRole("button", { name: text.complete, exact: true })).toHaveCount(0);
    }
    expect(server.calls.filter((call) => call.method !== "GET")).toHaveLength(1);
  });
}

test("403/404/429 and empty results remain scoped, translated and retryable without hidden joins", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  for (const [status, key] of [
    [403, "forbidden"],
    [404, "notFound"],
    [429, "rateLimited"],
  ] as const) {
    server.state.readStatus = status;
    await page.goto("/admin/customers");
    await expect(page.getByRole("alert")).toContainText(errors[key]);
  }
  server.state.readStatus = 0;
  await page.getByRole("button", { name: common.retry, exact: true }).click();
  await page.locator("#ops-search").fill("no-matching-fixture");
  await expect(page.getByRole("cell", { name: common.emptyTitle, exact: true })).toBeVisible();
  await page.goto("/admin/reservations/not-a-guid");
  await expect(page.getByRole("alert")).toContainText(errors.notFound);
  expect(server.calls.some((call) => call.url.pathname.includes("not-a-guid"))).toBe(false);
  await page.goto("/admin/orders/c9999999-0000-4000-8000-000000000001");
  await expect(page.getByRole("alert")).toContainText(errors.notFound);
  expect(server.calls.filter((call) => /c9999999/.test(call.url.pathname))).toHaveLength(1);
});

test("throttled/forbidden writes preserve filters and state, with no retry; staff logout clears private views", async ({ page, context }) => {
  const server = await adminOperationsServer(context);
  await seedRouting(page, "admin");
  await page.goto("/admin/customers?isDeleted=false");
  for (const status of [429, 403]) {
    server.state.writeStatus = status;
    await confirm(page, text.softDelete);
    await expect(page.getByRole("alert")).toContainText(status === 429 ? errors.rateLimited : errors.forbidden);
    await expect(page.locator("#ops-deleted")).toHaveValue("false");
    expect(server.customers.get(ids.customer)?.deletedAt).toBeNull();
  }
  expect(server.calls.filter((call) => call.method !== "GET")).toHaveLength(2);
  await page.getByRole("link", { name: "Synthetic Customer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/customers/${ids.customer}$`));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.locator("#auth-password")).toBeVisible();
  await expect(page.getByText("fixture-customer@example.test", { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.locator("#auth-password")).toBeVisible();
  await expect(page.getByText("fixture-customer@example.test", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("fixture-customer");
});

for (const language of ["ar", "en"] as const) {
  test(`${language} operational tables, details and confirmations have masked bilingual keyboard/mobile evidence`, async ({ page, context }) => {
    test.setTimeout(60000);
    const server = await adminOperationsServer(context);
    const labels = (language === "ar" ? ar : en).operations;
    const longName = "A supplied project name with long words for operational table wrapping and mobile review";
    for (const [key, value] of server.reservations) {
      server.reservations.set(key, { ...value, projectName: longName });
    }
    for (const [key, value] of server.orders) {
      server.orders.set(key, { ...value, projectName: longName });
    }
    await seedRouting(page, "admin", language);
    await mkdir("docs/evidence/part_09", { recursive: true });
    async function capture(name: string) {
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: `docs/evidence/part_09/${language}-${page.viewportSize()!.width}-${name}.png`,
        fullPage: true,
        mask: [page.locator("[data-private], #ops-search")],
      });
    }
    await page.goto("/admin/customers");
    await expect(page.getByRole("region", { name: labels.customerTable })).toBeVisible();
    await capture("customers");
    const region = page.getByRole("region", { name: labels.customerTable });
    await region.focus();
    await page.keyboard.press(language === "ar" ? "ArrowLeft" : "ArrowRight");
    await expect(region).toBeFocused();
    await page.goto(customerPath);
    await expect(page.getByRole("button", { name: labels.softDelete, exact: true })).toBeEnabled();
    await capture("customer");
    await page.goto("/admin/reservations");
    await expect(page.getByRole("region", { name: labels.reservationTable })).toBeVisible();
    await capture("reservations");
    await page.goto(reservationPath);
    await expect(page.getByRole("button", { name: labels.convert, exact: true })).toBeEnabled();
    await capture("reservation");
    const convert = page.getByRole("button", { name: labels.convert, exact: true });
    await convert.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText(labels.conversionDescription);
    await capture("conversion");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(convert).toBeFocused();
    await page.goto("/admin/orders");
    await expect(page.getByRole("region", { name: labels.orderTable })).toBeVisible();
    await capture("orders");
    await page.goto(orderPath);
    await expect(page.getByRole("button", { name: labels.complete, exact: true })).toBeEnabled();
    await capture("order");
    await page.getByRole("button", { name: labels.complete, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(labels.completionDescription);
    await capture("completion");
    await page.keyboard.press("Tab");
    expect(await page.getByRole("dialog").evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
  });
}
