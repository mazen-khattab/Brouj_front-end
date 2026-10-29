# Part 07 — Customer account and reservations

Date: 2026-10-29. Status: **Approved**. Approved by the user on 2026-10-29 in this conversation: “Ok, Approved. Now, let's navigate to the next part.” with `$implement-brouj-frontend-part part_08`. Part 06 had been approved with the Part 07 invocation. This report covers Part 07 only; no deployment is included.

## Delivered behavior

Customer profile display/edit and password change use the existing services and exact approved fields. Local validation matches the live validators, safe server errors attach to fields, and failed requests preserve form edits. Successful profile writes re-read identity and profile. Successful password writes clear passwords and re-read identity; the current handler retains the session. Wrong-current-password is a business 401 and explicitly skips authentication recovery/replay. Definitive identity rejection clears the guarded branch and returns to sign-in.

An available unit offers an explicit localized reservation confirmation. The only body is `{unitId}`. A synchronous single-flight lock prevents duplicate dispatch, the pending dialog cannot be dismissed, and the returned GUID drives navigation to a fresh detail read. Reservation lists/details use customer-scoped endpoints and server pagination/status filtering. Cancellation has its own confirmation and appears only for Processing with no linked order; server authorization/business state remain authoritative. Successful cancellation reloads detail. A 409 explains the conflict and re-reads current unit/reservation state without repeating the action.

Customers can read their paginated orders and their detail through the intentionally MemberOnly `GET /api/v1/admin/orders/{id}`, while browser URLs stay under `/account`. There are no customer order creation/completion controls or calculated authoritative totals. Foreign-owner 404 responses remain unavailable without probing another endpoint. Reservation/order DTOs lack projectId, so no nested unit URL is fabricated from their display names.

Member project schedules show supplied plan/stage delivery dates and item statuses/due/confirmed dates, progress descriptions and the shared safe media gallery. Customers and staff are admitted by membership; no reservation prerequisite is imposed. Plan/stage DTOs have no status, so the UI does not synthesize one. Names/descriptions/legal terms remain supplied plain text. Terms are informational; no unsupported consent field is sent.

Private feature providers live under guarded routes and use actor/ID/generation read keys, immediate stale-data hiding, abort/latest-response checks and cleanup on identity changes. Public unit confirmation is separately lazy and mounts only for confirmed customers. Password/profile drafts and DTOs are never persisted or logged. Interrupted/5xx/malformed-success writes are uncertain, block another write and offer an explicit current-data check; reservation actions link to the customer's reservation list. Cancellation is not represented as rollback.

## Changed files

| Area | Files |
|---|---|
| Policies/contexts/hooks | `src/Account/policy.ts`; `src/Context/CustomerActionContext.ts`, `CustomerActionProvider.tsx`, `AccountDataContext.ts`, `AccountDataProvider.tsx`; `src/Hooks/useAccount.ts` |
| Pages/shared feedback | `src/Pages/Account/AccountPage.tsx`, `ProfileForms.tsx`, `CustomerScope.tsx`, `CustomerReservation.tsx`, `TimePlanPage.tsx`; `src/Components/Account/AccountFeedback.tsx` |
| Session integration | `src/Security/sessionCoordinator.ts`, `src/Context/AuthContext.ts`, `AuthProvider.tsx`; exported existing email validator in `src/Pages/Auth/validation.ts` |
| Routes/catalogue | `src/Router/router.tsx`, `src/Pages/Catalogue/CataloguePage.tsx`, `src/Components/Catalogue/ReservationEntry.tsx`; `scripts/verify-route-bundles.mjs` |
| Localization | `src/i18n/locales/ar/account.json`, `en/account.json`, `src/i18n/resources.ts` |
| Tests | New `tests/unit/account.test.tsx`, `tests/browser/accountFixtures.ts`, `account.spec.ts`; coordinator identity-read tests; updated AuthValue fixtures and catalogue/routing integration expectations |
| Documentation/evidence | This report, `customer-account.md`, authentication/catalogue/routing guides, README, master ledger, actual Part 06 approval record and Part 07 captures |

No package, lockfile, generated API contract, backend source, secret, certificate, account, live record or deployment was changed. Part 08 remains Not started.

## Verification

| Check | Outcome |
|---|---|
| `npm run contracts:check` | PASS: 101 business operations, one CSRF endpoint, 87 schemas and seven numeric enums; zero documented discrepancies |
| `npm run services:check` | PASS: 101 operations, 83 reachable shapes and seven numeric enums |
| `npm run typecheck` / `npm run lint` | PASS, no errors/warnings |
| `npm test -- --maxWorkers=2` | PASS: 21 files, 324 tests |
| `npm test -- tests/unit/locale.test.ts --maxWorkers=2` | PASS: four locale checks after the final bilingual copy correction; retried outside the sandbox after Vite's helper process was blocked with EPERM |
| `npm run build` | PASS: 221 modules; separate AccountPage (8.87 kB), TimePlanPage (2.56 kB), CustomerScope and CustomerReservation chunks; CSS 51.49 kB |
| `npm run routes:check-build` | PASS: admin modules remain outside startup/public/account static imports; account/schedule/customer-action modules are lazy; development fixtures excluded |
| `npm run test:browser -- --workers=2` with `NODE_OPTIONS=--use-system-ca` | 99/100 PASS; one existing catalogue visual case had `page.goto: net::ERR_ABORTED`. All 20 new Part 07 cases passed. |
| `npm run test:browser -- --grep 'cards, detail, gallery\|profile validation preserves' --workers=2` with system CA | PASS: all six cases, including the interrupted review, all four bilingual catalogue reviews, and expanded profile post-save outage checks at both widths. No failed/skipped cases. |
| Live API/database/cookie/progress-image delivery | Not claimed; see dependencies below |

Unit coverage includes profile/password validation, exact request fields, unchanged password spaces, single-flight writes, uncertainty blocking/malformed-success handling, cancellation eligibility, stale-generation rejection, unmount abort/late-result rejection, and same-generation identity reload with network retention/definitive rejection. Existing transport/service/architecture/localization tests remain included.

Browser acceptance exercises register → return to selected unit → confirm once → authoritative reservation detail → cancel → filtered own list, duplicate/unavailable conflicts without replay, uncertain create/cancel with current-list links, cancellation conflict removing eligibility, foreign reservation/order 404, profile field validation/preserved edits/exact payload/no persistent PII, password validation/wrong-current 401/session retention/actual rejection, own-order endpoint/read-only controls, member schedules without reservation reads, expiry recovery/definitive expiry/logout/history cleanup. Existing route tests continue every route/actor combination, including shared staff time plans and customer-only account operations.

An initial targeted run passed 18/20 cases; the order-detail request assertion ran while the same total was still visible in the list. It now waits for the detail URL and actual request. This was a test synchronization correction. The complete run then passed 99/100, with one interrupted navigation in an existing English desktop catalogue capture. All four catalogue visual cases passed on the targeted rerun without changing their implementation or weakening assertions. The same rerun passed the expanded profile check: a committed save followed by a 503 identity read preserves the draft and blocks another write until an explicit profile read succeeds. Reload-failure copy was made neutral because that state can also follow a rejected write's identity check. The final build/typecheck/bundle/lint checks were repeated after that copy correction. All 100 distinct browser cases now have passing evidence across the full run and targeted rerun; a single uninterrupted green 100-case run is not claimed. No HTTPS bypass or skipped cases were used.

## Bilingual visual evidence

Saved 28 captures: seven views in Arabic/English at 1440px and 375px CSS widths. Profile inputs are masked before saving to omit personal values/passwords. All inventory/reference/names elsewhere are synthetic test fixtures. Captures check direction and horizontal page overflow; supplied English fixture names remain unchanged inside Arabic UI. Manual visual inspection sampled English desktop profile/order, Arabic desktop schedule/confirmation, Arabic mobile profile/order list, and English mobile reservation detail. The samples show readable spacing, wrapping, translated status/labels, dates/totals, dialog layout and safe progress placeholders. Automated direction/overflow checks cover every view. Mask rectangles deliberately obscure input styling and values in the evidence.

| Screen | Arabic / 1440 | English / 1440 | Arabic / 375 | English / 375 |
|---|---|---|---|---|
| Profile/password | [View](evidence/part_07/ar-1440-profile.png) | [View](evidence/part_07/en-1440-profile.png) | [View](evidence/part_07/ar-375-profile.png) | [View](evidence/part_07/en-375-profile.png) |
| Reservations | [View](evidence/part_07/ar-1440-reservations.png) | [View](evidence/part_07/en-1440-reservations.png) | [View](evidence/part_07/ar-375-reservations.png) | [View](evidence/part_07/en-375-reservations.png) |
| Reservation detail | [View](evidence/part_07/ar-1440-reservation.png) | [View](evidence/part_07/en-1440-reservation.png) | [View](evidence/part_07/ar-375-reservation.png) | [View](evidence/part_07/en-375-reservation.png) |
| Orders | [View](evidence/part_07/ar-1440-orders.png) | [View](evidence/part_07/en-1440-orders.png) | [View](evidence/part_07/ar-375-orders.png) | [View](evidence/part_07/en-375-orders.png) |
| Order detail | [View](evidence/part_07/ar-1440-order.png) | [View](evidence/part_07/en-1440-order.png) | [View](evidence/part_07/ar-375-order.png) | [View](evidence/part_07/en-375-order.png) |
| Member schedule | [View](evidence/part_07/ar-1440-plan.png) | [View](evidence/part_07/en-1440-plan.png) | [View](evidence/part_07/ar-375-plan.png) | [View](evidence/part_07/en-375-plan.png) |
| Reservation confirmation | [View](evidence/part_07/ar-1440-confirmation.png) | [View](evidence/part_07/en-1440-confirmation.png) | [View](evidence/part_07/ar-375-confirmation.png) | [View](evidence/part_07/en-375-confirmation.png) |

## Acceptance mapping

| Requirement | Evidence |
|---|---|
| Profile/password, approved inputs, authoritative reload | Form/browser tests, exact-body unit tests, identity recheck tests; business 401 has no refresh |
| Confirm from unit, one submit, returned GUID/detail | Registration-to-reservation browser journey and synchronous duplicate/malformed-ID unit checks |
| Own reservation paging/status/detail/confirmed cancellation | Filtered-list journey, cancellation success and conflict refresh; server totals and enums |
| Personal orders using intentional member detail contract | Browser request assertion, read-only detail and no order write controls |
| Member schedule and supported progress content | Customer journey without reservation calls, full actor route matrix including staff; DTO fidelity and private-path check |
| Private scoping/cleanup and session invalidation | Guarded keyed providers, late result/unmount tests, expiry/logout/back-navigation browser checks |
| Conflicts/foreign-owner 404 | No replay and one scoped missing-record request per supplied ID |
| Preserve edits/uncertain writes and bilingual review | Form failure checks, uncertainty blocking/current-list links, 28 captures at both directions/widths |

## Backend evidence and dependencies

Read-only live evidence includes CustomerProfileController and its update/password handlers/validators, ReservationsController/create/cancel/own queries, AdminOrdersController/own-order handlers, TimePlan read/authorization handler, numeric enums and serialization, plus Part8.EndpointContracts, Part8.ApiConfiguration and Part12.FinalVerification. The current password handler updates the hash without revoking the session. Ownership is enforced in handlers, including foreign-owner 404; customer cancellation is limited to Processing/no order and server locking remains authoritative. No contract discrepancy was found.

Port 7249 had no listener during inspection. Intercepted browser fixtures exercise real frontend services and transport over trusted HTTPS, but do not establish real SQL mutations, ownership enforcement, API cookies or token rotation. The existing [real-session verification dependency](session-verification.md) remains open; the configured backend and dedicated account/fixture setup are environment inputs. No backend changes or fabricated live interaction are claimed.

Progress/property imagePath is a storage identifier. No approved delivery mapping exists, so the inherited localized placeholders remain; paths never become DOM content or guessed URLs. Release requires an approved host/mapping or explicit disposition of the remaining image-display limitation. Release currency, provisioning, API budgets and hosting remain existing inputs. Chromium desktop/mobile is covered; Firefox/WebKit, human screen-reader playback and production deployment are not claimed. Phase approval does not grant release approval.

All required frontend acceptance items have passing evidence, with the permitted environment/media dependencies stated above. The user's explicit Part 07 approval was received with the Part 08 invocation; subsequent phase work is recorded separately.
