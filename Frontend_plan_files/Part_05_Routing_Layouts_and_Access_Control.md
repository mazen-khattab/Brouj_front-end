# Part 05 - Routing, layouts and access control

## Objective and prerequisite

Prerequisite: Part 04 approved. Connect the Website, account and Dashboard through lazy route trees. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Export browser route constants/builders from routePaths.ts alongside separately named apiPaths. Define appRoutes: RouteObject[] and createBrowserRouter(appRoutes) at module scope in router.tsx. Use RouterProvider without nesting a second BrowserRouter.
2. Use public routes /, /cities, /cities/:cityId, /areas/:areaId, /projects, /projects/:projectId, /projects/:projectId/units/:unitId and /terms. Authentication routes are /login, /register and /admin/login.
3. Use /account for customer profile, /account/reservations and /account/reservations/:reservationId, /account/orders and /account/orders/:orderId. Project time plans use /projects/:projectId/time-plan with a member guard.
4. Nest admin routes below /admin: catalogue, customers, reservations, orders, time plans, templates, terms, activity logs, staff users and account settings. Staff-user routes require SuperAdmin. Fill their pages only in their approved phases.
5. Build public header/footer/mobile menu, account navigation and admin sidebar/topbar. Share language switching and notices. The admin landing page provides operational navigation and available data, not invented revenue/statistics widgets.
6. Add anonymous-only auth pages, customer-only account guards, staff-only admin guards and member guards. Wait for bootstrap; show retry UI for unavailable identity instead of redirecting on a network outage. A valid actor of the wrong kind receives a clear access message, not a redirect loop.
7. App.tsx must use React Suspense with a branded full-page initial fallback and local layout-level boundaries. Use React.lazy for actual suspended page imports. Router navigation and ordinary Axios request state have separate pending indicators.
8. Define accessible 404/403 and route error views; preserve layout where possible. Page titles, breadcrumbs, focus after navigation and scroll restoration must be localized.
9. Preserve only same-origin relative return paths after login. Reject protocol-relative/absolute external values and send the actor to an allowed default route if a return path is forbidden. Never request protected data before the relevant guard succeeds.

## Provider and code-splitting boundaries

Mount Locale/Auth/UI foundations near the root. Feature providers belong inside relevant route branches; admin providers must not load during public browsing. Clear private state on actor/generation changes. Avoid static imports that pull admin pages into the public startup chunk.

Use minimal translated placeholder views for not-yet-implemented pages and clearly record them in completion evidence. Do not implement later phases to fill routes early.

## Verification and acceptance

Browser-test deep links and reloads, browser back/forward, unknown routes, each actor's route permissions, safe return URLs, lazy import failure, unavailable session, and language persistence across layouts. Inspect production output to confirm admin pages are separate lazy chunks.

Deliver route/access matrix and completion report. Stop before Part 06 until approved.
