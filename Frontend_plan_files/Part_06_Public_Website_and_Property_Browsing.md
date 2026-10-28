# Part 06 - Public Website and property browsing

## Objective and prerequisite

Prerequisite: Part 05 approved. Build responsive discovery pages backed by existing public contracts. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build the landing page with clear project-discovery and account/reservation entry points. Use approved copy or neutral draft copy identified for review; do not invent testimonials, contact numbers, inventory counts or investment guarantees.
2. Implement cities and city-area browsing, area detail, project list/detail and project-unit list/detail using Cities, Areas, Projects and Units services through focused catalogue contexts.
3. Keep supported search/filter/page state in the URL. Map only fields approved by the matrix (project search, city, area and project type where supported). Reset pagination after filter changes, debounce text search about 300ms and cancel obsolete reads.
4. Use backend pagination totals, sensible empty/error states and a retry action. Guard against out-of-order responses; do not load all pages into memory or fake unsupported server sorting/filtering.
5. Present price/size/project type/availability and other DTO fields accurately; use server-returned totals as authoritative. Unit detail service requires both unit id and query projectId even though the frontend URL is nested.
6. Add media resolver and gallery components. Until an approved media URL mapping exists, show localized placeholders for storage identifiers. Accept only validated approved HTTPS media URLs when configured; never treat a filesystem path as src. Handle broken images without breaking cards.
7. Show amenities, readable descriptions and current terms. Render backend content as escaped text with preserved paragraphs. Do not use raw HTML insertion or machine translation for legal content.
8. Make a reservation CTA lead an anonymous visitor through customer login with a safe return path; the actual mutation belongs to Part 07. Member-only time plans link through the existing guard.

## Interfaces and data flow

Catalogue services return typed DTOs; contexts own params, status, data and reload functions. Components accept view data and actions, not Axios responses. Clear obsolete detail state on route id changes. Include route title metadata so later SEO work has a defined boundary without adding SSR now.

A media resolver returns either an approved browser URL or no URL. Upload identifiers remain private implementation data and are never rendered as visible paths.

## Verification and acceptance

Test page/filter URL round trips, empty lists, rapid search, pagination, missing project/unit, required projectId, broken/unavailable media, terms retrieval failure and anonymous reservation navigation. Review cards, detail pages and galleries in both languages on mobile/desktop.

Deliver complete browsing screens and the media dependency disposition. Placeholders are acceptable for this phase when media delivery is absent; release must explicitly record/approve any remaining image-display limitation. Stop for approval before Part 07.
