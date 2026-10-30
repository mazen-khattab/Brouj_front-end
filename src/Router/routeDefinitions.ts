import { matchPath } from "react-router-dom";
import { routePaths } from "./routePaths";
import { UserRole } from "../Types/contracts";
import type { AuthState } from "../Types/auth";

export type Access =
  | "public"
  | "anonymous"
  | "customer"
  | "staff"
  | "superAdmin"
  | "member";
export interface RouteDefinition {
  path: string;
  title: string;
  access: Access;
  phase: number;
}

// Shared by the actual router, breadcrumbs, and return-path authorization; no page imports here.
export const publicPages: RouteDefinition[] = [
  { path: "/", title: "home", access: "public", phase: 6 },
  { path: routePaths.about, title: "aboutUs", access: "public", phase: 6 },
  { path: "/cities", title: "cities", access: "public", phase: 6 },
  { path: "/cities/:cityId", title: "city", access: "public", phase: 6 },
  { path: "/areas/:areaId", title: "area", access: "public", phase: 6 },
  { path: "/projects", title: "projects", access: "public", phase: 6 },
  {
    path: "/projects/:projectId",
    title: "project",
    access: "public",
    phase: 6,
  },
  {
    path: "/projects/:projectId/units/:unitId",
    title: "unit",
    access: "public",
    phase: 6,
  },
  { path: "/terms", title: "terms", access: "public", phase: 6 },
];
export const accountPages: RouteDefinition[] = [
  { path: "/account", title: "profile", access: "customer", phase: 7 },
  {
    path: "/account/reservations",
    title: "reservations",
    access: "customer",
    phase: 7,
  },
  {
    path: "/account/reservations/:reservationId",
    title: "reservation",
    access: "customer",
    phase: 7,
  },
  { path: "/account/orders", title: "orders", access: "customer", phase: 7 },
  {
    path: "/account/orders/:orderId",
    title: "order",
    access: "customer",
    phase: 7,
  },
];
export const memberPage: RouteDefinition = {
  path: "/projects/:projectId/time-plan",
  title: "timePlan",
  access: "member",
  phase: 7,
};
export const adminPages: RouteDefinition[] = [
  { path: "/admin", title: "dashboard", access: "staff", phase: 5 },
  ...[
    ["catalogue", "catalogue"],
    ["catalogue/cities", "cities"],
    ["catalogue/cities/:cityId", "city"],
    ["catalogue/areas", "areas"],
    ["catalogue/areas/:areaId", "area"],
    ["catalogue/projects", "projects"],
    ["catalogue/projects/:projectId", "project"],
    ["catalogue/projects/:projectId/units/:unitId", "unit"],
  ].map(([path, title]) => ({
    path: `/admin/${path}`,
    title: title!,
    access: "staff" as const,
    phase: 8,
  })),
  ...[
    ["customers", "customers"],
    ["customers/:customerId", "customer"],
    ["reservations", "reservations"],
    ["reservations/:reservationId", "reservation"],
    ["orders", "orders"],
    ["orders/:orderId", "order"],
  ].map(([path, title]) => ({
    path: `/admin/${path}`,
    title: title!,
    access: "staff" as const,
    phase: 9,
  })),
  ...[
    ["time-plans", "timePlans"],
    ["time-plans/:projectId", "timePlan"],
    ["templates", "templates"],
    ["templates/stages", "stageTemplates"],
    ["templates/items", "itemTemplates"],
  ].map(([path, title]) => ({
    path: `/admin/${path}`,
    title: title!,
    access: "staff" as const,
    phase: 10,
  })),
  ...[
    ["terms", "terms"],
    ["terms/:termsId", "term"],
    ["activity-logs", "activityLogs"],
    ["activity-logs/:logId", "activityLog"],
    ["account", "settings"],
  ].map(([path, title]) => ({
    path: `/admin/${path}`,
    title: title!,
    access: "staff" as const,
    phase: 11,
  })),
  { path: "/admin/users", title: "staff", access: "superAdmin", phase: 11 },
  {
    path: "/admin/users/:userId",
    title: "staffUser",
    access: "superAdmin",
    phase: 11,
  },
];
export const authPages: RouteDefinition[] = [
  { path: "/login", title: "login", access: "anonymous", phase: 4 },
  { path: "/register", title: "register", access: "anonymous", phase: 4 },
  { path: "/admin/login", title: "staffLogin", access: "anonymous", phase: 4 },
];
export const routeDefinitions = [
  ...publicPages,
  ...accountPages,
  memberPage,
  ...adminPages,
  ...authPages,
];

export function permits(access: Access, auth: AuthState): boolean {
  if (access === "public") return true;
  if (access === "anonymous")
    return auth.status === "anonymous" && !auth.logoutRequired;
  if (access === "member") return auth.actor !== null;
  if (access === "superAdmin")
    return auth.actor === "staff" && auth.role === UserRole.SuperAdmin;
  return auth.actor === access;
}
export function actorHome(auth: AuthState): string {
  return auth.actor === "staff"
    ? routePaths.admin.home
    : auth.actor === "customer"
      ? routePaths.account
      : routePaths.home;
}

/** Only known, actor-permitted relative SPA paths may survive authentication. */
export function allowedReturnPath(
  value: string | null,
  auth: AuthState,
): string {
  const fallback = actorHome(auth);
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      [...decoded].some(
        (character) =>
          character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    )
      return fallback;
    const url = new URL(value, "https://return.invalid");
    if (url.origin !== "https://return.invalid") return fallback;
    const definition = routeDefinitions.find((item) =>
      matchPath({ path: item.path, end: true }, url.pathname),
    );
    if (
      !definition ||
      definition.access === "anonymous" ||
      !permits(definition.access, auth)
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
