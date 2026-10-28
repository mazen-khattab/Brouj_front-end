# Part 11 - Admin governance and staff

## Objective and prerequisite

Prerequisite: Part 10 approved. Complete terms governance, audit inspection and privileged staff administration. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build terms-version list/detail, create-version and activate-version screens using approved endpoints. Existing versions are not editable unless an endpoint exists. After activation refresh both admin lists and current public terms when mounted.
2. Render supplied terms as escaped text. Label version, effective date and active status. Do not translate stored legal prose or add a rich HTML editor without a separately approved content/sanitization contract.
3. Build paginated activity-log list/detail using existing filters. Present available actor/action/time/resource and changes without inventing absent fields. Render nullable/structured audit values safely and avoid unbounded formatting work.
4. Build staff account view and password change from /api/v1/users/me and its change-password route. No self-profile PATCH is available unless the contract changes.
5. Implement SuperAdmin staff-user lists/details/create/update/soft-delete/restore. Use the exact input DTO and role enum. Hide staff-management navigation for Admin and enforce the same restriction in route guards.
6. Show clear destructive confirmations and backend validation/permission errors. Reflect backend rules for self-modification and privileged accounts; do not create a new client-only authorization policy that silently overrides approved server behavior.
7. After role/account changes, refresh affected lists and current identity when relevant. On a subsequent forbidden/unauthenticated response clear stale permissions and use the established session lifecycle.
8. Keep audit/customer/staff information out of telemetry and browser persistence. Do not add audit edits/deletion or bulk export without a backend contract.

## Interfaces and contracts

Use Terms, ActivityLogs, StaffProfile and StaffAdmin services with focused route-local contexts. Staff password fields never persist, and a success notice does not claim all sessions were revoked unless the server guarantees it. All user-management methods remain SuperAdmin-only even if the UI is reached through a direct URL.

## Verification and acceptance

Test terms creation/activation and public-current refresh, empty/malformed optional audit data, staff password change, role selection and staff delete/restore. Verify Admin direct navigation and direct API attempts cannot gain staff management; verify customer isolation as well.

Review version/audit views and privileged forms in both languages with keyboard navigation. Deliver role/access evidence and completion report. Stop before Part 12 until approved.
