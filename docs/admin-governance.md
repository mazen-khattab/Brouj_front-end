# Admin governance and staff workflows

Part 11 implements the seven existing governance/account routes inside the lazy admin branch. Each route mounts a focused TermsAdmin, ActivityLogs, StaffAdmin or StaffAccount provider. Private state is discarded at actor, profile ID, session generation and route changes. No records or passwords are written to browser storage or telemetry.

## Terms

`/admin/terms` reads twenty versions per page. `?create=1` adds the plain-text version form. Creation sends only title, content, positive Int32 versionNumber and an explicit offset effectiveDate. Title is limited to 300 characters and content to 100,000, matching the live validators. Legal content remains in its supplied language and renders as React text, including literal HTML-looking strings.

`/admin/terms/:termsId` shows immutable legal wording, version, effective date and active state. Activation requires confirmation and sends a bodyless POST. The server checks future dates and switches active versions. Success reloads the admin page/detail and invalidates mounted public catalogue/terms readers through the established in-memory event boundary. There is no legal edit or delete endpoint.

## Audit

`/admin/activity-logs` supports only pageNumber/pageSize, userId, entityType, action, dateFrom and dateTo. Apply validates GUID, resource-type length, numeric action and timestamp range before querying. Actions are Created=0, Updated=1 and Deleted=2. Detail and table show only entityType/entityId, userId, action and createdAt from ActivityLogDto.

The live list and detail projections explicitly exclude OldData/NewData. The frontend therefore explains that names and before/after changes are unavailable. It never guesses these fields or renders arbitrary JSON. Unexpected nullable/structured strings and invalid dates show a translated fallback. Display strings are bounded to 512 characters, and runtime audit collections to 100 rows. No edits, deletion or export controls exist.

## Staff account and management

| Actor | Terms/audit/account | Staff management routes | Staff management API |
|---|---|---|---|
| Anonymous | Staff login required | Staff login required | Authentication required |
| Customer | Forbidden | Forbidden | Forbidden by backend policy |
| Admin | Allowed | Forbidden, navigation hidden | Forbidden by backend policy |
| SuperAdmin | Allowed | Allowed | SuperAdminOnly plus live application authorization |

`/admin/account` reads `/api/v1/users/me` and offers the current/new password form. There is no self-profile PATCH. The current password must have at least one character, the new password at least eight; neither is trimmed or given an invented complexity rule. Password calls disable automatic authentication recovery because a wrong current password returns a business 401. That rejection keeps the form and does not rotate cookies or replay credentials. A successful change reloads identity, clears fields and states accurately that the current session remains active; no all-session revocation is promised.

`/admin/users` supports twenty-row pages, 300ms name/email search and optional role/deletion filters. `?create=1` sends name, email, phone, role and initial password. The role enum is numeric SuperAdmin=0/Admin=1. `/admin/users/:userId` sends the complete name/email/phone/role update DTO, with no password or writable ID/deletedAt. Creates and updates require confirmation; soft-delete/restore have explicit account/access confirmations. Successful changes re-read the affected list/detail and current identity.

The backend rejects self-deletion, demotion of the current SuperAdmin, demotion/deletion of the last active SuperAdmin, edits to deleted accounts, and account-detail collisions. Both approved roles remain selectable; the UI explains these rules and reports translated conflicts, rather than inventing an additional authorization policy. SuperAdmin can update their own details through staff management, preserving that role.

## Failure and session behavior

The shared staff operation gate locks duplicate writes synchronously through the authoritative follow-up reads. Conflicts and permission/not-found rejections reconcile records without replay. Network/server/malformed-success failures or failed follow-up reads block additional writes until the user explicitly checks records. A read check does not prove that an uncertain password change failed or undo a committed mutation.

Forms retain drafts after rejection and protect router navigation/unload. Pending writes prevent abandoning the route through its navigation dialog. Password/create forms reset after confirmed success. Denied reads discard retained records; a later outage cannot redisplay them. Forbidden responses re-read identity so demotion removes stale SuperAdmin navigation and access. If that identity read fails, the established bootstrap lifecycle clears the stale identity and shows session verification. Ordinary authenticated 401 recovery remains in the transport; password business rejection uses the exception described above.

## Evidence and environment

See [Part 11 completion](part_11_completion.md) for exact checks and bilingual captures. Backend evidence includes current controllers, DTOs, validators, handlers, numeric enums, JSON configuration and both HTTP/application authorization. The existing backend Release test assembly can exercise HTTP authorization in its test host; this does not verify a deployed API, live SQL or real browser cookies. The local API listener and dedicated-account configuration remain the existing [session verification dependency](session-verification.md).
