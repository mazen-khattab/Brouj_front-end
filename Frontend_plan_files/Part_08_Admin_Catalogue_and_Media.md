# Part 08 - Admin catalogue and media

## Objective and prerequisite

Prerequisite: Part 07 approved. Deliver staff catalogue management using actual CRUD and upload contracts. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build admin city/area/project/unit lists and detail/edit forms. Use public catalogue GET endpoints where the backend has no separate admin list. Do not promise a deleted-record catalogue or restore action that lacks an endpoint.
2. Implement create/update/delete for cities and areas, project create/update/delete, and project-scoped unit creation plus unit update/delete. Respect actual validators and relationships; no free-form parent ids when a selector can use paginated endpoints.
3. For PATCH submit the complete approved update input from loaded detail plus edits, excluding read-only fields, nested image arrays and unknown properties. Include query projectId for unit update/delete and detail.
4. Add approved replace-amenities actions for area/project/unit. Explain replacement semantics in the UI and preserve unsaved edits. Use Name/Value pairs from the current amenity DTO, not a nonexistent global amenity CRUD endpoint.
5. Implement supported project/unit image creation, metadata edit and delete operations. Only expose ordering if the current contract includes it; project/unit ordering must not be invented. Stage-item ordering belongs to Part 10.
6. Validate the 5 MiB individual file limit and supported types from backend storage validation before upload. Submit one File and optional AltText with FormData through the service. Revoke local preview object URLs on replacement/unmount.
7. Keep uploads functional even when existing-image delivery is not configured: local preview is possible; persisted paths remain identifiers. Use the shared resolver and surface the delivery dependency honestly.
8. Require confirmation for deletions and replacements with material data loss. On 409 reload authoritative state and preserve a recoverable draft; do not synthesize concurrency tokens or retry destructive writes.

## Context and state

Use route-local admin catalogue contexts, shared list/form components and paginated parent selectors. Parent changes reset incompatible child selections. Mutation success reloads the affected record/list and public data if still mounted. Disable conflicting submits and discard late responses from previous actor generations.

## Verification and acceptance

Exercise hierarchy creation/edit/delete, relationship validation, project/unit fields and nullable values, full PATCH payloads, required projectId, amenity replacement and image lifecycle. Test oversize/unsupported files, 413/415/429, failed upload, broken media, canceled navigation and unsaved edits.

Review Arabic/English forms and admin tables, including long values and confirmation dialogs. Deliver catalogue/media workflow evidence and completion report. Stop for approval before Part 09.
