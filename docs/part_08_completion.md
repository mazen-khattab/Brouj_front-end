# Part 08 — Admin catalogue and media

Date: 2026-10-29. Status: **Awaiting approval**. Part 07 was explicitly approved by the user in this conversation: “Ok, Approved. Now, let's navigate to the next part.” with `$implement-brouj-frontend-part part_08`. No Part 09 implementation, backend edit or deployment is included.

## Delivered behavior

Staff catalogue routes now provide paginated city/area/project lists, detail/edit forms and confirmed deletion. Project detail includes paginated units and project-scoped unit creation, with unit detail/update/delete carrying the required `projectId`. Public GET endpoints supply catalogue lists; there is no invented admin listing, deleted-record catalogue or restore action. Parent selection searches and pages actual city/area endpoints rather than accepting free-form IDs. Area options identify their city; a unit's project is fixed by its route.

All four create/update forms select explicit approved fields. PATCH submits the complete input from the loaded detail plus edits, including nullable values. Images, amenities, IDs and server-controlled garage/availability/total/percentage values are excluded. Read-only project/unit facts display returned amounts and attributes with locale formatting. Validation covers names, parent IDs, project type, initiative-only fields, nullable dates/coordinates, decimal precision, integer bounds and unit totals. Large unit total limits use scaled integers before JSON conversion; the existing wire contract continues to use JSON numbers. Server field errors become safe localized field feedback and linked validation summaries.

Area/project/unit amenities have independent Name/Value drafts, a full-replacement explanation, collection/field limits and explicit confirmation, including empty replacement. Project/unit images support one-file multipart uploads, optional AltText editing and confirmed deletion. No ordering controls are exposed. Client checks match storage's 5 MiB JPEG/PNG/WebP policy; the server still checks actual signatures and configuration. Local previews release every object URL on replacement/unmount/success. Upload rejection preserves the file and text. Existing persisted images use the shared resolver/placeholder boundary; storage references never become page content or guessed URLs.

Route-local staff state is keyed by actor, ID, generation, route and create mode. Write locks are synchronous and include authoritative post-write reads. Public/admin lists still mounted after a successful mutation are invalidated. Same-record refreshes retain editors and their independent drafts. 409 refreshes do not replay writes. Interrupted/5xx/malformed-success outcomes block another write until an explicit current-data check succeeds. Delete conflicts refresh the record; an uncertain delete can reconcile a confirmed 404 with the affected list. Creates/uploads require checking the current list before repeating. Image text remains recoverable as a read-only draft if a conflict refresh shows that the image was removed. Navigation confirms draft loss and protects pending writes; unmount aborts requests and late actor-generation results are rejected.

The shared dialog close handler now ignores an old close event when StrictMode has already reopened a newly mounted confirmation. This corrects the disappearing-confirmation bug found by browser testing. Service generation verification now compares parsed TypeScript structure, permitting concurrent formatting while still rejecting changed declarations, imports, variable modes, literals and executable behavior. The actual generated services were not regenerated or overwritten.

## Changed files

| Area | Files |
|---|---|
| Catalogue policy/services adapter | `src/AdminCatalogue/model.ts` |
| Private state/read hook | `src/Context/AdminCatalogueContext.ts`, `AdminCatalogueProvider.tsx`; `src/Hooks/useAdminRecord.ts` |
| Shared admin controls | `src/Components/AdminCatalogue/ParentSelector.tsx`, `Shared.tsx` |
| Screens/forms | `src/Pages/Admin/CataloguePage.tsx`, `CatalogueList.tsx`, `CatalogueForm.tsx`, `CatalogueAmenities.tsx`, `CatalogueImages.tsx` |
| Integration | `src/Router/router.tsx`; `src/Catalogue/invalidation.ts`; public catalogue list/detail providers; `src/Components/Dialog.tsx` |
| Localization | `src/i18n/locales/ar/admin.json`, `en/admin.json`; `src/i18n/resources.ts` |
| Verification | `scripts/generate-services.mjs`, `typescript-structure.mjs`, `typescript-structure.d.mts`, `verify-route-bundles.mjs`; `tests/unit/admin-catalogue.test.tsx`, `generated-structure.test.ts`; `tests/browser/adminCatalogueFixtures.ts`, `adminCatalogue.spec.ts` |
| Documentation | This report; `docs/admin-catalogue.md`, `routing-access.md`, Part 07 approval record, master ledger, README and 16 saved captures |

Existing and concurrent user formatting/edits in transport, account, session, generated project services and other admin files were preserved. No dependency/lockfile, secret, certificate, actual account, live record or backend source was changed by this phase.

## Verification

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 business operations, one CSRF endpoint, 87 public schemas, seven numeric enums, zero discrepancies |
| `npm run services:check` | PASS: 101 typed operations, 83 reachable shapes, seven numeric enums; formatting preserved |
| `npm run typecheck` / `npm run lint` | PASS |
| `npm test -- --maxWorkers=2` | PASS: final run, 23 files, 344 tests |
| `npm test -- tests/unit/admin-catalogue.test.tsx tests/unit/generated-structure.test.ts tests/unit/localization.test.tsx --maxWorkers=2` | PASS: 3 files, 24 tests after final validation and presentation changes |
| `npm run build` | PASS: final build, 236 modules, admin catalogue lazy chunk 27.48 kB, CSS 52.36 kB |
| `npm run routes:check-build` | PASS: admin catalogue remains a lazy chunk outside startup/public/account static imports; development fixtures excluded |
| `npm run test:browser -- tests/browser/adminCatalogue.spec.ts --workers=2` with `NODE_OPTIONS=--use-system-ca` | PASS: 22/22 at desktop/mobile after the initial confirmation fix |
| `npm run test:browser -- --workers=2` with system CA | PASS: uninterrupted 122/122 full regression, 10.0 minutes |
| Final `npm run test:browser -- tests/browser/adminCatalogue.spec.ts --workers=2` with system CA | PASS: 26/26, 1.6 minutes; includes expanded project/unit media and same-editor search/draft coverage |
| Live API/database/filesystem/cookie verification | Not claimed; inherited environment dependency |

Unit tests cover exact PATCH fields and nullable inputs, initiative/decimal/date/parent validation, exact scaled total limits, amenity bounds/empty replacement, all supported file formats and invalid/oversize metadata, duplicate-submit locks through refresh, 409/no replay, 413/415/429, uncertain outcomes and explicit checks, malformed successes, actor-generation rejection, unmount cancellation and retained detail snapshots on read failure. Existing tests include broken approved media fallback and every service's transport mapping. The structural-generation regression accepts formatting while rejecting changed methods/query fields/authentication flags/calls/type-only imports/variable modes and malformed TypeScript.

Browser coverage exercises hierarchy creation → edit → reverse-order deletion; complete PATCH inputs; required unit project queries; initiative-to-regular nulls; selected parent paging/search; client/server field validation; 409 recovery with drafts; full/empty amenity replacement; exact multipart File/optional AltText; metadata edit/delete; rejected uploads and uncertain outcomes; removed-image draft recovery; preview URL revocation; duplicate/pending navigation protection; discard/keep-editing; read outages and logout cleanup. Tests use real frontend services/transport over trusted HTTPS with intercepted synthetic backend fixtures.

The initial exploratory browser run exposed a real shared StrictMode dialog-close bug and an incorrect test label (`Next` instead of the actual `Next page`). Both were corrected; the later 22-case run passed. The uninterrupted full regression then passed 122/122. Final review refined the navigation guard so unit-list query changes retain the project draft and its dirty marker while route/create-mode changes still confirm leaving. The final 26-case catalogue run passed after that refinement, including four newly added desktop/mobile cases for unit media and same-editor search. All 126 distinct browser cases now have passing evidence across these runs; a single uninterrupted 126-case run is not claimed. The final unit run passed 344/344 after adding the native-dialog lifecycle stub that jsdom requires for the new guard test; native dialog behavior remains covered by real browser cases.

No skipped cases, automatic destructive replay, ignored HTTPS errors or weakened assertions were used. Vite's helper and backend Git revision reads required sandbox escalation after EPERM; the approved reruns passed. Service checking initially rejected concurrent formatting, prompting the structure-preserving verification change. Phase-owned tracked files pass `git diff --check`. A whole-working-tree whitespace check also observed trailing whitespace in a concurrent user edit to `sessionCoordinator.ts`; that unrelated edit was left intact.

## Bilingual visual evidence

Sixteen captures cover four views in Arabic/English at 1440px and 375px widths. Synthetic long supplied project names remain as supplied in both languages. Every capture asserts document direction and absence of horizontal page overflow. Manual image inspection sampled English desktop table, Arabic mobile form, Arabic desktop confirmation and English mobile media. Labels, wrapped values, field spacing, pagination, placeholder media and confirmation text are readable. Full-page confirmation captures show the modal/backdrop at its viewport position. No personal inventory or credential values are in these captures.

| View | Arabic / 1440 | English / 1440 | Arabic / 375 | English / 375 |
|---|---|---|---|---|
| Project table | [View](evidence/part_08/ar-1440-table.png) | [View](evidence/part_08/en-1440-table.png) | [View](evidence/part_08/ar-375-table.png) | [View](evidence/part_08/en-375-table.png) |
| Project editor | [View](evidence/part_08/ar-1440-project.png) | [View](evidence/part_08/en-1440-project.png) | [View](evidence/part_08/ar-375-project.png) | [View](evidence/part_08/en-375-project.png) |
| Media / preview | [View](evidence/part_08/ar-1440-media.png) | [View](evidence/part_08/en-1440-media.png) | [View](evidence/part_08/ar-375-media.png) | [View](evidence/part_08/en-375-media.png) |
| Replacement confirmation | [View](evidence/part_08/ar-1440-confirmation.png) | [View](evidence/part_08/en-1440-confirmation.png) | [View](evidence/part_08/ar-375-confirmation.png) | [View](evidence/part_08/en-375-confirmation.png) |

## Acceptance mapping

| Part 08 requirement | Evidence |
|---|---|
| City/area/project/unit list and CRUD hierarchy | Staff screens, synthetic hierarchy journey, relationship-conflict cases and existing service mapping tests |
| Loaded full PATCH, nullable values, required unit projectId | Explicit typed adapters, validation tests and exact browser request assertions |
| Paginated parent selection and relationship fidelity | Bounded parent search/page case, supplied city labels, immutable route project scope and server rejection handling |
| Amenity replacement and recoverable independent drafts | Full/empty replacement confirmations, limits, preserved record edits and feature-specific services |
| Project/unit image lifecycle and approved metadata | Multipart/metadata/delete browser coverage, supported extensions/MIME/size tests and no ordering controls |
| Local preview cleanup, upload failures and delivery boundary | Allocation/revocation browser counters, 413/415/429/503 cases, shared broken-media fallback and identifier leakage assertion |
| Destructive confirmation, 409 and no replay | Delete/replace/image dialogs, explicit cascade copy, one-call assertions and authoritative refresh retaining drafts |
| Private cleanup, cancellation and navigation | Actor-generation/unmount unit cases, synchronous lock tests, pending/unsaved navigation and logout browser cases |
| Bilingual tables/forms/long values/dialogs | Sixteen captures, direction/overflow assertions and manual sample review |

## Backend evidence and remaining dependencies

Read-only evidence: the current Part8.EndpointContracts JSON/Markdown and Part8.ApiConfiguration, Part12.FinalVerification, Part 01 matrix/schema evidence, catalogue controllers/requests, create/update/delete/replace/image handlers and validators, ProjectType serialization, Pricing, FileStorageOptions and FileStorageService. Source confirms that project type cannot change after units exist; city/area relationships and reservations can prevent deletion; project deletion cascades over the allowed project tree; garage fields are server controlled; initiative unit totals and neighbor pricing are enforced by handlers. No backend contract discrepancy was found. Application upload DTO validation permits up to 10 MiB, but the storage adapter's approved 5 MiB maximum is authoritative for this UI; this is layered validation, not a new endpoint contract.

The local API port 7249 had no listener during inspection. Intercepted browser testing does not prove actual SQL mutations, filesystem persistence/cleanup, real staff policy enforcement or cookie lifecycle. A configured backend and dedicated verification accounts/inventory remain required for the existing [live-session/environment verification](session-verification.md). Backend source was not modified or launched with fabricated secrets.

Persisted media display still requires an approved host/identifier mapping or explicit release disposition. Server storage may enforce a more restrictive configured subset/limit; the UI safely reports its rejection. Release currency, provisioning, capacity budgets and hosting remain existing deployment inputs. Firefox/WebKit, human screen-reader playback and production deployment were not performed. Required frontend acceptance checks pass with these permitted dependencies stated. Part 09 remains Not started; its implementation requires explicit Part 08 approval.
