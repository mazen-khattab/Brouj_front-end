# Part 05 completion report

Date: 2026-10-29. Status: **Awaiting approval**. Part 04 was explicitly approved by the user in this conversation: "Ok, Approved. Now, let's navigate to the next part." with the Part 05 invocation. That approval is recorded in its report and the master ledger. Part 06 has not been implemented.

## Delivered

- One module-scope `appRoutes: RouteObject[]` / `createBrowserRouter`, one `RouterProvider`, 44 language-neutral route definitions and distinct browser/API path exports with encoded parameter builders. The service generator preserves the handwritten browser-path re-export.
- Lazy public, account and admin layouts, actual lazy page imports, branded initial Suspense and local layout pending views. Public header/footer, desktop navigation, mobile disclosure, account tabs, admin sidebar/topbar and catalogue/template subnavigation share locale/session controls and notices.
- Anonymous-only auth routes, customer account guards, staff admin guards, SuperAdmin staff-user guards and member project schedules. Bootstrap waits; unavailable identity offers retry at the same URL; wrong actors receive an explicit 403. Protected branches remount on actor/profile/generation changes. No protected business requests or future feature providers were introduced.
- Existing authentication pages are connected at `/login`, `/register`, `/admin/login`. A single relative `returnTo` is checked against known routes and hydrated actor policy. External/protocol-relative URLs, backslashes, decoded controls/whitespace, malformed/oversized values, unknown/auth routes and forbidden destinations fall back to the actor's allowed workspace. Safe query/hash values survive login.
- An integration fix detaches the form's abort listener before publishing accepted identity. The login redirect can unmount the form without canceling the established session controller or breaking the next logout. Pending attempts still cancel on unmount. A synchronous-publication regression test proves confirmed login followed by logout works.
- Translated 404/403/safe route-error views, layout-preserving child failures, reload recovery, localized titles/breadcrumbs, heading focus after lazy navigation and Router scroll restoration. Keyboard focus on dark navigation is gold; mobile menus close on navigation/Escape and return Escape focus to the trigger.
- Admin landing uses only the already hydrated name/role and operational navigation. All later business screens are translated placeholders; no revenue/statistics, data, endpoint, DTO, media URL or product feature was fabricated.

The [route/access matrix and guide](routing-access.md) lists every registered page, policy, future phase and provider boundary. Existing welcome artwork/fonts and the owner's Tailwind/navy/gold/ivory/16px design remain in use. Development showcase/auth fixtures remain excluded from production.

## Changed files

| Area | Files |
|---|---|
| Browser routing | `src/Router/browserPaths.ts`, `routePaths.ts`, `routeDefinitions.ts`, `router.tsx`, `AccessGuard.tsx`, `RootLayout.tsx`, `RouteFeedback.tsx`, `src/App.tsx` |
| Layout/navigation | `src/Layouts/PublicLayout.tsx`, `AccountLayout.tsx`, `AdminLayout.tsx`, `src/Components/Navigation.tsx` |
| Routed pages | `src/Pages/WelcomePage.tsx`, `RoutePlaceholder.tsx`, `Auth/AuthPage.tsx`, `Admin/AdminPlaceholder.tsx`, `Admin/DashboardPage.tsx`, `Admin/navigation.ts` |
| Session integration | `src/Security/sessionCoordinator.ts` |
| Localization | `src/i18n/resources.ts`, `locales/ar/routing.json`, `locales/en/routing.json` |
| Build tooling | `scripts/generate-services.mjs`, `scripts/verify-route-bundles.mjs`, `vite.config.ts`, `package.json` |
| Tests | `tests/unit/routing.test.ts`, `app.test.tsx`, `session-coordinator.test.ts`; `tests/browser/routing.spec.ts`, `routingFixtures.ts`, `transport.spec.ts` |
| Documentation | This report, `docs/routing-access.md`, `docs/authentication.md`, `README.md`, Part 04 approval evidence, master ledger and Part 05 visual evidence |

No backend files, dependency versions, accounts, certificates, API data or deployment were changed. Package lock remains valid because only a package script was added. The transport browser test now waits for the mounted session controls instead of importing a separate HMR-versioned coordinator singleton.

## Verification

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 business operations, one CSRF endpoint, 87 schemas, seven numeric enums, zero documented discrepancies against the live backend. |
| `npm run services:check` | PASS: 101 typed operations, 83 wire shapes and seven enums. |
| `npm test -- --maxWorkers=2` | PASS: 19 files, **280 tests**. New coverage includes unsafe/forbidden returns, parameter encoding and the confirmed-login/unmount/logout race. |
| `npm run build` / typecheck | PASS: 177 modules; final production CSS is 49.08 kB, and the actual manifest is emitted for inspection. |
| `npm run lint` / `git diff --check` | PASS: no errors/warnings or whitespace errors. |
| `npm run routes:check-build` | PASS on final production manifest. Admin layout (`AdminLayout-CJfO1ozV.js`), admin placeholder (`AdminPlaceholder-d9flsWJd.js`) and dashboard (`DashboardPage-DJutbBx1.js`) are separate lazy entries absent from startup/public/account static imports; dev fixtures are absent from production JS. |
| Trusted-HTTPS Chromium desktop/mobile browser suite | PASS: all **62 cases** across `npm run test:browser -- --workers=3` (60 passed; two history-test harness failures) and `npm run test:browser -- --last-failed --workers=2` (both corrected cases passed; no remaining failures). `NODE_OPTIONS=--use-system-ca`; no skipped cases or TLS bypass. |
| Human visual inspection | PASS for the inspected captures below; all 12 screenshots are saved. Automated reviews cover both languages and widths across all three layouts. |

Sandboxed Vite/process execution was initially denied with EPERM; required unit/build/browser/live-contract checks were rerun through approved execution. TLS certificate verification remained enabled. JSDOM reports its unavailable scrollTo method in unit App rendering; scroll behavior is verified in Chromium.

The full browser run exercises all 44 registered paths as anonymous, customer, Admin and SuperAdmin at both widths (352 direct route/actor visits), plus deep-link reload, back/forward, unknown page, localized title/breadcrumb/focus, saved scroll restoration, correct/forbidden/external returns, real login/logout integration, bootstrap/outage/retry, delayed/failed lazy imports, mobile menus and cross-layout locale persistence. The history test initially imported another router singleton; its correction activates the actual rendered Link while preserving the selected scroll position. Only that test changed after the final full run, and both viewport cases then passed on targeted rerun. The existing 36 browser cases remain covered alongside 26 routing cases. Intercepted APIs are explicitly not presented as real-server evidence.

## Acceptance evidence

| Requirement | Evidence |
|---|---|
| Prescribed paths, builders and one Router | Route definitions, actual nested router and separate path exports; browser matrix exercises all 44 paths with every actor at both widths. |
| Public/account/admin navigation | Responsive layouts, scoped navigation labels, shared language/logout/notices and placeholder subnavigation. |
| Bootstrap, outage, wrong actor, member and SuperAdmin policy | Browser matrix, delayed bootstrap/outage/retry, real staff-login return/403 and no admin-module/business-request assertions before permission. |
| Lazy split and separate pending indicators | Real page/layout lazy imports; delayed import browser case, retained header/footer, production manifest graph check; API controls retain their own pending state. |
| Errors, history, deep links, focus and scrolling | Every route is opened directly; explicit reload/back/forward, 404, lazy import failure/reload, titles, breadcrumbs, focus, reset and saved scroll restoration browser checks. |
| Safe returns and private cleanup | Malicious/forbidden/auth return unit/browser cases, valid query/hash login, staff destination filtering, production logout removes account navigation, generation-keyed outlets and existing session privacy tests. |
| Arabic/English and RTL/LTR | Complete translation-key parity plus both language/viewport browser reviews, no horizontal overflow, mobile menu behavior and locale persistence across layouts/reload. |
| Deferred phases and gate | Exact placeholder inventory in the route/access guide; no later feature/API implementation or deployment. |

## Bilingual visual review

Inspected Arabic desktop Dashboard/account and English desktop public captures, plus English mobile Dashboard/account and Arabic mobile public captures. Reviewed sidebar/card mirroring, readable navigation and headings, spacing, retained fonts/artwork, responsive wrapping and the actual fixture role/name summary. The saved final headings do not show an unintended focus box; interactive controls retain visible keyboard focus. Automated reviews confirm no horizontal document overflow, language/direction, menu Escape behavior and locale persistence across public/account/admin navigation and reload. Screen-reader playback is not claimed.

| Language / CSS width | Public | Account | Dashboard |
|---|---|---|---|
| Arabic / 1440 | [Public](evidence/part_05/ar-1440-public.png) | [Account](evidence/part_05/ar-1440-account.png) | [Dashboard](evidence/part_05/ar-1440-admin.png) |
| English / 1440 | [Public](evidence/part_05/en-1440-public.png) | [Account](evidence/part_05/en-1440-account.png) | [Dashboard](evidence/part_05/en-1440-admin.png) |
| Arabic / 375 | [Public](evidence/part_05/ar-375-public.png) | [Account](evidence/part_05/ar-375-account.png) | [Dashboard](evidence/part_05/ar-375-admin.png) |
| English / 375 | [Public](evidence/part_05/en-375-public.png) | [Account](evidence/part_05/en-375-account.png) | [Dashboard](evidence/part_05/en-375-admin.png) |

## Dependencies and approval

Browser APIs are intercepted, using trusted frontend HTTPS and native browser navigation/locks. This verifies frontend behavior and fixture cookie transport, not actual backend cookie issuance, expiry/rotation/logout or resource ownership. The approved Part 04 [real-backend environment dependency](session-verification.md) remains open; no credentials or server availability were invented.

Media delivery, currency, staff provisioning, API budgets/capacity and production SPA hosting remain their documented dependencies. This phase makes no business data calls beyond the existing session/auth flow. Public browsing, account operations and admin management remain in Parts 06–11; SignalR and release remain Parts 12–13. Production rewrite/deployment checks, Firefox/WebKit and human screen-reader playback are not claimed.

All required Part 05 frontend checks pass. Part 05 is **Awaiting approval**. Approval has not been inferred, and Part 06 remains **Not started**. The implementation skill requires: "Report the result and request phase approval when that gate is reached"; the master separately requires explicit approval before Part 06.
