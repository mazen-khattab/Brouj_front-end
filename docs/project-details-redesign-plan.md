# Project details redesign — implementation handoff

The user approved this plan and requested implementation in a **new session**. This file records the agreement; it does not claim implementation or verification.

## Workspace and authorization

- Frontend: `F:/Mazen/Projects/Brouj_front-end`.
- Backend: `F:/Mazen/Projects/Brouj`.
- Implement the frontend redesign and the explicitly approved backend change making project time-plan reads public. Keep editing operations restricted to staff.
- Inspect current repository guidance and working-tree changes before editing. Earlier homepage, navbar, About, authentication, and project-filter work is present and may be uncommitted; preserve it.
- Keep the established navy/gold/white palette, locally bundled fonts, enlarged Arabic typography, shared radius, Tailwind conventions, and Arabic/English support.
- Do not deploy or create additional product features.

## Approved page structure

### 1. Project details

- Keep the project image gallery, description, all current project facts, and amenities together.
- Render each amenity as a small card with its name in the top part and its value below.
- Remove the Project time plan navigation button; the plan appears as the third section of this page.
- Scope the amenity redesign to this project-details surface; avoid unintentionally changing other detail pages.

### 2. Units

- Replace the unit search, results-per-page selector, and pagination UI with a carousel.
- Show three unit cards on desktop, two on tablet, and one on mobile. Provide previous/next controls and touch swiping.
- Make all units reachable using internal paginated API reads as needed. Use batches of 12, loading the next batch as the user approaches the loaded end; retain previous batches for backward navigation. Keep this state scoped to the project and independent of project-list query parameters.
- Clicking a unit shows a localized coming-soon notice; do not navigate from carousel cards to unit details yet.
- Existing direct unit-detail URLs and reservation flows remain available. The user explicitly chose the coming-soon behavior despite those routes already existing.

### 3. Time plan

- Embed the plan beneath the units and make it visible without signing in.
- Display the plan name and available delivery information in the plan/stage headings.
- Render each stage as a collapsible subsection, first stage open initially, with multiple stages allowed open at once.
- Stack stage items vertically, preserving server sort order for stages, items, and images.
- Desktop item layout: equal halves, name/status on the **physical left**, image thumbnails on the right. Align Arabic text appropriately inside its half.
- Mobile item layout: name/status above the thumbnails.
- Display the first three image thumbnails, then a `+N` tile for the remaining count. Four images give `+1`; six give `+3`.
- Thumbnail click opens an enlarged viewer. `+N` opens a modal grid containing all images for that item. Selecting an image switches to its enlarged view; returning to the grid preserves gallery context.
- Support Escape dismissal, keyboard focus containment/restoration, and background scroll locking through the existing dialog infrastructure.

## Explicit decisions from the user

1. **Unit clicks:** show a coming-soon notice, while keeping existing direct unit routes.
2. **Time-plan access:** make plans public, including the necessary backend changes.
3. **Media:** retain safe placeholders until an approved delivery mapping exists. Implement thumbnail/grid/viewer interactions with labeled placeholder states; never use raw stored paths as image URLs or invent a delivery endpoint.

## Integration facts to recheck before implementation

- The project branch currently lives in `src/Pages/Catalogue/CataloguePage.tsx`. It composes `MediaGallery`, `ProjectFacts`, `Amenities`, and the existing unit list provider/filter/listing.
- Units use `GET /api/v1/projects/{projectId}/units`, a paginated anonymous read supporting pageNumber/pageSize/search. Omit search for the carousel.
- Time plans use `GET /api/v1/projects/{projectId}/time-plan` and `TimePlanDto`, containing stages, items, statuses, ordered image metadata, and delivery/due/confirmation dates.
- At inspection, the endpoint in backend `ProjectsController.cs` uses `Authorize(MemberOnly)`, and `GetProjectTimePlanQuery` independently implements `IRequireAccess` with `AccessLevel.Member`. Both boundaries must change for anonymous access. Follow the existing public-query pattern; keep all writes protected.
- The handler already loads a plan by project ID and orders nested stages/items/images by SortOrder. Preserve not-found behavior and existing public-read rate limiting.
- The standalone frontend time-plan route is currently member guarded, and `TimePlans.getProjectTimePlan` carries authenticated metadata. Make the standalone route and client metadata consistent with the approved public read, without replacing unrelated member/private guards.
- Existing `src/Pages/Account/TimePlanPage.tsx` is a separate detail view. Keep its URL working; the new embedded design does not require removing that route.
- `src/Catalogue/media.ts` has no approved identifier-to-browser-URL mapping. `VITE_MEDIA_ORIGIN` alone is insufficient. Reuse this boundary and its unavailable-image behavior.
- `src/Components/Dialog.tsx` provides native modal/focus/scroll handling. Prefer one dialog with grid/viewer modes over stacked dialogs.
- The original generated contract snapshot describes 101 operations. The current backend inventory has a UTF-8 BOM and 104 operations, including city/area/project lookups. The old contract checker fails before reconciliation. The accepted plan includes reconciling this mismatch while updating the public time-plan policy and regenerating accurate clients; do not bypass checks, edit generated output without its source, or mask discrepancies. City/area lookup additions were documented separately in `docs/contracts/location-lookups.md`; do not build an unrelated project-lookup UI.

## State and failure behavior

- Keep project, unit-carousel, and time-plan reads independent, cancel obsolete requests, and discard stale responses when project identity changes.
- A failed/missing plan must not hide project facts or units. Provide localized retry/not-found/empty states for each section.
- Handle empty units, no stages, empty stage items, and zero images. Use the existing safe status translations and unknown-status fallback.
- Honor reduced motion, sticky-navbar scroll offsets, RTL/LTR, and current mobile breakpoints.
- Do not add database migrations or a new image-delivery endpoint.

## Verification and handoff

- Backend: anonymous/customer/staff plan reads, existing not-found behavior, and anonymous denial of all plan-edit operations. Update authorization-contract expectations and affected HTTP/application tests.
- Frontend: multi-batch carousel navigation, responsive card counts, swipe/keyboard behavior, coming-soon notices, direct unit URLs, inline anonymous plan rendering, stage ordering/expansion, and independent failure/retry states.
- Images: counts of zero, one, three, and more than three; correct `+N`; grid-to-viewer transitions; dismissal and focus return; unavailable images and approved-mapping boundary behavior.
- Run appropriate build/typecheck/lint/unit/browser tests, backend checks, generated service/contract verification, and public/admin bundle isolation checks.
- Review English/Arabic screenshots on desktop, tablet, and mobile. Save a completion note distinguishing live backend evidence from intercepted browser fixtures, listing any remaining media/environment limitations.
- Prior work reported 443 passing frontend unit tests and 24 catalogue/filter browser cases. Treat these as historical evidence; verify the new work against current files.
