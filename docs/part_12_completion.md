# Part 12 — SignalR readiness

Date: 2026-10-29. Status: **Approved**. Part 11 was approved by the user in this conversation: “Ok, Approved. Now, let's navigate to the next part.” with `$implement-brouj-frontend-part part_12`. Part 12 received the same explicit user approval on 2026-10-29 with `$implement-brouj-frontend-part part_13`. Part 13 evidence is recorded separately.

## Delivered behavior

An inactive, transport-independent real-time boundary now wraps the application inside `AuthProvider`. The adapter supports start/stop, status snapshots/subscriptions and event subscriptions with unsubscribe functions. It defines all five prescribed statuses. The default disabled implementation has no URL, network connection, timers, SignalR package, activation flag or connected badge.

Internal reservation/order/time-plan hints reload the corresponding mounted customer/member and staff contexts through their existing services. Hints contain only the feature and optional resource ID; they never update business values directly. Lists retain paging/status filters and reload for any matching feature hint because list membership may change. Details retain their record ID and ignore unrelated IDs; time plans use project IDs. Existing cancellation and latest-response guards protect obsolete reads.

The reload queue coalesces bursts and retains one trailing refresh when hints arrive during a read. Promise completion is bound to a request sequence, so an older completed read cannot release the next read's pending lock. Errors remain in the feature's existing localized error state; later hints/manual refresh can retry reads without replaying writes.

Actor/type/ID/generation and route lifetimes scope subscriptions. Cleanup invalidates callbacks before unsubscribe/stop; callbacks and queued dispatches also check the current session generation. Logout, actor switches, obsolete reads and StrictMode remounts cannot deliver old private results into a new session. Reconnection triggers one feature-wide resynchronization for each of the three features because events may have been missed. Only mounted readers respond.

See the [adapter/lifecycle guide and future activation checklist](realtime-readiness.md). A deterministic fake lives under test fixtures and is injected only into tests/development harnesses. It is excluded from production chunks; no fake demonstration UI ships.

## Changed files

- `src/Realtime/types.ts`, `disabledAdapter.ts`, `session.ts`, `reloadQueue.ts`: interface, disabled implementation, generation/activation lifecycle, reconnect resynchronization and coalescing.
- `src/Context/RealtimeContext.ts`, `RealtimeProvider.tsx`, `src/Hooks/useRealtimeReload.ts`: auth-owned lifecycle and mounted feature subscriptions.
- `src/main.tsx`: provider placement inside authentication; retains the existing locale/toast/router architecture.
- `src/Context/AccountDataProvider.tsx`, `ReservationsAdminProvider.tsx`, `OrdersAdminProvider.tsx`, `TimePlanProvider.tsx`: focused integration with existing service-backed readers.
- `tests/fixtures/fakeRealtimeAdapter.ts`, `tests/unit/realtime.test.tsx`: fake transport and 26 new boundary/integration/lifecycle cases.
- `tests/browser/realtime.spec.ts`: 12 bilingual desktop/mobile public/customer/staff disabled-mode cases and eight captures.
- `scripts/verify-route-bundles.mjs`: production fake-exclusion check.
- This report, `docs/realtime-readiness.md`, `docs/evidence/part_12/`, Part 11 approval evidence and the master ledger.

The previously existing Part 11 implementation and user changes were preserved. Existing browser tests regenerated earlier-phase screenshots; those generated changes were restored, leaving only Part 12 captures. No backend, package, REST DTO, service contract, route or translation changes were needed.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Pass: TypeScript and Vite production build, 299 transformed modules |
| `npm run lint` | Pass: zero warnings |
| `npm run contracts:check` | Pass against current backend: 101 business operations, 1 CSRF endpoint, 87 public schemas, 7 numeric enums, zero documented discrepancies |
| `npm run services:check` | Pass: 101 typed operations, 83 wire shapes, 7 numeric enums |
| `npm run routes:check-build` | Pass after final build: lazy boundaries preserved; development fixtures and fake adapter excluded |
| `npm test -- --maxWorkers=2` | Final pass: **440 tests in 27 files**, including all **26** real-time cases |
| Affected-workflow trusted-HTTPS browser run | **111/112 passed** in 5.8 minutes: account, admin operations, planning and realtime specs; all 12 real-time cases passed |
| Final targeted browser rerun | **14/14 passed** in 44.3 seconds after the queue fix: all 12 real-time cases plus both desktop/mobile unsaved-planning-navigation cases |
| `git diff --check` and new-file trailing-whitespace scan | Pass |

Browser commands use Windows system certificate trust, with HTTPS verification enabled:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm run test:browser -- tests/browser/realtime.spec.ts tests/browser/account.spec.ts tests/browser/adminOperations.spec.ts tests/browser/planning.spec.ts --workers=2
npm run test:browser -- tests/browser/realtime.spec.ts tests/browser/planning.spec.ts --grep 'disabled realtime|unsaved edits' --workers=2
```

The 112-case run's sole failure was an existing desktop unsaved-planning-navigation case: its discard button became unstable/detached during the test's 30-second deadline. The mobile counterpart passed in that run, and both passed in the final targeted run without a planning production/test change. All **112 distinct affected browser cases have passing evidence across these two runs**; this is not a claim of one uninterrupted 112-case pass. The final queue-sequence fix is covered by the final full unit suite, build and 14-case browser run. The entire 256-case application browser suite was not rerun for Part 12.

Development checks corrected a root StrictMode test-harness assumption and a wrong time-plan URL in the new browser test, which now uses the existing route builder. A deliberately added completion-race regression failed before the queue fix and passes in the final suite. The earlier full unit run passed 439 cases before that final regression was added. Windows sandbox process-spawn failures were rerun with the required execution permission. The browser runner initially could not reuse the existing HTTPS server until Node system trust was enabled; TLS checks were never bypassed.

## Acceptance evidence

| Requirement | Evidence |
|---|---|
| Independent adapter and statuses | Typed interface plus fake start/stop/status/event unsubscribe tests; synchronous/async lifecycle failures contained |
| Disabled mode makes zero hub requests | Direct adapter network/timer spies and 12 browser cases; no application WebSocket/EventSource, negotiation or extra API path; Vite HMR socket distinguished |
| Mounted reservation/order/time-plan reloads | Five customer/member reader variants and three staff providers read through their actual service functions with preserved query/record arguments; staff detail ID filtering also tested |
| Server-authoritative values | Extra fake-event price/status properties cannot supply DTO state; changed values appear only after the service read resolves |
| Coalescing and cancellation | Initial/customer/staff pending-read bursts, one trailing read, fast/rejected promise handling, older-completion lock regression, filter changes and aborted obsolete reads |
| Reconnect resynchronization | Reconnecting/connected and disconnected/connected transitions reload mounted features once; repeated connected notifications do not duplicate refreshes |
| Route/actor lifetime and StrictMode | Route removal/re-entry, one active listener after root StrictMode remount, anonymous fake never started, stop on logout, customer-to-customer/customer-to-staff switches, canceled old reads and captured stale events/statuses |
| Pre-commit actor protection | Coordinator generation change rejects a transport callback and a reload already queued before React commits |
| Future activation agreement | Explicit checklist for URL, cookies/CORS/auth, authorization/ownership/groups, event mapping, disconnect/reconnect/replay and negotiation/CSRF review before a separately approved client/flag change |

## Arabic/English review

There is no new visible real-time UI or translated copy. Browser checks cover existing public, customer and staff pages in Arabic/RTL and English/LTR at 375/1440 px, preserve current filters, check no page-level overflow and confirm logout still removes private access. Eight synthetic captures cover the member time plan and staff orders. Representative Arabic/English mobile plans and desktop staff tables were visually inspected for direction, wrapping and absence of a fake connection indicator. Existing table wrapping/scrolling and media placeholders remain. Identity text is masked where present; business references are synthetic. No human screen-reader playback is claimed.

| View | Arabic desktop | Arabic mobile | English desktop | English mobile |
|---|---|---|---|---|
| Member time plan | [1440](evidence/part_12/ar-1440-customer.png) | [375](evidence/part_12/ar-375-customer.png) | [1440](evidence/part_12/en-1440-customer.png) | [375](evidence/part_12/en-375-customer.png) |
| Staff orders | [1440](evidence/part_12/ar-1440-admin.png) | [375](evidence/part_12/ar-375-admin.png) | [1440](evidence/part_12/en-1440-admin.png) | [375](evidence/part_12/en-375-admin.png) |

## Backend boundaries and remaining dependencies

Read-only evidence includes the Part 8 endpoint JSON/Markdown and API configuration, Part 12 backend handoff, Part 01 wire matrix, `Program.cs`, CORS configuration and a backend source scan for SignalR/hub registration. No live hub or approved event contract exists in those sources. Existing REST contracts remain authoritative and unchanged. Readiness is complete with the connection intentionally disabled.

Actual live API/database/cookie verification remains the existing [session dependency](session-verification.md). Real SignalR negotiation, authorization/groups, credential policy and reconnect/replay behavior cannot be verified until the backend agreement and separately approved activation exist. Inherited currency, media hosting, deployment and backend capacity dependencies remain documented; none is closed by this phase. No deployment, Microsoft client installation, activation flag or Part 13 release work was performed.

Part 12 is **Approved** by the user on 2026-10-29 with the Part 13 invocation. Approval does not activate real time or authorize deployment.
