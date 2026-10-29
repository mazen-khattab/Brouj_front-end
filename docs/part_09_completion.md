# Part 09 — Admin customers, reservations and orders

Date: 2026-10-29. Status: **Awaiting approval**. Part 08 was approved by the user in this conversation: “Ok, Approved. Now, let's navigate to the next part.” with `$implement-brouj-frontend-part part_09`. This report covers Part 09 only. Part 10 implementation and deployment are excluded.

## Delivered behavior

The six approved staff list/detail routes now provide customer, reservation and order operations for Admin and SuperAdmin. Customers use only the admin customer endpoints and approved name/email search, isDeleted and paging filters. Personal search text stays in memory; SPA history contains only supported non-personal filters. Search is debounced by 300 ms and limited to 100 characters. Lists are bounded to 100 rows per request, canonicalize unsupported/out-of-range parameters, and recover a page that becomes empty after the last page shrinks. Failed reads preserve filter controls and values.

Customers display only the approved name, email, phone and deletedAt fields. Soft deletion and restoration have separate pending/error/success state and explicit confirmations. Soft deletion is described as retaining the customer and historical records. The detail endpoint remains available for deleted customers, and restoration conflicts are reported safely without disclosing which private account details collided. Neither customer registration nor staff editing of a customer profile is added.

Reservations use `getReservations` and `getReservationDetails`, never the customer's own queries. Processing reservations with no linked order offer confirmed conversion. The bodyless POST supplies only its route reservation ID; there is no price, status, empty JSON object or other fabricated body. The frontend reads the updated reservation and the returned order GUID, checks their relationship, and offers the supported order link. The displayed total, statuses and dates come from returned DTOs.

Order list/detail and initiative completion use their current services. Pending orders offer the completion flow. The backend's creation invariant produces Pending only for initiatives; the DTO itself has no project type. The UI does not claim independently verified type or fetch arbitrary inventory to infer it. The handler decides current eligibility, including a stale status, an inconsistent/legacy Pending regular record or an existing winner. Completion confirmation explicitly explains that accepting the selection also cancels other orders for that unit. The current order is re-read and other mounted order/catalogue views are invalidated.

Cross-links use actual reservation/order IDs. Reservation/order DTOs omit customerId and projectId; consequently no customer relationship or nested unit/project URL is fabricated. Supplied names, unit codes and references remain as supplied. There are no payments, exports, revenue cards, aggregates or unsupported date/search filters.

Three focused contexts own the workflows. Route scope includes staff actor, profile ID, generation and pathname. Read hooks abort superseded requests, reject late generations and discard stale DTOs during loading/errors. A stable reload handle always resolves the latest query, so checking an earlier uncertain action preserves filters selected afterward while keeping the original action target fixed. Operation state is separate per write, with a shared synchronous gate for potentially conflicting customer operations. Locks cover writes and authoritative follow-up reads. 403/404/409 reconcile current state without replay; 429 stays a safe rejection with transport Retry-After metadata. Network/interrupted/5xx/malformed-success or follow-up-read failures block further writes until an explicit outcome check succeeds. Known returned IDs are retained only in route-local memory for reconciliation. Logout/unmount aborts requests and discards private state; canceled transport is never represented as server rollback.

## Changed files

| Area | Files |
|---|---|
| Policies/private invalidation/types | `src/AdminOperations/policy.ts`, `invalidation.ts`, `types.ts` |
| Read/write/filter hooks | `src/Hooks/useStaffRead.ts`, `useStaffOperation.ts`, `useOperationsQuery.ts`, `useOperationsPageBounds.ts` |
| Customer context | `src/Context/CustomerOperationsContext.ts`, `CustomerOperationsProvider.tsx` |
| Reservation context | `src/Context/ReservationsAdminContext.ts`, `ReservationsAdminProvider.tsx` |
| Order context | `src/Context/OrdersAdminContext.ts`, `OrdersAdminProvider.tsx` |
| Shared operational UI | `src/Components/AdminOperations/Shared.tsx`, `classes.ts` |
| Pages | `src/Pages/Admin/OperationsPage.tsx`, `CustomersPage.tsx`, `OperationsRecordsPage.tsx`, `BusinessRecords.tsx` |
| Integration/localization | `src/Router/router.tsx`, `src/i18n/locales/ar/admin.json`, `en/admin.json`; lazy bundle checker |
| Tests | `tests/unit/admin-operations.test.tsx`; `tests/browser/adminOperationsFixtures.ts`, `adminOperations.spec.ts`; staff-route request assertions in `routing.spec.ts` |
| Evidence/docs | This report; `admin-operations.md`; README/routing guide; master ledger/actual Part 08 approval record; 32 masked bilingual captures; full regression refreshed the four existing Part 08 Arabic/English desktop/mobile confirmation captures |

No dependency/lockfile, generated business service, Axios transport, backend source/schema, secret, certificate, actual account or live business record was changed. Concurrent user edits in the catalogue model/form and public read helper were preserved.

## Verification

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 operations, one CSRF endpoint, 87 public schemas, seven numeric enums, zero discrepancies |
| `npm run services:check` | PASS: 101 typed operations, 83 reachable shapes, seven numeric enums |
| `npm run typecheck` / `npm run lint` | PASS: final checks after the read-hook refinement and test-only lint cleanup |
| `npm test -- tests/unit/admin-operations.test.tsx --maxWorkers=2` | PASS: initial 23 focused tests |
| `npm test -- --maxWorkers=2` | PASS: final run, 24 files, 370 tests |
| `npm run build` | PASS: final build, 255 modules; operational lazy chunk 22.61 kB; CSS 52.46 kB |
| `npm run routes:check-build` | PASS: operational page isolated from startup/public/account static imports; development fixtures excluded |
| `npm run test:browser -- --workers=2` with system CA | PASS: uninterrupted 156/156 full regression, 11.1 minutes |
| Final `npm run test:browser -- tests/browser/adminOperations.spec.ts --workers=2` with system CA | PASS: 32/32, 1.5 minutes; includes current-filter reconciliation after the final read-hook correction |
| Live API/SQL/account-policy/cookie verification | Not performed; environment dependency |

Unit coverage includes reservation/order status eligibility, actual soft-delete state, approved bounded query serialization, private search exclusion, separate operation state, synchronous duplicate/conflicting-write locks through read completion, 403/404/409 reconciliation, 429/no replay, uncertain outcomes and failed checks, acknowledged IDs after read failure, malformed IDs, unmount abort, generation changes before/during writes, privacy cleanup after permission failures, StrictMode's initial-read replay and obsolete-result rejection. Provider checks assert all four writes are bodyless and use the approved staff service functions, with authoritative reservation/order reads after conversion/completion.

Browser journeys cover customer paging/search/soft-delete/restore, restore collision, staff reservation lookup, bodyless conversion, duplicate/stale conversion, linked-order retrieval, initiative completion and competing-order cancellation, stale/unsupported completion rejection, uncertain committed writes, failed follow-up reads, explicit reconciliation, 403/404/429/empty results, retained filters, no hidden joins, logout/back-navigation cleanup and masked Arabic/English tables/details/dialogs. Fixtures drive real frontend services and transport over trusted HTTPS, using synthetic data.

Two exploratory browser setups required corrections: the completion test clicked while list-to-detail navigation was still settling, then used the wrong localized heading label; the logout history test initially returned to about:blank before reading storage. Tests now wait for the actual detail route/title and establish a protected prior history entry. Assertions were retained. Review also prevented duplicate history entries when typing an in-memory search on page one, improved intact mobile reference codes and removed implementation details from staff-facing completion copy. These are documented frontend/test refinements, not backend behavior changes.

The uninterrupted full regression passed 156/156. A separately added regression then confirmed that an uncertain action could retain a refresh callback for an older filter and leave the current list loading. The private read hook now keeps a stable reload handle backed by the latest query, without changing the original action target. The final full unit run passed 370/370 and the final expanded operational browser run passed 32/32 after that correction. All 158 distinct current browser cases have passing evidence across the full and focused runs; a single uninterrupted 158-case run is not claimed. Final browser suites contain no failed/skipped cases and use trusted HTTPS without an ignore-errors bypass. A test-only lint cleanup removed two unused callback parameters after the successful unit run.

## Bilingual review

Thirty-two captures cover eight views in Arabic/English at 1440px and 375px CSS widths. All data is synthetic. Customer names, email, phone and search input values are additionally masked before saving. References, project names and amounts are synthetic supplied DTO values. Each capture checks document direction and horizontal page overflow; long project names wrap and the table scrolling region retains access to offscreen actions. Keyboard tests cover focusable table scrolling, confirmation through Enter, Escape dismissal, trigger-focus restoration and Tab containment. Manual samples include the English desktop customer table/order detail and Arabic mobile reservation table/completion dialog. Refreshed Arabic mobile table and English desktop order captures were inspected after the reference-width and staff-copy improvements. The final focused run regenerated all 32 captures.

| View | Arabic / 1440 | English / 1440 | Arabic / 375 | English / 375 |
|---|---|---|---|---|
| Customers | [View](evidence/part_09/ar-1440-customers.png) | [View](evidence/part_09/en-1440-customers.png) | [View](evidence/part_09/ar-375-customers.png) | [View](evidence/part_09/en-375-customers.png) |
| Customer detail | [View](evidence/part_09/ar-1440-customer.png) | [View](evidence/part_09/en-1440-customer.png) | [View](evidence/part_09/ar-375-customer.png) | [View](evidence/part_09/en-375-customer.png) |
| Reservations | [View](evidence/part_09/ar-1440-reservations.png) | [View](evidence/part_09/en-1440-reservations.png) | [View](evidence/part_09/ar-375-reservations.png) | [View](evidence/part_09/en-375-reservations.png) |
| Reservation detail | [View](evidence/part_09/ar-1440-reservation.png) | [View](evidence/part_09/en-1440-reservation.png) | [View](evidence/part_09/ar-375-reservation.png) | [View](evidence/part_09/en-375-reservation.png) |
| Conversion confirmation | [View](evidence/part_09/ar-1440-conversion.png) | [View](evidence/part_09/en-1440-conversion.png) | [View](evidence/part_09/ar-375-conversion.png) | [View](evidence/part_09/en-375-conversion.png) |
| Orders | [View](evidence/part_09/ar-1440-orders.png) | [View](evidence/part_09/en-1440-orders.png) | [View](evidence/part_09/ar-375-orders.png) | [View](evidence/part_09/en-375-orders.png) |
| Order detail | [View](evidence/part_09/ar-1440-order.png) | [View](evidence/part_09/en-1440-order.png) | [View](evidence/part_09/ar-375-order.png) | [View](evidence/part_09/en-375-order.png) |
| Completion confirmation | [View](evidence/part_09/ar-1440-completion.png) | [View](evidence/part_09/en-1440-completion.png) | [View](evidence/part_09/ar-375-completion.png) | [View](evidence/part_09/en-375-completion.png) |

## Acceptance mapping

| Requirement | Evidence |
|---|---|
| Approved paginated customer list/detail, soft-delete/restore only | Dedicated customer context, exact DTO fields, bounded query tests and keyboard/table/detail journey |
| Staff reservation endpoints and linked order | Provider/service assertions, browser request checks and supported-ID links |
| Confirmed bodyless conversion with server-derived total/status | Zero-byte POST assertion, duplicate-submit tests and fresh reservation/returned-order reads |
| Initiative completion/current handler rules | Pending-only policy, documented type inference, explicit competing-order cancellation and regular/stale rejection tests |
| Only supported relations, no hidden joins | DTO-based links and no fabricated unit/project/customer links or own-query substitution |
| Separate operation state and authoritative refresh | Shared write gate, provider tests, conflict/uncertainty/browser cases and private invalidation boundary |
| Failure preservation/403/404/409/429/empty cases | Safe feedback, persistent in-memory filters, scoped missing IDs and no replay assertions |
| Cleanup, privacy, Arabic/English, keyboard/mobile | Actor-generation/unmount tests, logout/history journey, storage assertions and 32 masked captures |
| Current-filter reconciliation after an uncertain action | Reproducing saved-handle unit case, corrected private read boundary and desktop/mobile list-action browser cases; final suites pass |

## Backend evidence and dependencies

Current read-only sources: Part8.EndpointContracts JSON/Markdown, Part8.ApiConfiguration and Part12.FinalVerification; Part 01 API/UI matrix and schemas; AdminCustomersController, AdminReservationsController, AdminOrdersController and their request parameters; CustomerDto, ReservationDto, OrderDto; soft-delete/restore/query handlers/validators; CreateOrderFromReservation and CompleteInitiativeOrder handlers; order/reservation enums, API JSON configuration and authorization policies. Source confirms restoration uniqueness checks, server-derived order totals, atomic confirmation/order creation, the shared unit lock, initiative winner selection and competing-order cancellation. Numeric enums and unknown-property rejection remain unchanged. No contract discrepancy was found.

OrderDto omits project type; completion button eligibility therefore uses the current Pending creation invariant and leaves the server to reject any unsupported legacy/stale case. Reservation/order DTOs omit customerId and projectId; that documented boundary limits cross-links and is not bypassed by guessing or bulk joins. These limitations do not require a backend change for the selected phase.

No API listener was present on local port 7249 during inspection. Intercepted browser fixtures do not establish actual SQL mutations/locking, real account authorization, actual cookie lifecycle or multi-instance behavior. The inherited [real-backend verification dependency](session-verification.md) still requires a configured API and dedicated verification accounts/inventory. No backend edits, provisioning or fabricated live interactions were performed.

Existing release currency, media delivery, performance budgets and hosting inputs remain deployment dependencies; these workflows add no media URL assumptions or performance claim. Chromium desktop/mobile is covered. Firefox/WebKit, human screen-reader playback and production deployment are not claimed. Required frontend acceptance items have passing evidence with the permitted live-environment dependencies stated. Part 10 remains Not started and requires explicit Part 09 approval.
