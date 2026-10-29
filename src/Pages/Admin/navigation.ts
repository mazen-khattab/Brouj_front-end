import { routePaths } from "../../Router/routePaths";
export const adminNavigation = [
  { path: routePaths.admin.home, title: "dashboard" },
  { path: routePaths.admin.catalogue, title: "catalogue" },
  { path: routePaths.admin.customers, title: "customers" },
  { path: routePaths.admin.reservations, title: "reservations" },
  { path: routePaths.admin.orders, title: "orders" },
  { path: routePaths.admin.timePlans, title: "timePlans" },
  { path: routePaths.admin.templates, title: "templates" },
  { path: routePaths.admin.terms, title: "terms" },
  { path: routePaths.admin.activityLogs, title: "activityLogs" },
  { path: routePaths.admin.staff, title: "staff", superAdmin: true },
  { path: routePaths.admin.account, title: "settings" },
];
