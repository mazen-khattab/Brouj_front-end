# Part 07 - Customer account and reservations

## Objective and prerequisite

Prerequisite: Part 06 approved. Complete customer self-service with backend ownership and business-state enforcement. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build profile display/edit from GET/PATCH /api/v1/customers/me and password change from its change-password endpoint. Send only approved input fields; never include a user-selected customer id.
2. Implement customer reservation confirmation from unit detail. POST /api/v1/reservations accepts unitId, not actorId, price or status. Disable repeated submission; navigate using the returned reservation GUID and fetch authoritative detail.
3. Build paginated personal reservation list/detail and approved status filtering. Use POST /api/v1/reservations/{id}/cancel for cancellation with an explicit localized confirmation.
4. Implement personal order list from GET /api/v1/orders/me. Customer order detail intentionally uses GET /api/v1/admin/orders/{id}, a MemberOnly endpoint whose handler scopes customer ownership. Keep the frontend route under /account/orders/:orderId.
5. Build member project time-plan viewing using GET /api/v1/projects/{projectId}/time-plan. Membership, not an invented reservation prerequisite, controls this endpoint. Show actual plan/stage/item status and supported progress images.
6. Keep account context and private feature contexts within the customer branch. Reload profile after edits and affected lists/details after mutations. On password-change session invalidation, follow the server result and reauthenticate where necessary.
7. Handle 409 by explaining the conflict and refreshing current status; do not repeat the business action. Another customer's reservation/order may be 404 and must not be exposed by a frontend existence probe.
8. Preserve form edits after validation/network failures. Treat mutation timeout/disconnection as uncertain: offer to check the current reservation list before resubmitting, not an automatic retry.

## Permissions and content

No order creation/completion controls appear in customer pages. Do not calculate authoritative totals or locally mark availability reserved without confirmation. Profile identity numbers and personal information must not enter analytics, persistent state or logs.

Display current terms as legal information; do not add a submitted consent field if the backend does not accept one. Translate UI around supplied legal content, not the content itself.

## Verification and acceptance

Run register/login -> browse unit -> reserve -> view detail/list -> cancel; separately verify personal orders and plan viewing. Test duplicate/unavailable reservation conflicts, foreign-owner 404, password/profile validation, expired session, uncertain mutation outcome and private-state cleanup after logout.

Browser-review all screens in Arabic/English at mobile/desktop widths. Deliver customer journey evidence and completion report. Stop before Part 08 until approved.
