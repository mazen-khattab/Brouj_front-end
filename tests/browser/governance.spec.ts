import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { governanceServer, governanceIds as ids, governanceDate as date, governanceLog, governanceStaff, governanceTerms } from "./governanceFixtures";
import { seedRouting } from "./routingFixtures";
import en from "../../src/i18n/locales/en/governance.json" with { type: "json" };
import ar from "../../src/i18n/locales/ar/governance.json" with { type: "json" };

async function save(page: Page, title: string, confirmation = false) {
  await page.getByRole("form", { name: title, exact: true }).getByRole("button", { name: en.save, exact: true }).click();
  if (confirmation) {
    await page.getByRole("dialog").getByRole("button", { name: en.confirm, exact: true }).click();
  }
}

async function confirm(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function termsFields(page: Page, version = "3") {
  await page.locator("#terms-create-title").fill("New legal wording");
  await page.locator("#terms-create-versionNumber").fill(version);
  await page.locator("#terms-create-effectiveDate").fill(date);
  await page.locator("#terms-create-content").fill("Original legal prose\n<script>window.injected=true</script>");
}

test("terms create, immutable detail and activation refresh the admin list and public-current view", async ({ page, context }) => {
  const server = await governanceServer(context, "admin");
  await seedRouting(page, "admin");
  await page.goto("/admin/terms?create=1");
  await termsFields(page);
  await save(page, en.createTerms);
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  const write = server.calls.find((call) => call.method === "POST")!;
  expect(write.body).toEqual({ title: "New legal wording", versionNumber: 3, effectiveDate: date, content: "Original legal prose\n<script>window.injected=true</script>" });
  await page.getByRole("link", { name: en.viewCreated }).click();
  await expect(page.getByText(en.immutableTerms, { exact: true })).toBeVisible();
  expect(await page.locator("main script").count()).toBe(0);
  await confirm(page, en.activateTerms);
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.terms.get(ids.created)!.isActive).toBe(true);
  expect(server.calls.find((call) => call.path.endsWith("/activate"))!.body).toEqual({});
  await page.getByRole("link", { name: en.publicTerms }).click();
  await expect(page.getByRole("heading", { name: "New legal wording" })).toBeVisible();
  await expect(page.getByText("Original legal prose\n<script>window.injected=true</script>", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { injected?: boolean }).injected)).toBeUndefined();
});

test("duplicate version and future activation show conflicts without changing legal drafts or replay", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/terms?create=1");
  await termsFields(page, "1");
  await save(page, en.createTerms);
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator("#terms-create-title")).toHaveValue("New legal wording");
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  await page.getByRole("form", { name: en.createTerms }).getByRole("button", { name: en.reset }).click();
  server.terms.get(ids.inactive)!.effectiveDate = "2099-01-01T00:00:00Z";
  await page.goto(`/admin/terms/${ids.inactive}`);
  await confirm(page, en.activateTerms);
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  expect(server.terms.get(ids.terms)!.isActive).toBe(true);
});

test("terms pagination and empty lists use bounded server queries", async ({ page, context }) => {
  const server = await governanceServer(context);
  for (let index = 3; index <= 25; index += 1) {
    const id = `85000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    server.terms.set(id, { ...governanceTerms, id, title: `Version ${index}`, versionNumber: index, isActive: false });
  }
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/terms");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  expect(server.calls.at(-1)!.url.searchParams.get("pageSize")).toBe("20");
  server.terms.clear();
  await page.getByRole("button", { name: en.refresh }).click();
  await expect(page.getByText("Nothing here yet", { exact: true })).toBeVisible();
});

test("audit filters validate ranges and encode action zero, actor, resource and offset timestamps", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/activity-logs");
  await page.locator("#audit-filters-userId").fill(ids.self);
  await page.locator("#audit-filters-entityType").fill("Project");
  await page.locator("#audit-filters-action").selectOption("0");
  await page.locator("#audit-filters-dateFrom").fill(date);
  await page.locator("#audit-filters-dateTo").fill("2025-01-01T00:00:00Z");
  const before = server.calls.length;
  await page.getByRole("button", { name: en.apply, exact: true }).click();
  await expect(page.locator("#audit-filters-dateTo")).toBeFocused();
  expect(server.calls.length).toBe(before);
  await page.locator("#audit-filters-dateTo").fill("2026-02-01T00:00:00Z");
  await page.getByRole("button", { name: en.apply, exact: true }).click();
  await expect(page.getByText("Nothing here yet", { exact: true })).toBeVisible();
  const query = server.calls.at(-1)!.url.searchParams;
  expect(Object.fromEntries(query)).toEqual({ pageNumber: "1", pageSize: "20", userId: ids.self, entityType: "Project", action: "0", dateFrom: date, dateTo: "2026-02-01T00:00:00Z" });
});

test("audit list/detail tolerate empty and structured malformed optional fields without exposing changes", async ({ page, context }) => {
  const server = await governanceServer(context);
  server.logs.set(ids.log, { ...governanceLog, entityType: { unexpected: ["DO-NOT-RENDER"] }, userId: null, entityId: null, action: null, createdAt: "invalid-date", oldData: { password: "DO-NOT-RENDER" } } as never);
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/activity-logs");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").getByText(en.unavailable, { exact: true })).toHaveCount(5);
  await page.getByRole("table").getByRole("link").click();
  await expect(page.getByText(en.auditBoundary, { exact: true })).toBeVisible();
  await expect(page.getByText("DO-NOT-RENDER")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Activity details");
});

test("staff create, complete update with numeric role, soft-delete and restore refresh account state", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/users?create=1");
  await page.locator("#staff-create-name").fill("New synthetic staff");
  await page.locator("#staff-create-email").fill("new@example.test");
  await page.locator("#staff-create-phone").fill("01000000003");
  await page.locator("#staff-create-role").selectOption("1");
  await page.locator("#staff-create-password").fill(" Initial secret ");
  await save(page, en.createStaff, true);
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.find((call) => call.method === "POST")!.body).toEqual({ name: "New synthetic staff", email: "new@example.test", phone: "01000000003", role: 1, password: " Initial secret " });
  await expect(page.locator("#staff-create-password")).toHaveValue("");
  await page.getByRole("link", { name: en.viewCreated }).click();
  await page.locator(`#staff-update-${ids.created}-role`).selectOption("0");
  await save(page, en.updateStaff, true);
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.calls.find((call) => call.method === "PATCH")!.body).toEqual({ name: "New synthetic staff", email: "new@example.test", phone: "01000000003", role: 0 });
  await confirm(page, en.deleteStaff);
  await expect(page.getByRole("form", { name: en.updateStaff })).toHaveCount(0);
  await confirm(page, en.restoreStaff);
  await expect(page.getByRole("form", { name: en.updateStaff })).toBeVisible();
  expect(server.users.get(ids.created)!.deletedAt).toBeNull();
});

test("self-modification conflicts retain drafts and rely on server account rules", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto(`/admin/users/${ids.self}`);
  await page.locator(`#staff-update-${ids.self}-name`).fill("Updated current staff");
  await save(page, en.updateStaff, true);
  await expect(page.getByText(en.saved, { exact: true })).toBeVisible();
  expect(server.users.get(ids.self)!.name).toBe("Updated current staff");
  await page.locator(`#staff-update-${ids.self}-role`).selectOption("1");
  await save(page, en.updateStaff, true);
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  await expect(page.locator(`#staff-update-${ids.self}-role`)).toHaveValue("1");
  expect(server.users.get(ids.self)!.role).toBe(0);
  await confirm(page, en.deleteStaff);
  await expect(page.getByText(en.conflict, { exact: true })).toBeVisible();
  expect(server.users.get(ids.self)!.deletedAt).toBeNull();
});

test("staff filters preserve the query after authoritative refresh and reset paging for a new search", async ({ page, context }) => {
  const server = await governanceServer(context);
  for (let index = 3; index <= 25; index += 1) {
    const id = `86000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    server.users.set(id, { ...governanceStaff, id, name: `Colleague ${index}` });
  }
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.locator("#staff-search").fill("Synthetic colleague");
  await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await page.locator("#staff-role").selectOption("1");
  await page.locator("#staff-deleted").selectOption("false");
  await page.getByRole("button", { name: en.refresh }).click();
  await expect(page.getByRole("table").getByText("Synthetic colleague", { exact: true })).toBeVisible();
  expect(server.calls.at(-1)!.url.searchParams.get("search")).toBe("Synthetic colleague");
  expect(server.calls.at(-1)!.url.searchParams.get("role")).toBe("1");
  expect(server.calls.at(-1)!.url.searchParams.get("isDeleted")).toBe("false");
});

test("wrong current password never rotates/replays and a successful change clears secrets", async ({ page, context }) => {
  const server = await governanceServer(context, "admin");
  await seedRouting(page, "admin");
  await page.goto("/admin/account");
  await save(page, en.changePassword);
  await expect(page.locator("#staff-password-currentPassword")).toBeFocused();
  await page.locator("#staff-password-currentPassword").fill(" old secret ");
  await page.locator("#staff-password-newPassword").fill(" new secret ");
  server.state.failNext = 401;
  await save(page, en.changePassword);
  await expect(page.getByText(en.wrongPassword, { exact: true })).toBeVisible();
  await expect(page.locator("#staff-password-newPassword")).toHaveValue(" new secret ");
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(server.session.calls.filter((path) => path.endsWith("/refresh"))).toHaveLength(0);
  await save(page, en.changePassword);
  await expect(page.getByText(en.passwordSaved, { exact: true })).toBeVisible();
  await expect(page.locator("#staff-password-currentPassword")).toHaveValue("");
  await expect(page.locator("#staff-password-newPassword")).toHaveValue("");
  expect(server.calls.findLast((call) => call.method === "POST")!.body).toEqual({ currentPassword: " old secret ", newPassword: " new secret " });
  const persisted = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(JSON.stringify(persisted)).not.toMatch(/secret|colleague|current@example/);
});

test("unknown mutation outcomes and failed follow-up reads require an explicit check without replay", async ({ page, context }) => {
  const server = await governanceServer(context);
  server.state.failNext = 500;
  server.state.commitOnError = true;
  await seedRouting(page, "superAdmin");
  await page.goto(`/admin/users/${ids.staff}`);
  await confirm(page, en.deleteStaff);
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: en.deleteStaff, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: en.check, exact: true }).click();
  await expect(page.getByRole("button", { name: en.restoreStaff, exact: true })).toBeEnabled();
  expect(server.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  server.state.failReadAfterWrite = true;
  await confirm(page, en.restoreStaff);
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  server.state.readStatus = 0;
  await page.getByRole("button", { name: en.check, exact: true }).click();
  await expect(page.getByRole("button", { name: en.deleteStaff, exact: true })).toBeEnabled();
  expect(server.calls.filter((call) => call.method === "POST")).toHaveLength(1);
});

test("pending confirmations block duplicate submission and dismissal until the result is read", async ({ page, context }) => {
  const server = await governanceServer(context);
  server.state.delayWrite = 700;
  await seedRouting(page, "superAdmin");
  await page.goto(`/admin/users/${ids.staff}`);
  await page.getByRole("button", { name: en.deleteStaff, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: en.confirm, exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: en.cancel, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: en.restoreStaff, exact: true })).toBeVisible();
  expect(server.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
});

test("draft navigation requires a choice and a pending password write cannot be abandoned through the router", async ({ page, context }) => {
  const server = await governanceServer(context, "admin");
  await seedRouting(page, "admin");
  await page.goto("/admin/account");
  await page.locator("#staff-password-currentPassword").fill(" old secret ");
  await page.getByRole("navigation", { name: en.navigation }).getByRole("link", { name: "Activity logs", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.locator("#staff-password-currentPassword")).toHaveValue(" old secret ");
  await page.locator("#staff-password-newPassword").fill(" new secret ");
  server.state.delayWrite = 3000;
  await save(page, en.changePassword);
  await page.getByRole("navigation", { name: en.navigation }).getByRole("link", { name: "Activity logs", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Discard and continue", exact: true })).toBeDisabled();
  await expect(page.getByText(en.passwordSaved, { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Discard and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/activity-logs$/);
});

test("audit pagination and staff field errors remain bounded and retain edits", async ({ page, context }) => {
  const server = await governanceServer(context);
  for (let index = 2; index <= 25; index += 1) {
    const id = `87000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    server.logs.set(id, { ...governanceLog, id });
  }
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/activity-logs");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  expect(server.calls.at(-1)!.url.searchParams.get("pageSize")).toBe("20");
  await page.goto(`/admin/users/${ids.staff}`);
  await page.locator(`#staff-update-${ids.staff}-name`).fill("Retained staff draft");
  server.state.failNext = 400;
  await save(page, en.updateStaff, true);
  await expect(page.locator(`#staff-update-${ids.staff}-name`)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(`#staff-update-${ids.staff}-name`)).toHaveValue("Retained staff draft");
  await expect(page.getByText("Private validator text")).toHaveCount(0);
});

test("malformed success blocks replay and a later permission outage removes protected form state", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto(`/admin/users/${ids.staff}`);
  server.state.malformedId = true;
  await confirm(page, en.deleteStaff);
  await expect(page.getByText(en.uncertain, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: en.check, exact: true }).click();
  await expect(page.getByRole("button", { name: en.restoreStaff, exact: true })).toBeEnabled();
  expect(server.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  server.state.readStatus = 403;
  server.session.state.unavailable = true;
  await page.getByRole("button", { name: en.refresh }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We could not confirm your session");
  await expect(page.getByRole("button", { name: en.restoreStaff, exact: true })).toHaveCount(0);
});

test("a forbidden response refreshes identity and removes stale SuperAdmin routes and navigation", async ({ page, context }) => {
  const server = await governanceServer(context);
  await seedRouting(page, "superAdmin");
  await page.goto("/admin/users");
  await expect(page.getByRole("table")).toBeVisible();
  server.session.state.actor = "admin";
  await page.getByRole("button", { name: en.refresh }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Access unavailable");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.goto("/admin/terms");
  await expect(page.getByRole("navigation", { name: en.navigation }).getByRole("link", { name: "Staff users", exact: true })).toHaveCount(0);
});

for (const actor of ["admin", "customer"] as const) {
  test(`${actor} direct navigation and every direct staff-management API verb are denied`, async ({ page, context }) => {
    const server = await governanceServer(context, actor);
    await seedRouting(page, actor);
    await page.goto(`/admin/users/${ids.staff}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Access unavailable");
    expect(server.calls.some((call) => call.path.includes("/admin/users"))).toBe(false);
    const statuses = await page.evaluate(async (id) => {
      const base = "https://localhost:7249/api/v1/admin/users";
      const responses = [];
      for (const [method, path] of [["GET", base], ["GET", `${base}/${id}`], ["POST", base], ["PATCH", `${base}/${id}`], ["DELETE", `${base}/${id}`], ["POST", `${base}/${id}/restore`]] as const) {
        responses.push((await fetch(path!, { method, credentials: "include", headers: { "X-CSRF-TOKEN": "fixture-proof", "Content-Type": "application/json" }, ...(method === "POST" || method === "PATCH" ? { body: "{}" } : {}) })).status);
      }
      return responses;
    }, ids.staff);
    expect(statuses).toEqual([403, 403, 403, 403, 403, 403]);
    if (actor === "customer") {
      for (const path of ["/admin/terms", "/admin/activity-logs", "/admin/account"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Access unavailable");
      }
    }
  });
}

for (const language of ["ar", "en"] as const) {
  test(`bilingual legal, audit, account and privileged keyboard form review in ${language}`, async ({ page, context }, info) => {
    await governanceServer(context);
    await seedRouting(page, "superAdmin", language);
    const words = language === "ar" ? ar : en;
    const width = info.project.name.includes("mobile") ? 375 : 1440;
    await mkdir("docs/evidence/part_11", { recursive: true });
    for (const [name, path] of [["versions", "/admin/terms"], ["terms", `/admin/terms/${ids.terms}`], ["audit", `/admin/activity-logs/${ids.log}`], ["staff", `/admin/users/${ids.staff}`], ["account", "/admin/account"], ["create", "/admin/users?create=1"]]) {
      await page.goto(path!);
      await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      if (name === "versions") {
        await expect(page.getByRole("table")).toBeVisible();
      } else if (name === "create") {
        await expect(page.getByRole("form", { name: words.createStaff })).toBeVisible();
        await expect(page.locator("#staff-create-email")).toHaveAttribute("dir", "ltr");
        await expect(page.locator("#staff-create-phone")).toHaveAttribute("dir", "ltr");
        await page.locator("#staff-create-role").focus();
        await page.keyboard.press("Home");
        await expect(page.locator("#staff-create-role")).toHaveValue("0");
        await page.keyboard.press("End");
      } else {
        await expect(page.getByText(name === "terms" ? words.immutableTerms : name === "audit" ? words.auditBoundary : name === "account" ? words.profileBoundary : words.staffRules, { exact: true })).toBeVisible();
      }
      await page.evaluate(() => document.fonts.ready);
      // Full-page captures must start at the top so focused fixed links and privacy masks keep their position.
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/evidence/part_11/${language}-${width}-${name}.png`, fullPage: true, animations: "disabled", scale: "css", mask: [page.locator("[data-private]")] });
      if (name === "staff") {
        const trigger = page.getByRole("button", { name: words.deleteStaff, exact: true });
        await trigger.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: `docs/evidence/part_11/${language}-${width}-confirmation.png`, fullPage: true, animations: "disabled", scale: "css", mask: [page.locator("[data-private]")] });
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
    }
  });
}
