import type { BrowserContext } from "@playwright/test";
import { routingServer } from "./routingFixtures";
import type { TestActor } from "./routingFixtures";
import { sessionCors } from "./sessionFixtures";
import type { ActivityLogDto, TermsDto, UserDto } from "../../src/Types/contracts";

export const governanceIds = {
  self: "00000000-0000-0000-0000-000000000002",
  staff: "81000000-0000-4000-8000-000000000001",
  terms: "82000000-0000-4000-8000-000000000001",
  inactive: "82000000-0000-4000-8000-000000000002",
  log: "83000000-0000-4000-8000-000000000001",
  created: "84000000-0000-4000-8000-000000000001",
};
export const governanceDate = "2026-01-01T09:00:00+02:00";
export const governanceTerms: TermsDto = { id: governanceIds.terms, title: "Current legal terms", content: 'Original legal wording.\n<img src="x" onerror="window.injected=true">', versionNumber: 1, effectiveDate: governanceDate, isActive: true };
export const governanceStaff: UserDto = { id: governanceIds.staff, name: "Synthetic colleague", email: "colleague@example.test", phone: "01000000001", role: 1, deletedAt: null };
export const governanceLog: ActivityLogDto = { id: governanceIds.log, entityType: "Project", entityId: governanceIds.terms, userId: governanceIds.self, action: 1, createdAt: governanceDate };

/** This server is synthetic; real server authorization is covered by the existing backend HTTP suite. */
export async function governanceServer(context: BrowserContext, actor: TestActor = "superAdmin") {
  const session = await routingServer(context, actor);
  const terms = new Map<string, TermsDto>([
    [governanceIds.terms, structuredClone(governanceTerms)],
    [governanceIds.inactive, { ...governanceTerms, id: governanceIds.inactive, title: "Next legal terms", versionNumber: 2, content: "Second original wording", isActive: false }],
  ]);
  const users = new Map<string, UserDto>([
    [governanceIds.staff, structuredClone(governanceStaff)],
    [governanceIds.self, { ...governanceStaff, id: governanceIds.self, name: "Synthetic current staff", email: "current@example.test", phone: "01000000002", role: actor === "superAdmin" ? 0 : 1 }],
  ]);
  const logs = new Map<string, ActivityLogDto>([[governanceIds.log, structuredClone(governanceLog)]]);
  const state = { failNext: 0, readStatus: 0, delayWrite: 0, commitOnError: false, failReadAfterWrite: false, malformedId: false, passwordChanges: 0 };
  const calls: { method: string; path: string; url: URL; body: Record<string, unknown> }[] = [];
  const cors = { ...sessionCors, "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS", "access-control-allow-headers": "Content-Type, X-CSRF-TOKEN" };
  await context.route("https://localhost:7249/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const managed = /^\/api\/v1\/admin\/(terms-and-conditions|users|activity-logs)(\/|$)/.test(path)
      || path === "/api/v1/terms-and-conditions/current" || path === "/api/v1/users/me/change-password"
      || (path === "/api/v1/users/me" && !session.state.unavailable && ["admin", "superAdmin"].includes(session.state.actor));
    if (!managed) {
      return route.fallback();
    }
    if (method === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : {};
    calls.push({ method, path, url, body });
    const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers: cors, json: { success: false, code: status === 409 ? 5 : status === 401 ? 1 : 3, message: "Untrusted server text", errors: status === 400 ? { "Input.Name": ["Private validator text"] } : null } });
    if (path === "/api/v1/terms-and-conditions/current") {
      return ok([...terms.values()].find((row) => row.isActive) ?? null);
    }
    if (!["admin", "superAdmin"].includes(session.state.actor)) {
      return fail(session.state.actor === "anonymous" ? 401 : 403);
    }
    if (path.includes("/admin/users") && session.state.actor !== "superAdmin") {
      return fail(403);
    }
    if (path === "/api/v1/users/me") {
      const profile = users.get(governanceIds.self)!;
      return profile.deletedAt === null ? ok({ ...profile, role: session.state.actor === "superAdmin" ? 0 : 1 }) : fail(401);
    }
    if (method !== "GET" && request.headers()["x-csrf-token"] !== "fixture-proof") {
      return fail(403);
    }
    function page<T>(items: T[]) {
      const pageNumber = Number(url.searchParams.get("pageNumber") ?? 1);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
      return { items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize, totalCount: items.length, totalPages: Math.ceil(items.length / pageSize) };
    }
    if (method === "GET") {
      if (state.readStatus) {
        return fail(state.readStatus);
      }
      const id = path.split("/").at(-1)!;
      if (path.includes("terms-and-conditions")) {
        return path.endsWith("terms-and-conditions") ? ok(page([...terms.values()].sort((a, b) => b.versionNumber - a.versionNumber))) : terms.has(id) ? ok(terms.get(id)) : fail(404);
      }
      if (path.includes("activity-logs")) {
        let rows = [...logs.values()];
        for (const field of ["userId", "entityType", "action"] as const) {
          const value = url.searchParams.get(field);
          if (value !== null && value !== "") {
            rows = rows.filter((row) => String(row[field]) === value);
          }
        }
        const from = url.searchParams.get("dateFrom"), to = url.searchParams.get("dateTo");
        rows = rows.filter((row) => (!from || Date.parse(row.createdAt) >= Date.parse(from)) && (!to || Date.parse(row.createdAt) <= Date.parse(to)));
        return path.endsWith("activity-logs") ? ok(page(rows)) : logs.has(id) ? ok(logs.get(id)) : fail(404);
      }
      let rows = [...users.values()];
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      rows = rows.filter((row) => row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search));
      const role = url.searchParams.get("role"), deleted = url.searchParams.get("isDeleted");
      rows = rows.filter((row) => (!role || row.role === Number(role)) && (!deleted || (row.deletedAt !== null) === (deleted === "true")));
      return path.endsWith("users") ? ok(page(rows)) : users.has(id) ? ok(users.get(id)) : fail(404);
    }
    if (state.delayWrite) {
      await new Promise((resolve) => setTimeout(resolve, state.delayWrite));
    }
    const failure = state.failNext;
    state.failNext = 0;
    if (failure && !state.commitOnError) {
      return fail(failure);
    }
    let id = path.split("/").at(-1)!;
    if (path.includes("terms-and-conditions")) {
      if (path.endsWith("/activate")) {
        id = path.split("/").at(-2)!;
        const target = terms.get(id);
        if (!target) {
          return fail(404);
        }
        if (Date.parse(target.effectiveDate) > Date.now()) {
          return fail(409);
        }
        for (const row of terms.values()) {
          row.isActive = row.id === id;
        }
      } else {
        if (Object.keys(body).sort().join() !== "content,effectiveDate,title,versionNumber") {
          return fail(400);
        }
        if ([...terms.values()].some((row) => row.versionNumber === body.versionNumber)) {
          return fail(409);
        }
        id = governanceIds.created;
        terms.set(id, { id, ...body, isActive: false } as unknown as TermsDto);
      }
    } else if (path.endsWith("change-password")) {
      if (Object.keys(body).sort().join() !== "currentPassword,newPassword") {
        return fail(400);
      }
      state.passwordChanges += 1;
      id = governanceIds.self;
    } else if (method === "POST" && path.endsWith("/users")) {
      if (Object.keys(body).sort().join() !== "email,name,password,phone,role") {
        return fail(400);
      }
      id = governanceIds.created;
      users.set(id, { id, name: body.name, email: body.email, phone: body.phone, role: body.role, deletedAt: null } as UserDto);
    } else {
      if (path.endsWith("/restore")) {
        id = path.split("/").at(-2)!;
      }
      const target = users.get(id);
      if (!target) {
        return fail(404);
      }
      if ((method === "DELETE" && id === governanceIds.self) || (method === "PATCH" && target.role === 0 && body.role !== 0 && (id === governanceIds.self || ![...users.values()].some((row) => row.id !== id && row.deletedAt === null && row.role === 0)))) {
        return fail(409);
      }
      if (method === "PATCH") {
        if (target.deletedAt !== null) {
          return fail(409);
        }
        if (Object.keys(body).sort().join() !== "email,name,phone,role") {
          return fail(400);
        }
        Object.assign(target, body);
      } else {
        target.deletedAt = method === "DELETE" ? governanceDate : null;
      }
    }
    if (state.failReadAfterWrite) {
      state.readStatus = 503;
      state.failReadAfterWrite = false;
    }
    return failure ? fail(failure) : ok(state.malformedId ? {} : id);
  });
  return { session, terms, users, logs, state, calls };
}
