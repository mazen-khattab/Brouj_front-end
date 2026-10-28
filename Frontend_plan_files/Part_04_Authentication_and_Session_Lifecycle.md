# Part 04 - Authentication and session lifecycle

## Objective and prerequisite

Prerequisite: Part 03 approved. Implement one active customer or staff session with secure lifecycle coordination. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Define AuthContext state as bootstrapping, anonymous, customer, staff or unavailable. Customer includes the current customer DTO; staff includes UserDto and Admin/SuperAdmin role. Do not derive role from login metadata or decode inaccessible HttpOnly JWTs.
2. Build a plain TypeScript session coordinator consumed by API.tsx and AuthContext. It owns a shared refresh promise and monotonic session generation. Providers subscribe/unsubscribe; API.tsx does not import React contexts.
3. On reload, call profile services with automatic refresh disabled. Probe the selected actor profile first, then the other only after a definitive identity mismatch/unauthenticated response. A network/5xx failure gives an unavailable/retry state, not an assumed logout.
4. If both profiles fail to identify an actor, attempt refresh only for a persisted selected-actor hint (customer or staff). The hint is non-sensitive navigation metadata, never authorization. Without a hint stay anonymous; do not try both refresh endpoints. After refresh, fetch fresh CSRF and the appropriate profile.
5. Implement customer registration/login and staff login using actual inputs/validators. Before changing identities, require logout of the current session through the appropriate endpoint. Block conflicting actor switches and in-flight mutations during transitions.
6. After login/registration success, clear old private state, invalidate proof, fetch an identity-bound proof, hydrate profile, persist actor hint, and publish a session-change notification. If hydration fails, offer safe retry rather than showing fabricated authenticated data.
7. For a definitive 401 from an eligible authenticated request, coordinate one refresh for the active actor and replay once after fresh CSRF. Exclude login/register/refresh/logout, profile probes and already-replayed requests. Never refresh on 403, generic 400, network failure or 409.
8. Refresh itself fetches a current proof first, because expired access credentials may make the request anonymous. After refresh, invalidate/fetch proof again because authentication has changed. Do not schedule access-token refresh from AuthSessionDto.expiresAt: it represents refresh-session expiry.
9. Serialize refresh across tabs using the Web Locks API where supported; after acquiring the lock, probe the profile to detect a session refreshed by another tab. Use BroadcastChannel, with storage-event fallback, for invalidation notifications containing no credentials or profile data. Without cross-tab lock support, disable automatic refresh and request sign-in on expiry rather than race rotating tokens.
10. On definitive refresh rejection, stop retries, clear private state/hints/proof, and expose sign-in. On uncertain refresh network outcome, pause writes and offer sign-in; do not blindly repeat a potentially rotated refresh token.
11. Logout calls the active actor's logout service before clearing the established local session. On failure show that server logout was not confirmed and allow retry; do not claim cookies were revoked. On success clear state, increment generation, notify tabs, fetch anonymous CSRF and prevent late responses from restoring data.

## Interfaces and UX

Implement useAuth with actor, status, loginCustomer, registerCustomer, loginStaff, logout and retryBootstrap actions. Use only the service layer for HTTP. Credential fields stay in component memory and are cleared after success/unmount. Do not log form inputs.

Create localized authentication forms as reusable pages ready for routing in Part 05. Registration does not imply a terms-acceptance API field unless the actual contract includes one.

## Verification and acceptance

Verify anonymous bootstrap, active customer/staff restoration, refresh expiry, concurrent 401s, wrong actor hint, absent hint, profile 5xx, invalid credentials, SuperAdmin hydration, login/logout CSRF rebinding and delayed responses after logout. Test tab coordination and unsupported-lock fallback.

Use real HTTPS backend/browser verification for cookie transport, expiry/refresh and logout; mocked cookies cannot prove SameSite/Secure behavior. Do not invent credentials or provision privileged users automatically.

Deliver session state diagram, focused tests, real-backend evidence or an explicit environment dependency, and completion report. Part 05 requires approval.
