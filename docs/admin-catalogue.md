# Independent dashboard features — Phase 1

Staff now have four direct navigation entries and independent lazy-loaded pages:

| Feature | List / create | Detail |
| --- | --- | --- |
| Cities | /admin/cities, ?create=1 | /admin/cities/:cityId |
| Areas | /admin/areas, ?create=1 | /admin/areas/:areaId |
| Projects | /admin/projects, ?create=1 | /admin/projects/:projectId |
| Units | /admin/units, ?create=1 | /admin/units/:unitId?projectId=… |

These replace the previous /admin/catalogue routes. Public catalogue browsing is unchanged.

## Feature ownership

Each folder under src/Features (Cities, Areas, Projects, Units) owns:

- Its Page, List, and explicit Form JSX.
- types.ts: typed form drafts and entity types based on generated contracts.
- validation.ts: its business validation, including amenities/uploads where applicable.
- Components and feature hooks call Services directly for reads and writes.
- Projects and Units have mapping.ts for draft initialization, number/null conversion, and explicit writable payloads. Cities and Areas keep their small mappings inside their forms.
- Browser links use Router/browserPaths.ts; there are no feature-local URL wrappers.
- EditorContext.ts, EditorProvider.tsx, useRecord.ts: independent editor state, request locks, and session-bound reads.
- Local parent selectors, feedback, amenities, media editors, and property facts where needed.

There is no dashboard kind dispatcher, union draft schema, shared entity form, or shared business validator. UI primitives, generated API services/contracts, authentication, formatting, and core request helpers remain shared. Public/admin read invalidation stays connected so writes refresh mounted views.

To add an entity field, update its local draft type, form, validation, payload mapping (inside the form or mapping.ts), and labels, plus the backend contract if needed. Other entity folders do not need changes. Generated Services files and Types/contracts.ts still follow the contract-generation workflow.

## Relationships and UX

AreaForm requires a searchable, paginated City selector on create and edit. ProjectForm similarly selects an Area. No raw identifier entry is needed.

Units starts with a searchable, paginated Project filter. Without a selection it prompts for a project and sends no unit-list request: the API has no global unit-list endpoint. The filter lives in ?projectId=… and survives pagination and links. Project detail links to the standalone Units list and creation form with that project preselected.

UnitForm always includes a required Project selector. Creation lets staff choose a project independently of the list filter. Editing shows the existing project with an explanatory hint and disables reassignment: the backend PATCH accepts projectId as a scope query, not a writable relationship. Creation uses the selected project's POST route; reads, edits, and deletes retain matching scope. Moving units would require a backend contract change.

Regular/initiative rules, monetary precision, nullable inputs, amenities, uploads, metadata, and confirmed deletion remain in the owning feature. PATCH mapping excludes read-only identity, garage, availability, calculated, media, and amenity properties.

Drafts survive same-record refreshes and failed/conflicting operations. Navigation and before-unload guards protect unsaved edits. Writes hold a synchronous lock through authoritative refresh. Ambiguous outcomes and failed follow-up reads block another write until an explicit successful check. Unmount cancels requests, and stale authentication generations cannot publish success.

## Planning boundary

Phase 1 did not change Planning. Phase 2 has now moved it into src/Features/Planning with explicit, feature-owned forms. The temporary src/AdminCatalogue/model.ts upload helper has been relocated to Planning/Items/validation.ts and the obsolete file removed. See [Planning feature ownership](planning-features.md).

## Verification

The unit suite covers payloads, validation, drafts, duplicate-write locks, uncertain outcomes, conflict recovery, and stale/canceled reads. tests/browser/adminCatalogue.spec.ts covers all four direct dashboard entries, Project filtering, required relationship selection, standalone Unit creation/editing, hierarchy CRUD, amenities, uploads, draft retention, and navigation protection in desktop/mobile Chromium. It asserts no uncaught page errors and checks Arabic/English layout overflow. Screenshots go to test-results/dashboard-features.

Run npm test -- --maxWorkers=2, npm run lint, npm run build, npm run routes:check-build, and npm run test:browser -- tests/browser/adminCatalogue.spec.ts --workers=2. On Windows the HTTPS browser harness may need NODE_OPTIONS=--use-system-ca.
