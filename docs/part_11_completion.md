# Part 11 — Admin governance and staff

Date: 2026-10-29. Status: **Approved**. Part 10 was approved by the user in this conversation with `$implement-brouj-frontend-part part_11`: “Ok, Approved. Now, let's navigate to the next part.” This report covers Part 11 only. Part 11 was approved by the user on 2026-10-29 with the same explicit approval and `$implement-brouj-frontend-part part_12` invocation.

## Delivered behavior

The existing seven governance/account routes now provide paginated terms-version list/detail/create/activation, filtered activity-log list/detail, read-only staff account/password change, and SuperAdmin staff list/detail/create/update/soft-delete/restore. See the [governance workflow and access guide](admin-governance.md) and [updated route matrix](routing-access.md).

Terms render the supplied legal language as escaped text. There is no legal editor for existing versions or audit mutation/export. Activation refreshes the administrative page/detail and the established invalidation boundary refreshes any mounted public terms reader. Staff creation/update sends only the exact approved inputs, using numeric SuperAdmin=0/Admin=1. The UI explains self-modification and privileged-account constraints while leaving final policy decisions to the server.

Focused route-local providers use the existing cancellation/generation and single-flight operation hooks. Drafts survive rejected writes, including server field errors. Router navigation/unload protects drafts; pending operations remain locked through follow-up reads. Uncertain outcomes block new writes until an explicit authoritative read check, without replay. Permission failures recheck identity; a failed identity read enters the existing bootstrap lifecycle and clears stale access. Denied snapshots are discarded so a later network outage cannot reveal them again.

Staff password change handles the wrong-current-password business 401 without cookie rotation or automatic credential replay. Success clears the mounted secret fields, refreshes identity and accurately states that the current session remains active. Account/audit/staff data stays out of telemetry, URL search filters and browser persistence.

## Changed files

- `src/Governance/policy.ts`: exact form validation and DTO adapters; bounded audit scalar/row handling.
- `src/Hooks/useGovernanceResource.ts`: retained reads, mutation gate integration, permission revalidation and denied-data cleanup.
- `src/Context/TermsAdminContext.ts`, `TermsAdminProvider.tsx`, `ActivityLogsContext.ts`, `ActivityLogsProvider.tsx`, `StaffAdminContext.ts`, `StaffAdminProvider.tsx`, `StaffAccountContext.ts`, `StaffAccountProvider.tsx`: focused route state and approved service integration.
- `src/Components/Governance/Shared.tsx`: localized forms, safe field/operation feedback, confirmations and draft protection.
- `src/Pages/Admin/GovernancePage.tsx`, `TermsWorkspace.tsx`, `AuditWorkspace.tsx`, `StaffWorkspace.tsx`, `StaffAccountWorkspace.tsx`: seven route screens with scoped forms and pagination.
- `src/Router/router.tsx`, `scripts/verify-route-bundles.mjs`: lazy governance route integration and production isolation check.
- `src/i18n/resources.ts`, Arabic/English `governance.json`: complete bilingual labels, validation, status, confirmation and accessibility text.
- `tests/unit/governance.test.tsx`, `tests/browser/governanceFixtures.ts`, `governance.spec.ts`, `routing.spec.ts`: contract, lifecycle, access and bilingual browser evidence.
- This report, `docs/admin-governance.md`, `docs/routing-access.md`, `docs/evidence/part_11/`, Part 10 approval evidence and the master ledger.

Concurrent user formatting changes in `src/Context/AccountDataContext.ts`, `src/Context/CatalogueDetailContext.ts` and `src/Services/Cities.ts` are preserved and are outside the Part 11 implementation. The backend was not edited.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Pass: TypeScript and Vite production build, 293 transformed modules |
| `npm run lint` | Pass: zero warnings |
| `npm run contracts:check` | Pass: 101 business operations, 1 CSRF endpoint, 87 public schemas, 7 numeric enums; zero documented discrepancies |
| `npm run services:check` | Pass: 101 typed operations, 83 wire shapes, 7 numeric enums |
| `npm run routes:check-build` | Pass after the final build: admin/governance chunks remain outside public/startup/account static imports; development fixtures excluded |
| `npm test -- --maxWorkers=2` | Pass: **414 tests in 26 files**, including 12 new governance unit cases |
| Expanded governance Chromium desktop/mobile run | **37/38 passed**; one mobile conflict-text expectation retained a pre-edit translation while the development server reloaded the changed copy; covered by the final stable-source run below |
| Trusted-HTTPS browser regression, `npm run test:browser -- --workers=4` | **235/244 passed** in 14.4 minutes; all **38 governance cases passed**; nine existing catalogue/planning/route cases exceeded loading or route-audit deadlines |
| Failed-case rerun, `npm run test:browser -- --last-failed --workers=2` | **9/9 passed** in 2.2 minutes, without a concurrent build; covers every failure from the full run |
| Final bilingual direction/capture recheck, `tests/browser/governance.spec.ts --grep 'bilingual legal' --workers=2` | **4/4 passed** in 28.8 seconds, after explicit LTR direction and corrected screenshot scroll position/CSS-pixel scaling; all 28 Part 11 captures refreshed |
| Prebuilt backend HTTP assembly | Pass: **288 tests**, zero failed/skipped; see command and qualification below |

The first 32-case browser implementation run passed 24 cases; eight harness failures used incorrect existing pagination/empty-state/heading labels. Those assertions were corrected, and the expanded run passed those affected cases. The expanded run added pending-navigation, audit paging/field-error and malformed-success/session-outage checks. No business mutation is replayed to recover from an unknown outcome.

The full regression's failures were two public-catalogue visual cases, four planning cases and three desktop all-route audits. Their snapshots/traces show pending page loading, unexpected page reloads or the 120-second route-audit deadline. Every failed case passed when rerun with two browser workers and no concurrent build; no production change was required for those failures. All **244 distinct current browser cases have passing evidence across the full run and nine-case rerun**. A final small RTL review change gives email and telephone form inputs explicit LTR direction; its bilingual assertions/captures are rechecked separately. These runs are recorded individually rather than claiming one uninterrupted final 244-case pass.

Backend HTTP command, run against the existing Release assembly without rebuilding or editing backend sources:

```powershell
dotnet test F:/Mazen/Projects/Brouj/tests/Brouj.API.IntegrationTests/bin/Release/net10.0/Brouj.API.IntegrationTests.dll --filter "FullyQualifiedName~Staff_management_requires_SuperAdmin|FullyQualifiedName~Wrong_actor|FullyQualifiedName~EndpointContractTests" --logger "trx;LogFileName=part11-authorization.trx" --results-directory F:/Mazen/Projects/Brouj_front-end/test-results/backend-part11
```

This exercises the existing test-host HTTP endpoint contracts, actor policies, and stale-role test from the compiled assembly. It does not claim a fresh backend source build, live SQL execution, a deployed API or actual browser cookies.

## Acceptance evidence

| Requirement | Evidence |
|---|---|
| Terms creation/activation and public-current refresh | Exact creation/bodyless activation assertions; immutable escaped detail; public-current browser navigation and mounted public-provider unit invalidation |
| Version/effective-date/active labels and source legal language | Version table/detail captures, strict offset-date validation, literal script/image-looking text, no DOM injection |
| Audit filters/pagination and optional data | Exact supported query and action-zero checks, reversed-range rejection, 20-row server paging, empty results, null/object/invalid-date fallback, bounded string/array unit tests |
| Missing before/after data | Current DTO and both projections explicitly omit OldData/NewData; UI explains absence and ignores unexpected structured payloads |
| Staff profile and password change | Read-only account, required/minimum validation, exact password body, wrong-current-password no replay/rotation, success field clearing and accurate session message |
| Role selection, create/update/delete/restore | Exact numeric-role DTO assertions; complete CRUD browser workflow; self-details update; server self-demotion/deletion conflicts retain drafts |
| Admin direct navigation/API and customer isolation | Guard/no-business-read assertions and all six management operations denied in browser fixtures; 288 prebuilt HTTP cases include endpoint wrong-actor coverage and real test-host Admin/stale-role rejection |
| Permission/account changes and current identity | Successful changes reload identity; forbidden refresh removes SuperAdmin navigation and private screens; profile outage enters session-verification state |
| Destructive confirmation, failures and private state | Keyboard confirmation/cancel/focus tests, single dispatch while pending, draft navigation, uncertain/committed-500/malformed-success and failed-follow-up read checks; no persistence assertions |
| Arabic/English and keyboard review | 28 masked synthetic captures at 375/1440 px, role keyboard selection, dialog Escape/focus return, RTL/LTR/no-page-overflow assertions |

## Bilingual visual review

Captured seven views in Arabic/RTL and English/LTR at 375 and 1440 px. Representative desktop staff and mobile legal/create screens were visually inspected for text direction, wrapping, contrast, forms and confirmations. Tables use the existing labeled keyboard-focusable scrolling regions on mobile. The legal wording remains in its supplied language. Private values and password controls are masked in the synthetic captures. This is automated keyboard evidence plus visual inspection, not human screen-reader playback.

| View | Arabic desktop | Arabic mobile | English desktop | English mobile |
|---|---|---|---|---|
| Version list | [1440](evidence/part_11/ar-1440-versions.png) | [375](evidence/part_11/ar-375-versions.png) | [1440](evidence/part_11/en-1440-versions.png) | [375](evidence/part_11/en-375-versions.png) |
| Legal detail | [1440](evidence/part_11/ar-1440-terms.png) | [375](evidence/part_11/ar-375-terms.png) | [1440](evidence/part_11/en-1440-terms.png) | [375](evidence/part_11/en-375-terms.png) |
| Audit detail | [1440](evidence/part_11/ar-1440-audit.png) | [375](evidence/part_11/ar-375-audit.png) | [1440](evidence/part_11/en-1440-audit.png) | [375](evidence/part_11/en-375-audit.png) |
| Staff detail/editor | [1440](evidence/part_11/ar-1440-staff.png) | [375](evidence/part_11/ar-375-staff.png) | [1440](evidence/part_11/en-1440-staff.png) | [375](evidence/part_11/en-375-staff.png) |
| Destructive confirmation | [1440](evidence/part_11/ar-1440-confirmation.png) | [375](evidence/part_11/ar-375-confirmation.png) | [1440](evidence/part_11/en-1440-confirmation.png) | [375](evidence/part_11/en-375-confirmation.png) |
| Own account/password | [1440](evidence/part_11/ar-1440-account.png) | [375](evidence/part_11/ar-375-account.png) | [1440](evidence/part_11/en-1440-account.png) | [375](evidence/part_11/en-375-account.png) |
| Privileged creation | [1440](evidence/part_11/ar-1440-create.png) | [375](evidence/part_11/ar-375-create.png) | [1440](evidence/part_11/en-1440-create.png) | [375](evidence/part_11/en-375-create.png) |

## Backend boundaries and remaining dependencies

Read-only contract evidence includes current endpoint JSON/Markdown, API configuration/final verification, the Part 01 matrix, relevant Terms/ActivityLogs/Users controllers, validators and handlers, role/action enums, serializer and HTTP/application authorization. The audit DTO's exclusion of raw changes and the absent self-profile PATCH are intentional contract boundaries, not invented frontend features. The password handler explicitly preserves the existing session. No endpoint or schema discrepancy required a change.

No API listener was present at local port 7249. Live API/database/cookie execution and dedicated-account configuration remain the existing [session verification dependency](session-verification.md). Prebuilt test-host authorization evidence does not close that dependency. Browser tests use synthetic responses. Firefox/WebKit, human screen-reader playback and deployment are not claimed. Inherited release currency, media delivery, hosting and capacity dependencies remain documented in prior reports.

Required frontend acceptance has passing evidence with the permitted live-environment dependencies stated. Part 11 is **Approved** by the user on 2026-10-29 with the Part 12 invocation. Subsequent Part 12 work is recorded separately.
