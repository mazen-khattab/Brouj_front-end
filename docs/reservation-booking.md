# Reservation form and backend handoff

The unit details page for both project types ends with **Reserve now**. The modal collects a four-part name, phone, 14-digit national ID, age group, residence, financial preference and repayment period. All fields are required. Signed-in customers start with their current name, phone and national ID; edits apply to this reservation only. Preference selections start empty for every new booking.

Guests also enter email and password. Submission first registers the customer through the existing authentication coordinator, establishes the customer session, and then calls the protected reservation endpoint. An existing account must sign in using the link in the modal. A registration failure cannot create a reservation. No customer profile update is sent.

## Reservation request

`POST /api/v1/reservations` receives this JSON body:

```json
{
  "unitId": "40000000-0000-4000-8000-000000000001",
  "fullName": "First Second Third Family",
  "phone": "01000000000",
  "identityNumber": "10000000000000",
  "ageGroup": "28-35",
  "placeOfResidence": "Cairo",
  "preferredFinancialBracket": 500000,
  "preferredRepaymentPeriod": 9
}
```

For a submission started as a guest, `email` and `password` are also included in this body, as requested, and are used in the preceding registration request. They are omitted for a customer who was already signed in. Passwords are sent unchanged. Treat the guest password as a credential: never persist it in reservation records, return it in a response or include it in request logs.

| Field | Accepted values / meaning |
| --- | --- |
| `fullName` | Four whitespace-separated name parts; first part up to 100 characters, remaining parts together up to 100 characters to support existing registration |
| `phone` | Eleven-digit Egyptian mobile number |
| `identityNumber` | Exactly 14 ASCII digits, sent as a string |
| `ageGroup` | `"21-27"`, `"28-35"`, `"36+"` |
| `placeOfResidence` | Required text, up to 250 characters |
| `preferredFinancialBracket` | `350000`, `500000`, `650000` (EGP amounts, JSON numbers) |
| `preferredRepaymentPeriod` | `6`, `9`, `12` (months, JSON numbers) |

The form uses a separate `ReservationBookingInput` type extending the currently generated `{ unitId }` contract. The existing generated service forwards the extended body unchanged. Backend source, generated contract snapshots and registration endpoints remain unchanged. Update the backend reservation request, command validation, persistence and responses to store these details against each reservation. The current backend may ignore or reject the additional properties until that work is complete; frontend checks do not establish persistence.

Success still expects the existing API envelope with the reservation GUID and navigates to its account detail. Duplicate submits are blocked. Reservation conflicts reload current unit data; uncertain writes offer a link to current reservations and prevent another submission. Closing the modal clears its draft. Drafts and credentials are never written to browser storage or URLs.

Order creation retains the current backend workflow: an administrator converts a Processing reservation at `/admin/reservations`; customers see the resulting order at `/account/orders`.

## Testing

Run `npm run test:browser -- tests/browser/reservationBooking.spec.ts tests/browser/account.spec.ts tests/browser/catalogue.spec.ts --workers=2` with the project's trusted local HTTPS setup. Browser tests use intercepted API fixtures. Focused unit coverage is in `tests/unit/reservation-booking.test.tsx`. Live persistence of additional fields requires the backend update above.
