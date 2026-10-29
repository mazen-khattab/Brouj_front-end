import { StrictMode } from "react";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthContext } from "../../src/Context/AuthContext";
import type { AuthValue } from "../../src/Context/AuthContext";
import { TermsAdminProvider } from "../../src/Context/TermsAdminProvider";
import { useTermsAdmin } from "../../src/Context/TermsAdminContext";
import { CatalogueDetailProvider } from "../../src/Context/CatalogueDetailProvider";
import { useCatalogueDetail } from "../../src/Hooks/useCatalogue";
import { StaffAdminProvider } from "../../src/Context/StaffAdminProvider";
import { useStaffAdmin } from "../../src/Context/StaffAdminContext";
import { StaffAccountProvider } from "../../src/Context/StaffAccountProvider";
import { useStaffAccount } from "../../src/Context/StaffAccountContext";
import { ActivityLogsProvider } from "../../src/Context/ActivityLogsProvider";
import { useActivityLogs } from "../../src/Context/ActivityLogsContext";
import { useGovernanceResource } from "../../src/Hooks/useGovernanceResource";
import { invalidGovernanceFields, auditText, auditRows, termsInput, createStaffInput, staffInput } from "../../src/Governance/policy";
import { governanceIds as ids, governanceDate as date, governanceStaff as user, governanceTerms as terms } from "../browser/governanceFixtures";
import * as termsService from "../../src/Services/Terms";
import * as staffService from "../../src/Services/StaffAdmin";
import * as profileService from "../../src/Services/StaffProfile";
import * as auditService from "../../src/Services/ActivityLogs";
import { ApiError } from "../../src/Types/failures";

const auth: AuthValue = {
  status: "staff", actor: "staff", role: 0, profile: { ...user, id: ids.self, role: 0 }, generation: 1,
  pending: false, automaticRefresh: true, logoutRequired: true,
  loginCustomer: vi.fn(), loginStaff: vi.fn(), registerCustomer: vi.fn(), logout: vi.fn(), retryBootstrap: vi.fn(), reloadIdentity: vi.fn(),
};

function staff({ children }: { children: ReactNode }) {
  return <StrictMode><AuthContext value={auth}>{children}</AuthContext></StrictMode>;
}

function page<T>(items: T[]) {
  return { items, pageNumber: 1, pageSize: 20, totalCount: items.length, totalPages: 1 };
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

test("legal version validators preserve source prose and constrain integer/date/length boundaries", () => {
  const values = { title: " Original ", content: " <img src=x>\n Original legal text ", versionNumber: "3", effectiveDate: date };
  expect(invalidGovernanceFields("terms", values)).toEqual([]);
  expect(termsInput(values)).toEqual({ ...values, versionNumber: 3 });
  expect(invalidGovernanceFields("terms", { ...values, title: " ", content: "", versionNumber: "2147483648", effectiveDate: "2026-02-31T00:00:00Z" })).toEqual(["title", "content", "versionNumber", "effectiveDate"]);
  expect(invalidGovernanceFields("terms", { ...values, title: "x".repeat(301), content: "x".repeat(100001), versionNumber: "1.1" })).toEqual(["title", "content", "versionNumber"]);
});

test("staff adapters allow both numeric roles and exclude privileged or credential fields from PATCH", () => {
  const values = { name: " Staff ", email: "staff@example.test", phone: "01000000000", role: "0", password: "  secret  ", id: ids.self, deletedAt: date, hashPassword: "never-send" };
  expect(staffInput(values)).toEqual({ name: values.name, email: values.email, phone: values.phone, role: 0 });
  expect(createStaffInput(values)).toEqual({ ...staffInput(values), password: "  secret  " });
  expect(invalidGovernanceFields("createStaff", { name: "x", email: values.email, phone: values.phone, role: "1", password: "        " })).toEqual([]);
  expect(invalidGovernanceFields("updateStaff", { name: " ", email: "wrong", phone: "+201000000000", role: "SuperAdmin" })).toEqual(["name", "email", "phone", "role"]);
});

test("passwords are not trimmed and only new passwords have an eight-character minimum", () => {
  expect(invalidGovernanceFields("password", { currentPassword: " ", newPassword: "        " })).toEqual([]);
  expect(invalidGovernanceFields("password", { currentPassword: "", newPassword: "short" })).toEqual(["currentPassword", "newPassword"]);
});

test("audit filters reject reversed ranges, empty GUIDs, unknown actions and oversized resource types", () => {
  expect(invalidGovernanceFields("auditFilters", { userId: "", entityType: "", action: "0", dateFrom: date, dateTo: "2026-02-01T00:00:00Z" })).toEqual([]);
  expect(invalidGovernanceFields("auditFilters", { userId: "00000000-0000-0000-0000-000000000000", entityType: "x".repeat(129), action: "3", dateFrom: date, dateTo: "2025-01-01T00:00:00Z" })).toEqual(["userId", "entityType", "action", "dateTo"]);
});

test("optional audit data never traverses structures and bounds displayed strings and row count", () => {
  const hostile = { toJSON: () => { throw new Error("Do not traverse unexpected data"); } };
  expect(auditText(hostile)).toBeUndefined();
  expect(auditText(null)).toBeUndefined();
  expect(auditText(" ")).toBeUndefined();
  expect(auditText("x".repeat(100000))).toHaveLength(513);
  expect(auditRows([null, {}, { id: "bad" }, { id: ids.log }])).toEqual([{ id: ids.log }]);
  expect(auditRows(Array.from({ length: 1000 }, () => ({ id: ids.log })))).toHaveLength(100);
});

test("activation refreshes the mounted public terms provider and the authoritative admin detail", async () => {
  let active = terms;
  const publicRead = vi.spyOn(termsService, "getActiveTermsAndConditions").mockImplementation(async () => active);
  const list = vi.spyOn(termsService, "getTermsAndConditionsVersions").mockImplementation(async () => page([active]));
  vi.spyOn(termsService, "getTermsAndConditionsById").mockImplementation(async () => ({ ...active, id: ids.inactive }));
  const activate = vi.spyOn(termsService, "activateTermsAndConditions").mockImplementation(async () => {
    active = { ...terms, id: ids.inactive, versionNumber: 2, content: "New original wording" };
    return ids.inactive;
  });
  const wrapper = ({ children }: { children: ReactNode }) => staff({ children: <CatalogueDetailProvider kind="terms"><TermsAdminProvider scope="terms" id={ids.inactive}>{children}</TermsAdminProvider></CatalogueDetailProvider> });
  const hook = renderHook(() => ({ admin: useTermsAdmin(), public: useCatalogueDetail() }), { wrapper });
  await waitFor(() => expect(hook.result.current.admin.read.result.status).toBe("success"));
  await waitFor(() => expect(hook.result.current.public.result.status).toBe("success"));
  const before = publicRead.mock.calls.length;
  await act(async () => { await hook.result.current.admin.activate(ids.inactive); });
  expect(activate).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(publicRead.mock.calls.length).toBeGreaterThan(before));
  expect(hook.result.current.public.result).toMatchObject({ status: "success", data: { value: { versionNumber: 2 } } });
  expect(list.mock.calls.length).toBeGreaterThan(1);
});

test("terms conflict refreshes without replaying activation", async () => {
  const list = vi.spyOn(termsService, "getTermsAndConditionsVersions").mockResolvedValue(page([terms]));
  vi.spyOn(termsService, "getTermsAndConditionsById").mockResolvedValue(terms);
  const activate = vi.spyOn(termsService, "activateTermsAndConditions").mockRejectedValue(new ApiError("transport", { status: 409 }));
  const wrapper = ({ children }: { children: ReactNode }) => staff({ children: <TermsAdminProvider scope="terms" id={terms.id}>{children}</TermsAdminProvider> });
  const hook = renderHook(useTermsAdmin, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  const before = list.mock.calls.length;
  await act(async () => { await hook.result.current.activate(terms.id); });
  expect(activate).toHaveBeenCalledTimes(1);
  expect(list.mock.calls.length).toBeGreaterThan(before);
  expect(hook.result.current.action.failure?.status).toBe(409);
});

test("an uncertain password change locks new writes until an explicit read check, without replay", async () => {
  vi.spyOn(profileService, "getCurrentUser").mockResolvedValue(user);
  const write = vi.spyOn(profileService, "changeUserPassword").mockRejectedValue(new ApiError("network"));
  const wrapper = ({ children }: { children: ReactNode }) => staff({ children: <StaffAccountProvider scope="account">{children}</StaffAccountProvider> });
  const hook = renderHook(useStaffAccount, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => { await Promise.all([hook.result.current.changePassword({ currentPassword: " old ", newPassword: " new secret " }), hook.result.current.changePassword({ currentPassword: " old ", newPassword: " new secret " })]); });
  expect(write).toHaveBeenCalledTimes(1);
  expect(write.mock.calls[0]![0]).toEqual({ body: { currentPassword: " old ", newPassword: " new secret " } });
  expect(hook.result.current.action.blocked).toBe(true);
  await act(async () => { await hook.result.current.action.check(); });
  expect(hook.result.current.action.blocked).toBe(false);
  expect(write).toHaveBeenCalledTimes(1);
  expect(auth.reloadIdentity).toHaveBeenCalled();
});

test("staff update/delete/restore bind to loaded target and refresh the current identity", async () => {
  vi.spyOn(staffService, "getUsers").mockResolvedValue(page([user]));
  vi.spyOn(staffService, "getUserById").mockResolvedValue(user);
  const update = vi.spyOn(staffService, "updateUser").mockResolvedValue(user.id);
  const remove = vi.spyOn(staffService, "softDeleteUser").mockResolvedValue(user.id);
  const restore = vi.spyOn(staffService, "restoreUser").mockResolvedValue(user.id);
  const wrapper = ({ children }: { children: ReactNode }) => staff({ children: <StaffAdminProvider scope="users" id={user.id}>{children}</StaffAdminProvider> });
  const hook = renderHook(useStaffAdmin, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  await act(async () => { await hook.result.current.execute({ kind: "update", values: { name: "Changed", email: user.email, phone: user.phone, role: "0", password: "must-not-send" } }); });
  expect(update.mock.calls[0]![0]).toEqual({ id: user.id, body: { name: "Changed", email: user.email, phone: user.phone, role: 0 } });
  await act(async () => { await hook.result.current.execute({ kind: "delete" }); });
  await act(async () => { await hook.result.current.execute({ kind: "restore" }); });
  expect(remove.mock.calls[0]![0]).toEqual({ id: user.id });
  expect(restore.mock.calls[0]![0]).toEqual({ id: user.id });
  expect(auth.reloadIdentity).toHaveBeenCalledTimes(3);
});

test("Admin cannot read staff management even if its provider is mounted directly", async () => {
  const list = vi.spyOn(staffService, "getUsers");
  const wrapper = ({ children }: { children: ReactNode }) => <AuthContext value={{ ...auth, role: 1 }}><StaffAdminProvider scope="denied">{children}</StaffAdminProvider></AuthContext>;
  const hook = renderHook(useStaffAdmin, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("error"));
  expect(list).not.toHaveBeenCalled();
});

test("a forbidden read removes retained records and refreshes identity; a profile outage reboots permissions", async () => {
  let reject = false;
  const load = vi.fn(async () => {
    if (reject) {
      throw new ApiError("transport", { status: 403 });
    }
    return { private: true };
  });
  vi.mocked(auth.reloadIdentity).mockRejectedValueOnce(new ApiError("network"));
  const hook = renderHook(() => useGovernanceResource("private", load), { wrapper: staff });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  reject = true;
  await act(async () => { await hook.result.current.read.reload().catch(() => {}); });
  expect(hook.result.current.snapshot).toBeUndefined();
  expect(auth.reloadIdentity).toHaveBeenCalled();
  expect(auth.retryBootstrap).toHaveBeenCalled();
  load.mockRejectedValueOnce(new ApiError("network"));
  await act(async () => { await hook.result.current.read.reload().catch(() => {}); });
  expect(hook.result.current.snapshot).toBeUndefined();
});

test("audit paging uses only approved query fields and safely handles an absent item collection", async () => {
  const read = vi.spyOn(auditService, "getActivityLogs").mockResolvedValue({ ...page([]), items: null } as never);
  const wrapper = ({ children }: { children: ReactNode }) => staff({ children: <ActivityLogsProvider scope="audit">{children}</ActivityLogsProvider> });
  const hook = renderHook(useActivityLogs, { wrapper });
  await waitFor(() => expect(hook.result.current.read.result.status).toBe("success"));
  expect(hook.result.current.read.result).toMatchObject({ data: { page: { items: [] } } });
  act(() => hook.result.current.apply({ action: "0", entityType: "Project", dateFrom: date, ignored: "not-approved" }));
  await waitFor(() => expect(read.mock.calls.at(-1)![0]!.query).toMatchObject({ action: 0, entityType: "Project", dateFrom: date }));
  expect(read.mock.calls.at(-1)![0]!.query).not.toHaveProperty("ignored");
});
