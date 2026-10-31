# Project details redesign — completion

Implemented on 2026-10-30 from [the approved plan](project-details-redesign-plan.md), preserving the existing navy/gold/white palette, bundled fonts, typography and radius. Existing uncommitted homepage/authentication work and backend changes were preserved. One unused `LuxuryBackdrop` import in the existing auth edits was removed because it blocked typecheck/lint. No deployment, migration or image-delivery endpoint was added.

## Delivered behavior

- Project gallery, description and all existing facts remain together. Amenities use name/value cards only on project details; area/unit amenities keep their existing presentation.
- Units use a carousel: three cards at widths of 1280px and above, two from 768px, one below 768px. Previous/next controls, direction-aware arrow keys, Home/End and horizontal touch gestures navigate the loaded units. No automatic motion is introduced.
- Units load in batches of 12, without search, as the user approaches the loaded end. Earlier batches remain available. Failed later batches can be retried while keeping loaded cards. Project identity resets the carousel and aborts obsolete requests; project-list query parameters have no effect on this state.
- Carousel clicks show a localized coming-soon toast. Direct unit URLs and customer reservation flows continue to work.
- The public time plan appears beneath the units, independently of unit reads. Its name and delivery date, stage delivery dates and item status/due/confirmation information remain visible. The first stage starts open; stages expand independently. Server stage/item/image order is retained. Unknown statuses use the localized fallback.
- Item text occupies the physical left half and photos the right half from 768px, including in Arabic. Smaller screens stack text above photos. Each item shows up to three thumbnails and the remaining count (`+1` for four images, `+3` for six).
- One shared native dialog switches between the all-photo grid and enlarged viewer. Returning to the grid restores the selected thumbnail focus. Escape, focus containment, trigger focus restoration and background scroll locking use the existing dialog infrastructure.
- Missing, failed and empty time plans and unit lists have independent localized feedback/retry states. Existing reduced-motion and sticky-header offsets are respected.

## Backend and contract reconciliation

The controller already had `AllowAnonymous` in the initial working tree. Removed the independent `IRequireAccess(Member)` boundary from `GetProjectTimePlanQuery`, following the existing public-query pattern. All edit operations retain their existing staff authorization and rate limits. Read ordering, not-found behavior and the PublicReads rate limit are unchanged. Updated authorization expectations and endpoint documentation/inventory. Both embedded and standalone `/projects/:projectId/time-plan` reads now use public client metadata; unrelated private guards remain intact.

The verifier now accepts a UTF-8 BOM, verifies all **104 operations**, and flattens inherited HTTP pagination/search fields. The generator supports `IEnumerable<LookupDto>` and regenerated all clients from that verified source. City/area lookup adapters delegate to the generated clients. Checks report **zero discrepancies**. The backend commit plus normalized working-tree source fingerprints are recorded in the generated contract artifacts.

Release source coverage records 103 implemented consumers and one explicit UI exclusion for `GetProjectsLookup`. That operation is generated and covered by the service contract tests; the approved plan explicitly excludes a new project-lookup UI.

## Follow-up visual updates

Updated the design from the owner's stage-row reference on 2026-10-30:

- Amenities now use smaller content-sized cards with the original header's `surface` color across the entire card, without a contrasting lower panel or divider.
- The time-plan title, plan name and delivery information sit inside one outer container, with all collapsible stages grouped in an inner container.
- Stage items use compact white rows: name and a colored status badge in the physical left half, a vertical divider, and small image thumbnails aligned to the physical right. Due/confirmation dates remain as secondary text. Mobile layouts stack the two halves.
- Completed statuses use green badges, processing statuses use amber badges, and pending/unknown statuses use neutral badges. Compact unavailable-image tiles use a labeled image icon; the modal retains its existing placeholder and viewer behavior. The extra-image count sits beside the first three thumbnails.

Follow-up checks: build/typecheck and lint passed; 30 relevant unit tests and 10 browser cases passed (two duplicate screenshot entries skipped). English/Arabic desktop, tablet and mobile captures below were refreshed.

## Verification

| Check | Result |
|---|---|
| `npm test` | 456 tests passed across 28 files |
| `npm run lint`, `npm run build` | Passed, including typecheck |
| `contracts:check`, `services:check` | 104 operations verified; zero discrepancies |
| `release:coverage` | Passed with the explicit project-lookup UI exclusion |
| `release:test` | 6 tests passed |
| `routes:check-build` | Passed; admin pages/layout remain isolated lazy chunks |
| Catalogue, filters, account and redesign browser regression | 54 distinct cases passed across the regression run and targeted reruns; two duplicate screenshot entries skipped |
| Backend solution | 1,370 passed; 52 environment-dependent infrastructure cases skipped |

Backend command: `dotnet test Brouj.slnx --artifacts-path artifacts/project-details-redesign --verbosity quiet`, run from `F:/Mazen/Projects/Brouj`. Separate output avoids locked Debug assemblies belonging to the already-running API. Results: Domain 24, Application 538, Infrastructure 396 passed/52 skipped, API 412. The new HTTP tests exercise the real ASP.NET/MediatR pipeline with database/query/transaction doubles, checking anonymous/customer/staff reads, nested ordering and 404 behavior. Existing endpoint tests deny anonymous access to every protected edit; application authorization tests cover protected requests before writes.

New frontend tests cover three batches, failed-batch retry, stale-response rejection/abort, responsive card counts, keyboard/touch navigation, coming-soon behavior, public inline/standalone plans, independent failures, empty content, unknown statuses, image counts of 0/1/3/4/6, grid/viewer transitions, Escape, focus return/containment, scroll locking and approved-image failure. Existing direct-unit/customer reservation tests were retained and passed. Browser expectations use the browser's Intl formatting because Arabic numeral defaults can differ across runtimes.

An early overlapping browser invocation interfered with Playwright's shared trace directory; the affected cases passed when rerun without overlapping invocations. The obsolete time-plan-link expectation was updated. A screenshot capture timed out once under load; both screenshot cases subsequently passed serially with a scoped 60-second budget and reduced motion. No product failure remains from those runs.

## Visual evidence

Reviewed the six fixture-backed captures for card counts, text/media placement, typography, RTL/LTR and horizontal overflow:

| Language | Desktop (1440px) | Tablet (900px) | Mobile (375px) |
|---|---|---|---|
| English | [Screenshot](evidence/project-details/en-desktop.png) | [Screenshot](evidence/project-details/en-tablet.png) | [Screenshot](evidence/project-details/en-mobile.png) |
| Arabic | [Screenshot](evidence/project-details/ar-desktop.png) | [Screenshot](evidence/project-details/ar-tablet.png) | [Screenshot](evidence/project-details/ar-mobile.png) |

## Live evidence and remaining environment limits

Browser tests and screenshots intercept API responses while using the real frontend services/transport. They demonstrate frontend behavior with controlled data, not live inventory or image delivery. Backend HTTP tests use the application pipeline with test database doubles, not a production database.

A separate read-only probe of the existing HTTPS API returned **200** for `/api/v1/projects?pageSize=1`, but **401** for an existing project's anonymous time-plan read. That API process predates the updated application assembly and must be restarted/rebuilt to serve public time plans. It was left running. Anonymous/customer/staff access to the changed source is verified by the backend tests; the existing running process is not claimed as live verification of the new policy.

There is still no approved identifier-to-browser-URL media mapping. Thumbnails, grid and viewer therefore show labeled safe placeholders. Raw stored paths never become image URLs or appear in rendered markup. The approved-mapping and failed-image branches are tested with synthetic approved HTTPS URLs. Enabling real media delivery remains a separate owner-approved integration.
