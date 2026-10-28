# Part 10 - Admin time plans and templates

## Objective and prerequisite

Prerequisite: Part 09 approved. Implement project planning hierarchy and reusable templates. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build project time-plan viewing and create/edit/delete actions from the project/time-plan contracts. Load the plan by project through the member read endpoint; do not invent an admin plan-list endpoint.
2. Add stage creation, creation from template, update/delete and reorder actions. Bind parent/child ids from current routes and preserve the specific approved body for each operation; stage update may use the backend TimePlanInput contract despite its name.
3. Add plan-stage items with approved input fields, edit/delete, status-change and reorder actions. Use the specific status endpoint rather than assuming status belongs in generic PATCH.
4. Add stage-item image upload, description update, delete and ordering. Respect route parent identifiers, one-file form input, 5 MiB limit and the shared media resolver.
5. Build paginated stage-template/item-template screens. Implement only available create/update/delete, active-state and stage-template item-assignment operations from the matrix.
6. Implement keyboard-operable Move up/Move down controls, with translated accessible names and live announcements. Send the complete ordering payload required by the request DTO. Use pending visual feedback and reload after success/failure; drag-and-drop is not required for V1.
7. Derive status labels and allowed transitions from backend enums/handlers. Explain conflicts after reloading; do not locally assume a parent completion rule or auto-complete unrelated items.
8. Keep selection stable when possible after reload; clear selected children when their parent is deleted. Protect unsaved edits when changing project/stage. Do not load every project's plan at dashboard startup.

## Interfaces and failures

Use focused TimePlanContext and TemplatesContext with service-based load/mutate/reload actions. Scope state by projectId/planId and actor generation. Reordering is a server mutation; a network failure may leave its result uncertain, so reload before another attempt. No invented version/ETag field or optimistic-concurrency mechanism is required.

Template application must use the existing server action and approved draft fields. Do not clone entities entirely in the browser when the server provides a template command.

## Verification and acceptance

Test complete plan -> stage -> item -> image workflows, template application, status transitions, deletion, ordering boundaries and reordered reloads. Cover duplicate/stale ordering, parent mismatch, foreign ids, empty plans/templates, upload failure and 409.

Verify hierarchy navigation, date fields, keyboard ordering and long names in both languages/directions. Deliver workflow evidence and completion report. Stop for approval before Part 11.
