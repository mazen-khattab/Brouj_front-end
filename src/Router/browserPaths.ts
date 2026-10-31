/** Language-neutral browser URLs. API URLs are generated separately in routePaths.ts. */
function segment(value: string): string {
  if (!value || value === "." || value === "..")
    throw new Error("A route identifier is required.");
  return encodeURIComponent(value);
}

export const routePaths = {
  home: "/",
  about: "/about",
  cities: "/cities",
  city: (id: string) => `/cities/${segment(id)}`,
  areas: "/areas",
  area: (id: string) => `/areas/${segment(id)}`,
  projects: "/projects",
  project: (id: string) => `/projects/${segment(id)}`,
  unit: (projectId: string, unitId: string) =>
    `/projects/${segment(projectId)}/units/${segment(unitId)}`,
  timePlan: (id: string) => `/projects/${segment(id)}/time-plan`,
  terms: "/terms",
  login: "/login",
  register: "/register",
  staffLogin: "/admin/login",
  account: "/account",
  reservations: "/account/reservations",
  reservation: (id: string) => `/account/reservations/${segment(id)}`,
  orders: "/account/orders",
  order: (id: string) => `/account/orders/${segment(id)}`,
  admin: {
    home: "/admin",
    catalogue: "/admin/catalogue",
    cities: "/admin/catalogue/cities",
    areas: "/admin/catalogue/areas",
    projects: "/admin/catalogue/projects",
    city: (id: string) => `/admin/catalogue/cities/${segment(id)}`,
    area: (id: string) => `/admin/catalogue/areas/${segment(id)}`,
    project: (id: string) => `/admin/catalogue/projects/${segment(id)}`,
    unit: (projectId: string, unitId: string) =>
      `/admin/catalogue/projects/${segment(projectId)}/units/${segment(unitId)}`,
    customers: "/admin/customers",
    customer: (id: string) => `/admin/customers/${segment(id)}`,
    reservations: "/admin/reservations",
    reservation: (id: string) => `/admin/reservations/${segment(id)}`,
    orders: "/admin/orders",
    order: (id: string) => `/admin/orders/${segment(id)}`,
    timePlans: "/admin/time-plans",
    timePlan: (id: string) => `/admin/time-plans/${segment(id)}`,
    templates: "/admin/templates",
    stageTemplates: "/admin/templates/stages",
    itemTemplates: "/admin/templates/items",
    terms: "/admin/terms",
    term: (id: string) => `/admin/terms/${segment(id)}`,
    activityLogs: "/admin/activity-logs",
    activityLog: (id: string) => `/admin/activity-logs/${segment(id)}`,
    staff: "/admin/users",
    staffUser: (id: string) => `/admin/users/${segment(id)}`,
    account: "/admin/account",
  },
} as const;
