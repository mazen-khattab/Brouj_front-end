# Public catalogue and media boundary

Part 06 implements public cities, city/areas, area/projects, project list, project/units, unit detail and current terms. Subsequent owner-requested designs add the initiative homepage and a project-filter sidebar. Catalogue content comes from typed services. See [the project filter redesign](project-filters-redesign.md) for the current layout and lookup contracts.

## Reads and state ownership

| Screen | Services / approved inputs |
|---|---|
| Cities | `Cities.getCities`: pageNumber, pageSize, search |
| City and areas | `Cities.getCityById`; `Areas.getAreasByCity`: route cityId plus pageNumber, pageSize, search |
| Area and projects | `Areas.getAreaById`; `Projects.getProjects`: fixed route areaId, pageNumber, pageSize, search, optional projectType |
| Projects | `Projects.getProjects`: pageNumber, pageSize, search, cityId, areaId, numeric projectType |
| Project and units | `Projects.getProjectById`; `Units.getUnitsByProject`: route projectId plus pageNumber, pageSize, search (unit number) |
| Unit | `Units.getUnitById`: unit id **and query projectId** from the nested browser URL |
| Current terms | `Terms.getActiveTermsAndConditions` |

The lazy CataloguePage module mounts focused list/detail providers only on the matching browsing route. They own params, loading/error/data and reload. Components receive typed domain data, not Axios responses. Admin providers stay outside this branch; API.tsx remains the sole transport boundary. The homepage independently reads initiative projects and current terms. `useCatalogueRead` aborts old reads on unmount/parameter changes; an active-request check also rejects late results when cancellation is ignored. Changed keys hide previous detail/list data immediately. No all-page cache, persistent DTO storage, dependency or automatic mutation was added.

## URL and pagination

URL names mirror supported API fields. Default page size is 12; request sizes remain within 1–100. Page numbers are positive 32-bit integers. Search trims whitespace and is capped at the live validator's 100-character limit. Optional location filters accept nonempty GUIDs; projectType accepts numeric 0 (Regular) or 1 (Initiative). Unsupported/invalid fields are removed from the canonical URL and never sent as arbitrary query fields.

Text edits commit after 300 ms and replace the history entry. Clear filters also discards uncommitted text and cancels its timer, even if the URL search is already empty. Other filters, page-size choices and pagination use normal history. Filter/page-size changes reset pageNumber to 1; a changed city clears the old area. Reload/back/forward restores controls from the URL. Query-only navigation preserves field focus/scroll; actual path navigation still focuses the page heading and uses Router scroll restoration.

Results/pages use backend totalCount/totalPages/pageNumber. Past-last-page requests replace the URL with the server's last valid page and fetch it; empty results return to page 1. No unsupported sorting, availability filter, local property search or manufactured totals are offered.

Location choices now use the owner-requested `/api/v1/cities/lookup` and `/api/v1/areas/lookup` endpoints when their dropdown opens. Each returns a complete ID/name array, with optional debounced Search and a scrollable option list; no lookup pagination is sent. Selected names are retrieved separately for deep links. The area lookup accepts no CityId, so it remains global even when a city is selected. Changing city still clears the old area. See [the lookup contract addition](contracts/location-lookups.md).

The project list uses a leading sidebar on desktop, with Search, Project type, City and Area in that order. On mobile/tablet, search stays visible and the remaining fields expand from a Filters button. Results-per-page sits with pagination after the cards, consistently across public catalogue lists.

## Content and entry points

Project prices/sizes/type, description, floor/planned-unit counts, optional neighbour price/draw date/coordinates, amenities, unit floor/availability/garage fields and percentages come from DTOs. Unit totalPrice is authoritative; the UI does not multiply size by meterPrice or infer availability. Price/size displays preserve up to four decimals; supplied percentage points preserve up to six, following backend Pricing.Percentage. Explicit currency configuration controls labels; no currency is inferred from language. Release currency approval remains a deployment input.

Live project/unit handlers currently leave garage fields at DTO defaults (false/zero). The UI displays returned fields and adds no garage selection/pricing logic. Unit codes are isolated LTR. Dates remain Gregorian with offset-aware formatting. Supplied names/descriptions/amenities/legal content are shown unchanged without translation or HTML interpretation. Descriptions and legal content use automatic reading direction, so an English value remains readable inside Arabic chrome and vice versa. Preserved whitespace keeps paragraphs readable. Current terms show their actual version/effective date and have error/retry handling.

An available unit sends anonymous visitors through customer login with a safe return to the unit's `#reservation` section. Hydrated-actor return policy remains authoritative. Part 07 adds lazy customer confirmation and POST /reservations, followed by authoritative detail navigation. Staff see that reservations use customer accounts. Unavailable units disable confirmation; no client availability update is invented. Time plans now read actual member data through the existing Member guard. See the [customer account guide](customer-account.md).

New landing/browsing microcopy in `catalogue.json` is neutral draft copy for owner review, especially `citiesIntro`, `projectsIntro`, `intro`, `reservationIntro` and `reservationSoon`. Existing approved welcome/design copy is retained. Names/prices/counts in test screenshots are fixtures, not actual inventory claims.

## Media disposition

**Phase 06 uses localized placeholders.** imagePath is a storage identifier, never a src, visible path, alt fallback or guessed endpoint. List DTOs contain no image metadata; cards intentionally use placeholders without per-card detail requests. Detail galleries preserve actual image count/order, have labelled previous/next buttons and supplied alt text when delivery is available, and replace a failed image locally.

`createMediaResolver` accepts an optional **explicitly approved** delivery object: an exact HTTPS origin and mapping callback from storage identifier to approved absolute browser URL. It checks protocol, origin equality, absence of credentials/backslashes/fragments and a non-root asset path. Invalid/throwing mappings return no URL. Production has no delivery object because no mapping is approved. `VITE_MEDIA_ORIGIN` alone remains insufficient; storage paths are never concatenated into URLs. Approved images use lazy loading/decoding and no referrer.

Release must either supply/verify an approved mapping/host or explicitly record and approve the remaining lack of property photographs. Part 06 permits placeholders; phase approval does not invent delivery approval or release authorization. Actual upload serving remains absent from the backend contract. Do not add a file endpoint or expose local disk paths to close this dependency.

## Verification limits

Read-only evidence includes public controllers/request DTOs, validators/handlers, Pricing, Terms.GetActive and the Part 01 matrix. Contract checks confirm zero discrepancies; backend source is unchanged. Browser tests use intercepted APIs, real services/transport and trusted frontend HTTPS. Unit tests also resolve late promises that ignore abort and exercise approved-image failure. These verify frontend behavior, not actual inventory, caching/capacity, media serving or cookies/rotation. API port 7249 had no listener during Part 06 inspection. See the [completion report](part_06_completion.md) and existing [session dependency](session-verification.md).
