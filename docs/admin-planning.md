# Staff time plans and templates

Part 10 implements the five established planning routes in the existing admin SPA. Both Admin and SuperAdmin use the same AdminOnly services. The sole Axios runtime remains `src/API.tsx`; generated services and backend files are unchanged.

## Project workflow

Open `/admin/time-plans`, search/page projects and choose one. This picker reads project metadata only. `/admin/time-plans/:projectId` verifies the project, then calls the member `GET /projects/{projectId}/time-plan`. Only a verified project with a missing plan offers creation. There is no admin plan-list query or preload across projects.

Create an empty plan with its name and delivery timestamp, then add stages and items. Plan and stage updates send the full `TimePlanInput` despite the stage DTO's name. Item updates send only name, dueDate and confirmedDate. Date controls require complete ISO timestamps with explicit UTC offsets. Nullable request types do not override the backend's required delivery/due-date validators. Dates display using the selected language and Gregorian calendar.

Items start Pending (0), with Processing (1) and Completed (2). Every defined status can transition to every other status. The dedicated status POST sends status and an explicit nullable confirmedDate; Completed requires a confirmation date. Editing an already Completed item also requires that date. No stage/plan status or automatic sibling completion is invented.

Manual stages start empty and receive items through the item editor. Applying a stage template uses the server's `/stages/from-template` action, with its stageTemplateId and every mapped itemTemplateId/date. The server resolves source names/order and creates detached snapshots. All sources must be active; an empty active template can create an empty stage. After an application conflict, the editor reloads both the plan and selected source. Existing draft dates remain attached to source IDs. Changed assignment membership requires an explicit date reset, preventing a date from silently moving to another item.

Select a stage and item to edit their details and images. Selections survive reloads when their IDs remain in the authoritative tree. A concurrent plan creation reloads the existing plan while preserving the attempted creation values for review; no automatic update follows. An acknowledged plan deletion explicitly resets the plan draft. Deleting a parent removes its selected descendants from the UI. Delete confirmations explain hierarchy/image loss and discarding affected drafts.

## Images and ordering

An item accepts one JPEG/PNG/WebP file with a matching extension, non-empty and at most 5 MiB. The browser checks metadata; storage validation remains authoritative. Multipart uses `File` and optional `Description`, never AltText. Image PATCH sends only nullable description (up to 20,000 characters). A failed upload retains its file, description and local preview. Replaced/unmounted/successful upload previews revoke their object URLs. If another writer removes an image during an edit, its description draft remains in a disabled editor with a translated explanation until the user leaves the item. An acknowledged deletion by the current user removes that editor. Only authoritative current images enter ordering payloads.

Persisted ImagePath is a storage identifier. The existing resolver displays placeholders until an approved delivery mapping exists. It never places raw storage paths in the DOM or guesses URLs. This phase supports uploads and metadata management without claiming actual persisted-image delivery.

Move up/down buttons are native keyboard controls with translated names including the row name, disabled boundaries and a live position announcement. Stage/item/image moves send every current sibling exactly once, positions 1…N, with a 1,000-row contract maximum. The adapter rejects duplicate, incomplete or foreign membership. No optimistic order is shown. Every ordering failure, including 400 and 429, triggers an authoritative reload before retry. Network/5xx/malformed-success/follow-up-read failures additionally block writes until an explicit outcome check succeeds. Checking never replays the mutation.

## Reusable templates

`/admin/templates` and `/admin/templates/stages` show stage templates; `/admin/templates/items` shows item templates. Lists use pageSize 20, 300 ms name/code search and the supported nullable isActive filter. Selected templates use `?id=<guid>` on these existing routes; `?create=1` opens a new template. A missing selected ID never becomes an accidental create editor. Out-of-range pages recover after the list shrinks.

Create/edit sends exactly name/code. Confirmations cover active-state changes and hard deletion. Stage assignments are an ordered full-replacement draft, up to 100 distinct existing item-template IDs. Inactive items may remain assigned, as the backend permits, but prevent application until activated. Removing an assignment does not delete its item template. Item-template deletion removes its mappings; stage/item-template deletion does not rewrite existing project snapshots. No clone/restore endpoint is invented.

## State and failures

TimePlanContext and TemplatesContext mount near their routes and are keyed by staff/profile/generation, project/path and selected template. Their private reads abort superseded requests and reject obsolete generations. Retained snapshots keep forms mounted during refresh/error, with editing disabled until an authoritative read succeeds. 401/403 hide retained private content; missing projects also hide the hierarchy.

Each workspace shares one synchronous write gate through mutation and follow-up reads. The operation owns safe feedback, pending state, uncertainty and explicit reconciliation. 403/404/409 reload current data without automatic replay. The shared Part 09 operation hook gains an opt-in reload-on-every-failure setting for ordering; existing callers keep their behavior.

Drafts live only in component memory. One guard covers stage/item/source changes, router navigation and browser unload. Discard explicitly clears all page drafts; cancel keeps them. Pending writes block transitions. The router reads the latest pending lock, and creation navigation occurs only after the saved draft and lock have committed. Independent forms preserve their unsaved values during other successful writes or conflicts. Logout/unmount clears the workspace and cancels requests; cancellation is never presented as server rollback.

Live SQL/storage/account-policy/cookie verification still needs the configured API and dedicated verification data described in [session verification](session-verification.md). The local API listener was absent during Part 10. Intercepted browser workflows verify the frontend contract and behavior, not backend persistence or deployment.
