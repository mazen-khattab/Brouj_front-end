# Part 10 — Admin time plans and templates

Date: 2026-10-29. Status: **Awaiting approval**. Part 09 was approved by the user in this conversation with `$implement-brouj-frontend-part part_10`: “Ok, Approved. Now, let's navigate to the next part.” This report covers Part 10 only. Part 10 approval has not yet been received.

## Delivered behavior

The established project planning and template routes now implement project plan read/create/edit/delete; manual and server-template stage creation, edit/delete/order; item create/edit/delete/status/order; image upload/description/delete/order; stage/item template paging, search, active filtering, CRUD/activation; and confirmed ordered stage-template assignments. See the [workflow and contract guide](admin-planning.md).

Required delivery/due dates use explicit offset timestamps, with strict real-date validation and Gregorian locale displays. Completed requires an explicit confirmation date. All defined item transitions are available through the specific status POST; no parent statuses or completion rules are invented. Every mutation constructs only approved request fields and binds child IDs to the current loaded hierarchy.

Ordering sends complete one-based sibling sets, has native keyboard controls and bilingual live announcements, and reloads after every success/failure. Unknown outcomes block new writes until an explicit read check succeeds, without replay. Separate in-memory drafts survive other edits, reloads, conflicts and failed uploads. A concurrent plan creation retains the attempted create values for review against the existing plan. An externally removed image retains its description draft in a disabled editor; current-user confirmed deletion removes it. Navigation/source changes and unload protect drafts; pending writes have a synchronous gate. Route/actor/generation changes discard private state. Source-template membership changes retain dates by source ID until an explicit reset.

## Changed files

- `src/Planning/`: approved command adapters, validation/ordering/source policies, draft hooks and navigation guard.
- `src/Context/TimePlanContext.ts`, `TimePlanProvider.tsx`, `TemplatesContext.ts`, `TemplatesProvider.tsx`: focused scoped reads and mutation/reload actions.
- `src/Components/Planning/`: shared forms/feedback/confirmations/order controls, bounded source picker, stage composer, item images and template assignments.
- `src/Pages/Admin/PlanningPage.tsx`, `TimePlanWorkspace.tsx`, `TemplatesWorkspace.tsx`: lazy route entry and planning/template editors.
- `src/Hooks/useStaffOperation.ts`: opt-in reconciliation after every ordering failure.
- `src/Router/router.tsx`, `scripts/verify-route-bundles.mjs`: Phase 10 lazy route integration and bundle isolation check.
- `src/i18n/resources.ts`, both `timePlans.json` locales: complete Arabic/English UI and accessible labels.
- `tests/unit/planning.test.tsx`, `tests/browser/planningFixtures.ts`, `tests/browser/planning.spec.ts`: validation, binding, source, lifecycle, complete workflows, failures and bilingual capture coverage. `tests/browser/routing.spec.ts` adds the approved staff template endpoints to its route audit allow-list.
- This report, `docs/admin-planning.md`, Part 09 approval evidence and the master ledger. Concurrent user edits to `docs/useCatalogueRead-explained.md` and whitespace in `useCatalogueRead.ts` are preserved and are outside the Part 10 implementation.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Pass: TypeScript and Vite production build, 275 transformed modules |
| `npm run lint` | Pass: zero warnings |
| `npm run contracts:check` | Pass: 101 business operations, 1 CSRF endpoint, 87 public schemas, 7 numeric enums; zero documented discrepancies |
| `npm run services:check` | Pass: 101 typed operations, 83 wire shapes, 7 numeric enums |
| `npm run routes:check-build` | Pass: planning and other admin pages remain lazy, outside startup/public/account static imports; development fixtures excluded |
| `npm test -- --maxWorkers=2` | Pass: **402 tests in 25 files** on the final implementation |
| Trusted-HTTPS Chromium desktop/mobile integration run | **195/202 passed** in 13.5 minutes; seven failures investigated and corrected |
| Affected planning and Admin/SuperAdmin route rerun | **48/48 passed** in 4.3 minutes; covers all seven integration-run failures |
| Expanded final planning run, `tests/browser/planning.spec.ts --workers=2` | **48/48 passed** in 2.5 minutes, including the added concurrent-create/image-removal races and all six status transitions |

The integration run found a real initial-debounce race: quickly moving to template page 2 could be reset to page 1 by an unnecessary empty-search timer. Both template lists and source pickers now skip a timer for an already-applied query; two unit regressions reproduce the timing and verify that a real new search still resets paging. Other integration failures were harness expectations: logout now waits for confirmed sign-out and the actual `/admin/login` route, and route audits recognize the new approved staff template reads. The affected rerun passed every failed case. Earlier implementation checks also corrected template-creation navigation timing, a status POST fixture dispatch error and waiting for the new editor after navigation. Low-contrast introduction text was corrected during visual review.

The final implementation has **206 distinct current browser cases with passing evidence across the integration and targeted runs**. This is not a claim that one uninterrupted final 206-case run was executed. Final source changes affect only planning editors; their complete expanded desktop/mobile suite passed after those changes. No mutation is retried automatically to make a test pass.

### Acceptance evidence

| Requirement | Evidence |
|---|---|
| Project read/create/update/delete without invented plan listing | Complete empty-plan hierarchy workflow; project 403/404 and picker/no-preload tests; verified parent read and approved input adapter |
| Stage manual/template create, update/delete/order | Complete workflow, mapped/empty/inactive template tests, current-source conflict refresh and source-ID membership checks |
| Item inputs, dedicated status, delete/order | Exact PATCH/POST body assertions, explicit Completed date rejection and all six distinct-status transitions; sibling status remains unchanged |
| Image upload/description/delete/order | Exact File/Description multipart assertions, 5 MiB/type failures, failed-upload retention, persisted-media placeholders and removed-image draft retention |
| Template pagination/CRUD/activation/assignments | Both template kinds, bounded paging/search/active filters, duplicate/inactive/empty assignment replacement, keyboard order and snapshot independence |
| Complete ordering and stale/foreign membership | Adapter unit tests for duplicate, incomplete, foreign and non-contiguous sets; server-fixture membership checks; new-sibling reload/retry; first/last boundaries |
| Uncertain results and reload after failure | 400/429/500 ordering reconciliation unit cases; committed 500 ordering, malformed success and failed follow-up reads; explicit check without replay |
| Selection, dates, draft protection and lifecycle | Selection survives reorder; children disappear after parent deletion; pending duplicate/navigation, stage/item/project/template guard, concurrent-create reset and logout/generation tests |
| Arabic/English, RTL/LTR and long names | 24 synthetic captures, translated labels/statuses/dates, keyboard moves and no page-level horizontal overflow at 375/1440 px |

### Bilingual visual review

Each view was captured in Arabic/RTL and English/LTR at 375 and 1440 px. Representative current captures were visually inspected for legibility, wrapping, hierarchy, date isolation and dialogs. Wide tables stay in labeled keyboard-focusable scroll regions on mobile. Native focus/cancel/pending behavior uses the shared dialog; controls and live announcements are translated. Backend names remain supplied text, not fabricated translations.

| View | Arabic desktop | Arabic mobile | English desktop | English mobile |
|---|---|---|---|---|
| Hierarchy and date fields | [1440](evidence/part_10/ar-1440-hierarchy.png) | [375](evidence/part_10/ar-375-hierarchy.png) | [1440](evidence/part_10/en-1440-hierarchy.png) | [375](evidence/part_10/en-375-hierarchy.png) |
| Reordered hierarchy | [1440](evidence/part_10/ar-1440-ordered.png) | [375](evidence/part_10/ar-375-ordered.png) | [1440](evidence/part_10/en-1440-ordered.png) | [375](evidence/part_10/en-375-ordered.png) |
| Item deletion dialog | [1440](evidence/part_10/ar-1440-delete-item.png) | [375](evidence/part_10/ar-375-delete-item.png) | [1440](evidence/part_10/en-1440-delete-item.png) | [375](evidence/part_10/en-375-delete-item.png) |
| Stage template | [1440](evidence/part_10/ar-1440-stage-template.png) | [375](evidence/part_10/ar-375-stage-template.png) | [1440](evidence/part_10/en-1440-stage-template.png) | [375](evidence/part_10/en-375-stage-template.png) |
| Assignment confirmation | [1440](evidence/part_10/ar-1440-assignments.png) | [375](evidence/part_10/ar-375-assignments.png) | [1440](evidence/part_10/en-1440-assignments.png) | [375](evidence/part_10/en-375-assignments.png) |
| Item template | [1440](evidence/part_10/ar-1440-item-template.png) | [375](evidence/part_10/ar-375-item-template.png) | [1440](evidence/part_10/en-1440-item-template.png) | [375](evidence/part_10/en-375-item-template.png) |

## Backend evidence and dependencies

Read-only evidence includes the current endpoint JSON/Markdown, API configuration/final verification documents, Part 01 matrix/schemas, time-plan/stage/item/image and stage/item-template controllers, approved DTOs, validators, command handlers, `TimePlanDraftBuilder`, `TimePlanOrdering`, status enum and serialization/authorization settings. The contract checker verifies 101 business operations, 1 CSRF endpoint, 87 public schemas and 7 numeric enums, with no documented discrepancies. Source confirms the required dates, all defined item transitions, detached source snapshots, exact mapped-source membership and complete contiguous ordering rules.

No local API listener was present on port 7249. Live SQL mutations/cascades/order transactions, real account authorization/cookies and storage validation remain an environment dependency, not a claimed live success. The existing [session verification dependency](session-verification.md) remains open. Persisted images use the permitted resolver placeholders pending an approved media delivery mapping. Upload/metadata frontend workflows do not claim real delivery. No backend edits, new endpoint, ETag/version field, dependency installation or deployment was performed.

Required frontend acceptance has passing evidence with the permitted live-environment dependencies stated. Firefox/WebKit, human screen-reader playback, real SQL/storage execution and deployment are not claimed. Existing release currency/hosting/performance inputs remain inherited dependencies. Part 10 is **Awaiting approval**; Part 11 remains Not started. The skill/master require explicit approval before advancing.
