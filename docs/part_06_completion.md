# Part 06 completion report

Date: 2026-10-29. Status: **Approved** by the user on 2026-10-29 with the Part 07 invocation: "Ok, Approved. Now, let's navigate to the next part.". Part 05 was explicitly approved by the user in this conversation: "Ok, Approved. Now, let's navigate to the next part." with the Part 06 invocation. Its report and master ledger record that approval. This report describes the Part 06 handoff; subsequent work is recorded in Part 07.

## Delivered

- Responsive landing discovery/account entry links, city search, city-area browsing, area details/projects, project search/details/units, unit details and current terms. All business content is read through existing typed Cities/Areas/Projects/Units/Terms services inside focused catalogue providers, loaded only with the public catalogue page module.
- Supported search/location/numeric project-type/page/page-size fields round-trip through the URL. Search debounces for 300 ms; other filters reset page 1, city changes clear area, invalid/unsupported URL fields normalize safely, and past-last-page URLs recover using server totals. Location pickers fetch bounded 10-item pages instead of loading all locations. There is no invented sorting or availability filter.
- Cancellation and active-request checks prevent obsolete reads from replacing current data, including when a loader ignores cancellation. Changed IDs/queries immediately hide prior data; retry clears old results and refetches. Page/card data and totals are server-owned. Unit detail always sends the nested projectId query. Root path navigation still moves heading focus; query-only updates preserve filter focus and scroll.
- Accurate project/size/type/floor/planned-unit/neighbour/draw-date/coordinate/garage fields, unit price/size/floor/availability/percentage and amenities. Unit totalPrice is displayed without frontend recalculation. Currency/size retain four decimal places, percentage six; actual configured currency is used without language inference. Unit numbers are isolated LTR.
- Escaped descriptions/terms with preserved paragraphs, supplied names/content unchanged across language switches, Gregorian dates, actual terms version/effective date and safe retry states. No raw HTML, machine-translated legal text or simulated successful data appears.
- Media resolver and previous/next galleries. Production uses localized placeholders because no approved image delivery mapping exists; imagePath never becomes visible content or src. Invalid mapped URLs are refused and failed approved images fall back locally. Lists have no image metadata and make no per-card detail requests to obtain it.
- Available-unit anonymous reservation entry uses customer login and a safe return to that unit's `#reservation`. Customer/staff/unavailable states are explicit. Actual confirmation, mutation and member time-plan data remain Part 07; project schedule links use the existing Member guard. No reservation request, success/availability update or admin feature was added.

The [catalogue guide](catalogue.md) records each service/input, state ownership, content rules, draft copy and media disposition. The [route matrix](routing-access.md) now distinguishes implemented public screens from the remaining customer/admin placeholders. The approved fonts, Tailwind-only source styling, navy/gold/ivory hierarchy, 16px corners, artwork and reduced-motion behavior remain intact.

## Changed files

| Area | Files |
|---|---|
| State and URL policy | `src/Catalogue/query.ts`; `src/Context/CatalogueListContext.ts`, `CatalogueListProvider.tsx`, `CatalogueDetailContext.ts`, `CatalogueDetailProvider.tsx`; `src/Hooks/useCatalogue.ts`, `useCatalogueRead.ts` |
| Media and view components | `src/Catalogue/media.ts`; `src/Components/Catalogue/MediaGallery.tsx`, `CatalogueFeedback.tsx`, `PropertyFacts.tsx`, `CatalogueFilters.tsx`, `CatalogueListing.tsx`, `ReservationEntry.tsx` |
| Pages/routing | `src/Pages/Catalogue/CataloguePage.tsx`, `src/Pages/WelcomePage.tsx`, `src/Router/router.tsx`, `RootLayout.tsx` |
| Localization/formatting | `src/i18n/resources.ts`, `src/i18n/locales/ar/catalogue.json`, `en/catalogue.json`, `src/i18n/format.ts` |
| Verification | `tests/unit/catalogue.test.tsx`, `format.test.ts`, `app.test.tsx`; `tests/browser/catalogue.spec.ts`, `catalogueFixtures.ts`, `routing.spec.ts`; `scripts/verify-route-bundles.mjs`; `.prettierignore` protects generated route paths |
| Preserved formatting | Concurrent formatting of existing files, including `BrandWordmark.tsx`, `LuxuryBackdrop.tsx`, `AuthProvider.tsx`, `PublicLayout.tsx`, `AccessGuard.tsx`, `RouteFeedback.tsx`, `browserPaths.ts`, `routeDefinitions.ts` and `Security/sessionBoundary.ts`, was retained alongside the phase changes. |
| Documentation | This report, `docs/catalogue.md`, `docs/routing-access.md`, `README.md`, Part 05 approval record, master ledger and Part 06 screenshots |

No dependencies, lockfile, backend source, credentials, accounts, certificates, API records or deployment were changed. The existing Part 05 route smoke tests now allow approved public reads and intercept the actual catalogue lazy module. The unit App smoke check uses a bounded five-second wait for the real lazy render under parallel verification load. A final formatting sweep also touched the generated routePaths.ts; it was regenerated from the verified source and excluded from Prettier because generation checks are byte-for-byte. Other concurrent handwritten formatting was preserved. Service generation/type/lint checks pass after that repair.

## Checks

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 business operations, one CSRF endpoint, 87 schemas, seven numeric enums; zero documented discrepancies against the live backend. |
| `npm run services:check` | PASS: 101 typed operations, 83 reachable shapes and seven numeric enums. |
| `npm run typecheck` / `npm run lint` | PASS: no type errors, lint errors or warnings. |
| `npm test -- --maxWorkers=2` | PASS: **20 files, 300 tests**, including the final repeat after a bounded cold-lazy smoke-test wait adjustment. |
| `npm run build` | PASS: 203 modules; final separate CataloguePage chunk is 25.99 kB (7.25 kB gzip); production CSS is 51.41 kB. |
| `npm run routes:check-build` | PASS: public catalogue dependencies included in inspection; admin layout/pages remain separate lazy chunks outside startup/public/account imports. Development fixtures remain absent from production JS. |
| `npm run test:browser -- tests/browser/catalogue.spec.ts --workers=2` with system CA | PASS: 18 trusted-HTTPS Chromium cases, desktop/mobile, including the final pending-search clear fix and expanded city/area captures; no TLS bypass or skipped cases. |
| `npm run test:browser -- --workers=3` with `NODE_OPTIONS=--use-system-ca` | PASS: **80 tests**, zero failed/skipped, including all 62 prior cases and 18 catalogue cases. HTTPS certificate verification stays enabled. |
| `npm run test:browser -- tests/browser/catalogue.spec.ts --grep 'cards, detail, gallery' --workers=2` | PASS: all four expanded language/viewport reviews after the reading-direction adjustment, covering every catalogue screen. Captures use CSS resolution; zero failures/skips. |
| Actual API/inventory/cookie/media integration | Not claimed. API port 7249 has no listener; see dependencies below. |

Unit tests cover URL whitelist/round-trip/invalid inputs, numeric zero enum, encoded input limits, approved media mapping/rejection, broken-image fallback, identifier privacy, late results despite ignored abort, immediate detail cleanup, unmount abort, disabled reads and retry. Existing service/transport/auth/architecture/localization checks remain included. Gallery broken-image handling is tested with an explicitly supplied test-only approved resolver; production does not enable unapproved delivery to manufacture that evidence.

The complete 80-case regression passed. The subsequent pending-draft clear refinement passed all 18 affected catalogue cases again; the final supplied-content direction refinement passed all four expanded bilingual reviews. A high-DPI mobile screenshot timeout during an intermediate capture-only run was resolved by saving catalogue captures at CSS resolution; final runs pass. These follow-up checks are recorded separately rather than claiming that every source revision used one identical 80-case run.

Browser tests exercise city → areas → area → projects → units → terms, actual projectId query dispatch, authoritative total display, escaped markup, project filters/reload/history/paging/reset, bounded location reads, city/area dependency, rapid/obsolete search, preserved input focus, empty/error/retry/out-of-range cases, missing/malformed project/unit, unavailable terms/retry, anonymous login return without a mutation and member schedule navigation. Intercepted responses exercise real services/transport but do not establish actual server state.

## Acceptance checklist

| Requirement | Evidence/disposition |
|---|---|
| Landing discovery/account entry and honest content | Existing welcome design plus functional cities/projects/account links; neutral new microcopy identified for owner review in catalogue.md. No fabricated inventory counts/testimonials/contact details/guarantees. |
| Complete prescribed browsing screens | All eight public routes connect to their real public contracts; project detail includes paginated units and unit links. Later member/account/admin work remains deferred. |
| URL-supported filters, debounce, cancellation and pagination | Project history/round-trip/filter/reset/empty/last-page browser cases; provider/hook race tests; search focus and scroll preserved. Only backend-supported fields are sent. |
| DTO fidelity and unit projectId | Service contract checks, browser request assertion, display of the deliberately non-recomputed fixture total, percentage/size/currency formatting review. |
| Gallery/media safe boundary | No storage identifier in DOM or image requests; placeholder galleries at both widths/languages; unit rejection/failure tests. Actual delivery remains the explicitly permitted limitation below. |
| Descriptions/amenities/current terms | Plain text/whitespace preservation, current published version/date, failure/retry and no injected `<b>` elements in browser tests. |
| Anonymous reservation/member entry | Login return to exact selected unit/hash; no reservation POST; member schedule link navigates through existing guard. Actual confirmation/mutation belongs to Part 07. |
| Bilingual/mobile/desktop review | All 32 captures below, complete translation parity, no-overflow/gallery checks and sampled human visual inspection. Descriptions/legal text select their own reading direction without translation. |

## Bilingual visual evidence

Saved 32 captures: all eight public routes in Arabic/English at 1440px/375px CSS widths. Human visual inspection included English desktop project cards/city/terms, Arabic desktop project detail, Arabic mobile area/unit and English mobile project cards. Reviewed spacing, card wrapping, mirrored layout, gallery states, readable values, legal paragraphs and supplied-content direction. Automated checks cover every captured view, direction and no horizontal page overflow. Home captures come from the trusted-HTTPS foundation cases; catalogue captures use CSS resolution after gallery interaction/scroll reset.

Test inventory/names/prices/counts are fixtures, not production property claims. Existing architectural artwork is decorative and does not stand in for a property photo. English fixture names/amenities/legal text inside Arabic UI are intentionally unchanged backend values. Broken media is covered by the unit gallery test; actual delivered property photography is not claimed.

| Screen | Arabic / 1440 | English / 1440 | Arabic / 375 | English / 375 |
|---|---|---|---|---|
| Landing | [View](evidence/part_06/ar-1440-home.png) | [View](evidence/part_06/en-1440-home.png) | [View](evidence/part_06/ar-375-home.png) | [View](evidence/part_06/en-375-home.png) |
| Cities | [View](evidence/part_06/ar-1440-cities.png) | [View](evidence/part_06/en-1440-cities.png) | [View](evidence/part_06/ar-375-cities.png) | [View](evidence/part_06/en-375-cities.png) |
| City / areas | [View](evidence/part_06/ar-1440-city.png) | [View](evidence/part_06/en-1440-city.png) | [View](evidence/part_06/ar-375-city.png) | [View](evidence/part_06/en-375-city.png) |
| Area / projects | [View](evidence/part_06/ar-1440-area.png) | [View](evidence/part_06/en-1440-area.png) | [View](evidence/part_06/ar-375-area.png) | [View](evidence/part_06/en-375-area.png) |
| Projects | [View](evidence/part_06/ar-1440-projects.png) | [View](evidence/part_06/en-1440-projects.png) | [View](evidence/part_06/ar-375-projects.png) | [View](evidence/part_06/en-375-projects.png) |
| Project / units | [View](evidence/part_06/ar-1440-project.png) | [View](evidence/part_06/en-1440-project.png) | [View](evidence/part_06/ar-375-project.png) | [View](evidence/part_06/en-375-project.png) |
| Unit | [View](evidence/part_06/ar-1440-unit.png) | [View](evidence/part_06/en-1440-unit.png) | [View](evidence/part_06/ar-375-unit.png) | [View](evidence/part_06/en-375-unit.png) |
| Current terms | [View](evidence/part_06/ar-1440-terms.png) | [View](evidence/part_06/en-1440-terms.png) | [View](evidence/part_06/ar-375-terms.png) | [View](evidence/part_06/en-375-terms.png) |

## Backend and remaining dependencies

Live read-only evidence: Cities/Areas/Projects/Units/Terms controllers and request DTOs, relevant query validators/handlers, Terms.GetActive's active/effective filtering, numeric ProjectType encoding, Pricing.Total/Percentage and the Part 01 matrix. Source matches the documented contracts. The backend currently returns default garage false/zero through these handlers; those values are rendered without invented garage logic. Existing cache/heavy-query/capacity limits are retained, not fixed by frontend pagination/debouncing.

The local configured API has no listener on port 7249 during inspection. Real inventory, API/cookie behavior and the prior [session verification dependency](session-verification.md) remain environment work. No account or successful backend interaction was invented. Chromium desktop/mobile is covered; Firefox/WebKit, human screen-reader playback and production-host rewrite/deployment checks are not claimed.

**Media disposition:** localized placeholders are acceptable for this phase under its plan. Real image display cannot pass release verification until an approved delivery host/mapping exists, or the owner explicitly approves the remaining image-display limitation at release. Merely setting VITE_MEDIA_ORIGIN is insufficient. No URL mapping or release approval is inferred from Part 06 approval.

Release currency, staff provisioning, API budgets and production hosting remain existing owner/deployment inputs. Reservation confirmation/submission, customer self-service and time-plan data are reserved for Part 07; admin operations, SignalR and release remain later phases. All required Part 06 frontend checks pass, and permitted dependencies are recorded. Part 06 was explicitly **Approved** by the user with the Part 07 invocation, quoted above. No release approval is inferred.
