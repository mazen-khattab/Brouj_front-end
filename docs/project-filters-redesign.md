# Initiative project filters

Implemented on 2026-10-30 at the owner's request.

## Layout and behavior

- Desktop uses a gold filter sidebar beside the project cards. Fields appear in order: Search, Project type, City, Area.
- City and area dropdowns load the public lookups on opening, then offer a search field, an All option and the full matching list in a scrollable panel. Selection closes the dropdown; Escape returns focus to its trigger, and outside clicks dismiss it.
- Lookup search uses the existing 300ms debounce and cancellation/latest-response protection. Selected labels hydrate from existing detail reads when entering a deep link. Clear filters discards pending search drafts and resets dropdowns.
- The area lookup is global because its live contract does not support CityId. A city change clears the prior area. Project requests still use the existing city/area/type filters.
- Mobile/tablet keep search visible above the cards, with a collapsible Filters panel for the remaining fields. Arabic mirrors the sidebar and controls. Results use one or two columns as space allows.
- Results-per-page now sits beside pagination after the project cards. Shared public catalogue lists follow the same placement. URL state, custom valid page sizes, back/forward navigation and reset-to-first-page behavior are retained.
- The page heading identifies Initiative projects when the initiative filter is selected.

## Code

`ProjectCatalogue.tsx` composes the sidebar/results layout. `CatalogueFilters.tsx` implements the search and native disclosure dropdowns; `useLocationLookup.ts` owns the reads through the new typed lookup services. `CataloguePageSize.tsx` moves the page-size control into `CatalogueListing.tsx` beside the shared pagination.

No dependencies, backend files or generated service artifacts changed. The [lookup contract addition](contracts/location-lookups.md) records the live endpoint evidence and the separate legacy inventory-check limitation.

## Validation

- Build/typecheck, lint and original generated-service verification pass.
- All 443 unit tests pass, including the two added lookup transport tests; the focused 107-case service suite also passes after the test's internal metadata typing was corrected.
- All 18 catalogue browser regression cases pass on desktop/mobile, including query history, paging, search cancellation, deep links and city/area selection.
- All six new project-filter browser cases pass in Arabic/English. Coverage includes field order, page-size placement, lookup query allowlists, searching, selected names, clearing dependent areas, retry/empty states, late response rejection and keyboard dismissal.
- The final focused run also reviews 768px and 1024px layouts after the mobile pagination adjustment. Screenshots use a valid three-item page for compact visual review; the normal default remains 12.
- `contracts:check` is blocked by the backend inventory BOM and the old 101-operation verifier expectation; lookup sources were checked directly. See the contract note above. Browser responses are synthetic fixtures, not live backend evidence.

## Screenshots

| View | English desktop | Arabic desktop | English mobile | Arabic mobile |
|---|---|---|---|---|
| Project results | [View](evidence/project-filters/projects-en-desktop.png) | [View](evidence/project-filters/projects-ar-desktop.png) | [View](evidence/project-filters/projects-en-mobile.png) | [View](evidence/project-filters/projects-ar-mobile.png) |
| Open city dropdown | [View](evidence/project-filters/city-dropdown-en-desktop.png) | [View](evidence/project-filters/city-dropdown-ar-desktop.png) | [View](evidence/project-filters/city-dropdown-en-mobile.png) | [View](evidence/project-filters/city-dropdown-ar-mobile.png) |

Intermediate widths: [English 768px](evidence/project-filters/projects-en-768-desktop.png), [Arabic 768px](evidence/project-filters/projects-ar-768-desktop.png), [English 1024px](evidence/project-filters/projects-en-1024-desktop.png), [Arabic 1024px](evidence/project-filters/projects-ar-1024-desktop.png).
