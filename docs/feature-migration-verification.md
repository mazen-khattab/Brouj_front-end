# Feature migration verification

The working tree was clean before implementation. Browser routes, access requirements, generated services, and backend contracts were retained. All API/browser evidence uses synthetic fixtures; it does not establish live-backend persistence or deployment readiness.

## Phase checkpoints

Each checkpoint included TypeScript, a production build, relevant lint, unit checks, desktop/mobile browser journeys, bundle isolation, and refreshed API-consumer evidence.

| Phase | Unit checks | Browser coverage |
| --- | --- | --- |
| 3 — Customers | 26 operations tests | Customer filtering, bounded paging, search privacy, deletion/restoration, and conflict recovery on both viewports. Bilingual operation layouts were also covered in Phase 4. |
| 4 — Reservations | 81 booking/account/operations/realtime tests | 66 journeys covering booking, guest registration with draft retention, cancellation, conversion, authoritative refresh, uncertainty, logout, and Arabic/English layouts. |
| 5 — Orders | 74 account/operations/realtime tests | 20 journeys covering customer orders, conversion, initiative completion, races, uncertain outcomes, and bilingual operations. |
| 6 — Authentication, Profile, Staff | 46 validation/form/account/governance tests | 26 journeys covering credentials, profiles/passwords, staff management, permissions, dirty-navigation protection, and bilingual layouts. |
| 7 — Terms and Activity Logs | 16 governance/planning-form tests | 38 journeys covering immutable terms, activation, public refresh, audit filters, permissions, draft retention, and bilingual keyboard review. |
| 8 — Public property browsing | 90 catalogue/details/booking/realtime/admin-form tests | 48 journeys covering city-to-unit navigation, query/history behavior, filters/lookups, independent schedule/media failures, and booking entry; two desktop-only screenshot cases intentionally skip on mobile. |
| 9 — Home, About, Dashboard | 30 app/routing/localization tests | 32 home/about/public-style journeys; two desktop/tablet-only checks intentionally skip in the mobile project. |

Several pre-existing browser assertions had fallen behind the generated contracts and current UI: Terms read URLs, unit carousel links, and the public footer label. Fixtures/assertions were aligned with those existing behaviors. The error fixture now avoids storage access on `about:blank`. Every development browser test uses the shared uncaught-application-error assertion.

The first real lazy homepage unit test has a longer deadline for cold feature-module compilation. Its production/browser behavior is checked separately. Public schedule realtime tests now exercise the hook used by the actual public schedule instead of the removed, unused Account dispatcher.

## Final checks

| Check | Result |
| --- | --- |
| TypeScript and production build | Passed (`npm run build`; a final standalone `npm run typecheck` also passed). |
| Full lint | Passed (`npm run lint`); the final browser-test adjustment also passed changed-file lint. |
| Full unit suite | 31 files, 475 tests passed (`npm test -- --maxWorkers=2`), including four feature-boundary checks. |
| Desktop/mobile browser suite | All 320 runnable cases passed across the full batch and affected rerun; four viewport-specific screenshot cases intentionally skipped. See the run details below. |
| Production lazy bundles | Passed (`npm run routes:check-build`): administration remains lazy and absent from public/customer static imports; development fixtures are excluded. |
| API-consumer coverage | Passed (`npm run release:coverage`): 104 operations, 103 UI consumers, one explicit project-lookup UI exclusion. Generated evidence is in `docs/release/api-coverage.*`. |
| Release hosting/policy tests | Six passed (`npm run release:test`). |
| Whitespace and cleanup | `git diff --check` passed. Legacy business folders, temporary migration scripts, pass-through API modules, and temporary re-exports were removed. |

The full 324-case browser batch completed with 316 passes, four intentional skips, and four failures from one outdated realtime logout scenario. That scenario finished on a public schedule but expected logout to display a login form. It now checks logout from a protected customer route after covering the public schedule. The complete 12-case realtime suite then passed in both languages and viewports. No production code changed between the full batch and this test-only correction. Every browser test asserts that no uncaught application errors occurred.

Local ignored evidence is retained in `artifacts/feature-migration/full-browser-report`, `full-browser-results`, and `realtime-browser-report`. Test-generated changes to tracked historical screenshots were restored after verification.

## Inherited contract snapshot failures

Two additional checks remain failing against unchanged inputs and generated contracts:

- `npm run services:check` reports stale `src/Types/contracts.ts`. The checked-in schema snapshot still describes numeric Terms version numbers and omits planning stage percentages. Existing frontend types and live backend DTO source use string version numbers and include percentages. The snapshot also retains older Terms read routes.
- `npm run contracts:check` reports `Missing live route: GET /api/v1/admin/terms-and-conditions`. The backend's existing endpoint document lists that route, while its controller and the existing generated frontend service use protected `GET /api/v1/terms-and-conditions`.

The migration leaves `src/Services`, `src/Types/contracts.ts`, generated service route paths, `docs/contracts`, and the generation/contract-check scripts unchanged. Refreshing those snapshots requires a separate contract reconciliation. The release rehearsal and release-artifact browser suite were not run because packaging depends on these checks. The production build, bundle checks, fixture-based browser suite, API coverage, and release policy tests above passed; live-backend persistence and release readiness remain unverified.

## Local execution

This workspace requires Vite/Chromium child processes outside its restricted sandbox. Browser checks used the installed system certificate authority with `NODE_OPTIONS=--use-system-ca`; certificate verification remained enabled. `BROUJ_TEST_PORT=5175` selected an isolated server because another process occupied port 5173. The optional port also updates fixture CORS origins.

No backend contract changes, backend writes, production publishing, or deployment occurred. Existing media, extended booking payload, and release approval boundaries remain documented separately.
