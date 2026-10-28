# Part 12 - SignalR readiness

## Objective and prerequisite

Prerequisite: Part 11 approved. Prepare an inactive, testable real-time boundary without inventing a hub contract. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Define a transport-independent RealtimeAdapter with start(), stop(), connection status subscription and event subscription returning an unsubscribe function. Status values: disabled, connecting, connected, reconnecting, disconnected.
2. Use an internal RealtimeEvent type describing a feature reload request and optional resource id. This is a frontend interface only, not an assumed SignalR wire schema.
3. Supply a disabled adapter by default. RealtimeContext consumes AuthContext and owns lifecycle; no SignalR package, hub URL, network connection, timers or fake connected badge ships in V1.
4. Add a fake adapter for tests/development demonstrations only. Demonstrate reservation/order/time-plan changes causing the corresponding mounted feature context to reload via services.
5. Coalesce repeated invalidations while a reload is pending. Respect current filter/record ids and cancel obsolete reads. Do not let an event invent authoritative prices, permissions or business status.
6. Scope subscriptions to actor generation and route lifetime. Unsubscribe on unmount, stop on logout/actor change, and ignore stale events. React StrictMode remounts must not duplicate listeners.
7. Document reconnect resynchronization: a future adapter will reload affected state after reconnect because events may be missed. Existing CRUD/refetch behavior remains sufficient while real time is disabled.

## Required future backend agreement

Before activation, obtain the actual hub URL, authentication/cookie/CORS policy, authorization and ownership model, event names and payloads, resource/group subscriptions, disconnect behavior and reconnect/replay guarantees. Review negotiation and CSRF expectations explicitly; do not assume Axios unsafe-request handling applies to the SignalR client.

Only then add a Microsoft SignalR implementation behind the adapter and enable its environment flag in a separately approved change. Never put HttpOnly credentials into an accessTokenFactory or browser storage.

## Verification and acceptance

Test disabled mode makes zero hub requests, fake start/stop, event unsubscribe, coalesced reload, reconnect reload behavior, route remount, logout and actor switch. Verify stale fake events cannot reload or repopulate another actor's private state.

Deliver adapter/interface documentation, fake-backed tests and a future activation checklist. Completion means readiness, not a live connection. Stop for approval before Part 13.
