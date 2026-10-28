# Part 09 - Admin customers, reservations and orders

## Objective and prerequisite

Prerequisite: Part 08 approved. Implement staff operational workflows without bypassing backend status rules. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Build paginated customer list/detail from admin customer endpoints, including only approved filters and fields. Implement soft deletion and restoration; do not add staff customer registration/edit flows absent from the contracts.
2. Build admin reservation list/detail using separate admin reservation services, not the customer's /me queries. Display DTO status and linked order where present.
3. Implement POST /api/v1/admin/reservations/{reservationId}/order with confirmation. The server derives totals and statuses. Fetch the returned order GUID; do not submit a client-supplied price or fabricate a body for a bodyless contract.
4. Build admin order list/detail and POST /api/v1/admin/orders/{id}/complete where the backend supports initiative-order completion. Button eligibility mirrors current handler rules; the handler still decides.
5. Provide cross-links among known reservation/order/unit/customer data only where returned identifiers permit them. Do not fetch all customers to join missing fields or invent API relations.
6. Use focused customer-operations/reservation/order contexts. On successful conversion refresh the reservation and order views. On completion refresh order status. On 409 refresh and show a localized conflict explanation.
7. Add destructive confirmations and separate pending/error state per operation. Never report customer deletion as physical erasure if the API soft-deletes. Do not retry a timeout on order conversion/completion automatically.

## Contracts and security

Staff policies allow Admin and SuperAdmin. Data tables are paginated, maximum page size 100; query strings include only approved names. Date/status filtering follows the request DTO rather than client assumptions. Protect personal data in logs and screenshots. No export, payments, revenue cards or aggregate KPI request is implied.

## Verification and acceptance

Test customer delete/restore, reservation lookup, successful conversion, repeated/stale conversion, supported completion and invalid-status rejection. Verify 403, 404, 409, 429 and empty results. Test failure preservation, double-click protection and cleanup after staff logout.

Verify table actions and dialogs in Arabic/English with keyboard and mobile scrolling. Deliver workflow evidence and completion report. Stop before Part 10 until approved.
