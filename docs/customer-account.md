# Customer account and member schedules

Part 07 connects the existing customer routes to real typed services. Account providers mount inside the customer guard; member time plans mount inside the member guard. The unit confirmation module is lazy and mounts only for a confirmed customer. API.tsx remains the sole transport boundary. No private DTO, password or form draft is persisted or logged.

| Screen/action | Contract and boundary |
|---|---|
| Profile | GET/PATCH `/api/v1/customers/me`; explicit fName, lName, phone, identityNumber and email only |
| Password | POST `/api/v1/customers/me/change-password`; currentPassword and newPassword unchanged, including spaces |
| Confirm reservation | POST `/api/v1/reservations` with `{unitId}` only; returned GUID drives detail navigation and GET |
| Own reservations | GET `/api/v1/reservations/me`; numeric status 0–2, bounded pageNumber/pageSize |
| Own reservation | GET `/api/v1/reservations/{id}`; POST its `/cancel` only after confirmation |
| Own orders | GET `/api/v1/orders/me`; numeric status 0–3, bounded pagination |
| Own order | GET `/api/v1/admin/orders/{id}` is intentionally MemberOnly; frontend remains `/account/orders/:orderId` |
| Member schedule | GET `/api/v1/projects/{projectId}/time-plan`; customer or staff, without reservation prerequisite |

All prices, references, availability, totals, dates and statuses come from backend DTOs. Reservation cancellation is offered only for Processing (0) with no order; the handler remains authoritative. No order creation/completion action appears. Reservation/order DTOs lack projectId, so the UI does not manufacture a nested unit URL from projectName or probe for one. A foreign-owner 404 is displayed as unavailable with no existence lookup.

Profile validation follows the live validators, including ASCII Egyptian phone/identity digits. Safe server field errors map to localized messages without displaying arbitrary server text. Passwords are never trimmed. Profile/password forms retain edits after validation/network failure. Successful mutations reload authoritative data; a failed post-save identity read blocks further writes until checked. The current backend retains the session after password change, and the frontend reauthenticates only if the subsequent identity read is definitively rejected. Wrong-current-password 401 does not trigger token renewal or automatic replay.

Mutation execution has a synchronous single-flight lock. A 409 explains the conflict and refreshes current status without repeating the action. Timeout/disconnection, 5xx or malformed success are uncertain: another write stays blocked and reservation actions offer a link to check the current reservation list. Cancellation of a request never claims rollback. Private reads have actor/ID/generation keys, immediate stale-data hiding, abort and latest-response checks. Session boundaries unmount private forms and reject late results/navigation.

Schedules show plan/stage delivery dates and item due/confirmed dates and numeric statuses. The DTO has no plan/stage status; none is synthesized. Supplied names, image descriptions and legal content remain plain text in their own direction. Progress images use the same approved-mapping boundary as property images; localized placeholders remain until delivery is approved. Terms are informational and no unsupported consent field is submitted.

Verification uses intercepted contracts over trusted frontend HTTPS and real services/transport. It does not prove live database ownership, cookie issuance or API mutations. See the [completion report](part_07_completion.md), [media boundary](catalogue.md) and [existing real-session dependency](session-verification.md).
