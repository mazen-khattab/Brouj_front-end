# Real-time readiness

Part 12 prepares an inactive reload boundary. V1 always creates `createDisabledRealtimeAdapter`; it adds no SignalR dependency, hub URL, connection, reconnect timer, environment activation flag or connection badge. Existing CRUD and explicit refresh behavior remain sufficient. This work does not activate real time.

## Interface and ownership

`src/Realtime/types.ts` defines `RealtimeAdapter`: `start()`, `stop()`, `getStatus()`, `subscribeStatus(listener)` and `subscribeEvents(listener)`. Both subscriptions return an unsubscribe function. Start/stop may return a promise. Status is `disabled`, `connecting`, `connected`, `reconnecting` or `disconnected`. A future adapter must make start/stop safe to repeat and cancel any unfinished start when stopped, including React StrictMode's start/stop/start sequence. Construction must have no external side effects.

`RealtimeEvent` is a frontend reload hint with `feature: 'reservations' | 'orders' | 'timePlan'` and optional `resourceId`. The ID identifies a reservation/order record or a **project** for a time plan. Omitting it invalidates the whole feature. These names and fields are not a proposed server event schema. A later transport must validate agreed incoming messages before mapping them to these hints. Hints never supply prices, permissions, status changes or other authoritative DTO values.

`RealtimeProvider` sits inside `AuthProvider` in `main.tsx`, consumes its identity/generation, and owns a session's start, unsubscribe and stop. Anonymous/bootstrap/unavailable identities use the disabled adapter without starting an injected transport. Authenticated actor/type/ID/generation changes replace the session. Subscriptions to status can use React's `useSyncExternalStore(session.subscribeStatus, session.getStatus)` through `RealtimeContext`; no status UI is currently shown.

The session guards each callback with its activation epoch and the coordinator's current generation. Cleanup invalidates callbacks before unsubscribing and stopping. `useRealtimeReload` checks the session again when a scheduled reload is dispatched, closing the interval between a queued hint and an actor transition before React commits. No events or private results are persisted.

## Mounted feature integration

| Mounted context | Feature | Authoritative reads |
|---|---|---|
| Customer reservation list/detail in `AccountDataProvider` | reservations | `getMyReservations` / `getReservationById` |
| Customer order list/detail in `AccountDataProvider` | orders | `getMyOrders` / `getOrderById` |
| Member project plan in `AccountDataProvider` | timePlan | `getProjectTimePlan` |
| `ReservationsAdminProvider` | reservations | `getReservations` / `getReservationDetails` |
| `OrdersAdminProvider` | orders | `getOrders` / `getOrderById` |
| `TimePlanProvider` | timePlan | `getProjectById` and `getProjectTimePlan` |

Lists reload for any record hint because membership in the current filter may have changed. Details ignore other record/project IDs; a feature-wide hint refreshes all mounted matching readers. GUID comparison is case insensitive. Existing read hooks retain current paging, status filters and record IDs and cancel obsolete reads. Filter/record changes or route unmount dispose queued work and unsubscribe. Re-entry starts with an ordinary authoritative read, without retaining old invalidations.

The microtask queue collapses a burst into one read. Hints arriving during an initial/current read retain one trailing refresh after it settles; they do not repeatedly cancel that read. Awaitable staff reads also release the queue when they settle before React paints loading. Read failures stay in the feature's normal localized error state; a later hint or manual refresh may retry the read. No mutation is dispatched or replayed by this boundary.

On `reconnecting -> connected`, or `connected -> disconnected -> connected`, the session emits one feature-wide invalidation for each of the three features. Only mounted readers respond. Repeated connected notifications do not cause further refreshes. This resynchronizes state after potentially missed events; it is not a claim of replay or durable event delivery.

## Fake-backed verification

`tests/fixtures/fakeRealtimeAdapter.ts` is a deterministic injection for tests or a deliberately separate development harness. It exposes explicit events, status transitions, lifecycle/listener counts and captured late callbacks. The application never imports it. Unit tests inject its adapter factory into `RealtimeProvider`, mount the actual feature providers, and assert service reads and resulting data. No demonstration route, external network or timed fake connection is needed.

`tests/unit/realtime.test.tsx` covers disabled transport behavior, start/stop/unsubscribe, lifecycle failures, StrictMode, coalescing, reconnect, route/filter changes, cancellation, rejected reads, and actor/logout isolation. `tests/browser/realtime.spec.ts` checks the shipped disabled provider across Arabic/RTL and English/LTR public, customer and staff screens on desktop/mobile, including logout. Browser fixtures supply synthetic HTTP responses. The Vite development server's HMR socket is distinguished from application connections. `npm run routes:check-build` also checks that the fake does not enter production chunks.

## Backend evidence and future activation checklist

Read-only inspection of the current backend Part 8 endpoint inventory/configuration, Part 12 handoff, `src/Brouj.API/Program.cs`, and a source scan finds no registered SignalR hub or approved real-time contract. The existing REST service/DTO contract is unchanged. No backend edits were made.

Before a separately approved activation change:

- Obtain the exact hub URL and negotiation/transport configuration from the backend owner; do not derive it from the REST origin.
- Agree authentication, host-only HttpOnly/Secure/SameSite cookie behavior, exact credentialed CORS origins, HTTPS, connection expiry and account/role revalidation. Never read cookies or use HttpOnly credentials in `accessTokenFactory` or browser storage.
- Agree server authorization, actor/ownership checks, resource/group subscriptions, group changes and cleanup when accounts, permissions, routes or actors change. UI filtering is not authorization.
- Agree actual event names, validated payloads, resource-ID meaning, ordering, duplication and delivery guarantees; map those messages to internal reload hints.
- Agree disconnect/stop behavior, cancellation of in-progress start/negotiation, reconnection policy, missed-event/replay guarantees and which state must be resynchronized. Retain authoritative REST reads after reconnect even if replay exists unless the contract explicitly guarantees otherwise.
- Review negotiation and CSRF expectations explicitly. SignalR does not inherit Axios request interceptors, unsafe-request proof handling, cookie rotation or session recovery automatically. Do not weaken existing CSRF/cookie/HTTPS protections.
- Only after agreement and separate approval, add Microsoft's SignalR client behind `RealtimeAdapter` and add/enable its reviewed environment flag. Confirm cookie/CORS/authentication with the real deployment and dedicated accounts, including stale callbacks, logout, expiry, actor switches and denied groups.

Live API/session/database verification and the inherited currency/media/hosting/capacity release dependencies remain in their existing reports. Part 13 release/deployment still requires its own explicit gate.
