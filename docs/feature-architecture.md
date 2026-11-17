# Feature ownership

Production pages and business state live in `src/Features`. Domains with multiple audiences use independent `Admin`, `Public`, `Customer`, or `Staff` folders. Browser URLs and access policies remain in `src/Router`.

| Domain | Ownership |
| --- | --- |
| Cities, Areas, Projects, Units | `Admin` owns editing, validation, drafts, media writes, and relationship selectors. `Public` owns browsing, URL filters, details, and read-only facts. |
| Customers | `Admin` owns search, deletion filters, detail reads, soft deletion, and restoration. Personal search text stays in memory. |
| Reservations | `Admin` owns conversion and its authoritative reservation/order reads. `Customer` owns booking, guest registration continuation, history, detail, and cancellation. |
| Orders | `Admin` owns filters and initiative completion. `Customer` owns personal history and details. Neither audience depends on Reservation form state. |
| Authentication | `Customer` owns login and registration; `Staff` owns staff login. Each screen has concrete credential state and validation. |
| Profile | `Customer` owns profile/password edits and recovery. `Staff` owns the staff account and password form. |
| Staff | `Admin` owns SuperAdmin-only staff management and its concrete create/update forms. |
| Terms | `Admin` owns immutable versions and deliberate activation; `Public` owns current legal terms. |
| ActivityLogs | `Admin` owns bounded filters, audit presentation, and defensive payload handling. |
| Planning | Plans, stages, items, and templates retain independent forms. `Public` owns embedded and standalone schedule reads and progress galleries. |
| Home | Owns the homepage composition, sections, independent project/terms reads, and carousel state. |
| About, Dashboard | Own their pages. Dashboard navigation configuration stays in `Router/adminNavigation.ts`. |
| Development | Owns the showcase and authentication preview. Their routes remain inside the development-only guard and are absent from production output. |

## Integration boundaries

Features call `Services` directly. Generated services and backend DTOs stay central; form drafts, UI types, validation, and meaningful mappings stay with their domain. No pass-through `api.ts` modules or cross-domain business dispatchers are used.

Cross-domain UI composition uses explicit components: `Areas/Public/Browser` accepts a city ID, `Projects/Public/Browser` accepts an area ID, and the unit carousel and public schedule accept a project ID. `Reservations/Customer/ReservationEntry` accepts the current unit and a refresh callback. `BookingScope` owns the booking lifecycle through the guest's registration without reading another feature's private context or validation.

Reservation conversion reads the resulting reservation and linked order before acknowledging success. The shared in-memory invalidation channel refreshes other mounted reservation/order views. Public content invalidation refreshes mounted property and terms readers after writes. Requests are canceled on unmount, and session generation checks reject late protected results. Pending writes and uncertain outcomes remain locked through authoritative refresh/reconciliation.

## Shared infrastructure

`Context` contains only authentication/session, locale, realtime, and toast providers. `Hooks` contains generic request/write lifecycles, pagination bounds, location lookups, and infrastructure accessors. `useResourceRead` handles cancellation, latest-response protection, and immediate stale-data hiding; `useStaffRead` supplies awaitable protected reads.

`Forms` contains generic draft retention, dirty-navigation protection, and field-error matching. `Validation` contains reusable email and wire timestamp rules. `Media` contains the approved delivery boundary. UI primitives and generic feedback/panel finishes remain in `Components`; layouts, routing, transport, security, localization, and generated contracts remain outside features.

Unit reassignment and the unavailable all-units endpoint remain outside this migration. Existing extended booking payload/backend limitations are documented in [reservation-booking.md](reservation-booking.md).

## Verification

The migration proceeded through Customers; Reservations; Orders; Authentication/Profile/Staff; Terms/Activity Logs; public property browsing; and Home/About/Dashboard, with checks before the next implementation phase. See [the verification record](feature-migration-verification.md).

`tests/unit/feature-boundaries.test.ts` prevents legacy business folders, infrastructure-to-feature dependencies, private cross-domain imports, and pass-through API modules. `scripts/verify-route-bundles.mjs` walks all public and customer static import graphs, verifies separate admin lazy entries, and checks development/fake-realtime exclusion. API consumer evidence is generated in `docs/release/api-coverage.*`.
