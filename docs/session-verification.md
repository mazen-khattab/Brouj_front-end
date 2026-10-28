# Real-backend session verification dependency

Part 04's frontend checks run with adapters/intercepted API responses. They do not establish real cookie issuance, server token expiry/rotation, revocation or production SameSite behavior.

On 2026-10-29, the configured local API port 7249 had no listening process. No existing dedicated account/configuration reference was supplied. The frontend therefore records the explicit environment dependency allowed by the Part 04 deliverable. No account, privileged user, database, certificate trust setting or backend service was provisioned/changed automatically.

## Required environment

- Run the existing backend HTTPS profile at `https://localhost:7249` with its actual SQL/storage/signing, origin, payload/depth/rate and cookie configuration. Follow the backend Part 8 API configuration handoff; do not invent deployment budgets or copy secrets into VITE variables.
- Supply trusted frontend/backend certificates and keep the approved credentialed HTTPS topology. Retain TLS verification, exact CORS origins and cookie security settings.
- Use an owner-provided existing dedicated customer account. Staff/SuperAdmin verification needs an existing authorized staff account; do not bootstrap privileged users for this check.
- Keep credentials out of source, screenshots, logs, trace archives and command-line arguments. Perform the manual flow in a clean browser profile/context.

## Manual checks to record

1. Open the frontend development `/__auth` review. Confirm initial unauthenticated profile probes and anonymous state without a hint. Confirm an API/network outage exposes retry rather than an assumed anonymous identity.
2. Sign in with the dedicated customer. Inspect actual backend-issued cookies in browser tooling for host-only scope, Secure, HttpOnly, path `/` and SameSite Strict. Verify application JavaScript contains no cookie-reading/storage code. Record only flag/status outcomes, not cookie values or identifiers.
3. Verify CSRF precedes the unsafe login and is rebound afterward, followed by the actual customer profile. Reload and verify customer restoration; repeat for an authorized staff account and verify its actual role from the profile.
4. Let the backend access credential expire according to its actual lifetime. AuthSessionDto.expiresAt is not that deadline. Trigger concurrent protected requests and verify one appropriate refresh, fresh CSRF/profile and one replay at most. Repeat from two tabs and confirm a tab waiting for the lock recognizes the peer's refresh.
5. Verify definitive refresh rejection offers sign-in, while a deliberately interrupted refresh outcome pauses writes and is not blindly retried. Without Web Locks, verify there is no automatic rotation.
6. Sign out. Confirm the server response clears/revokes the current session, anonymous proof is requested, another tab invalidates, and late private responses cannot restore data. A failed/interrupted logout must retain the established actor and state that server logout was not confirmed.
7. Verify the matching backend integration/security logs and database session outcomes using the existing backend runbooks, without copying raw credentials/private payloads into frontend evidence.

Record date, environment/configuration reference, actor kinds tested, pass/fail outcomes and unresolved items in the completion report when this is performed. Mocked cookie fixtures or manually deleting a cookie may simulate frontend expiry handling; they must not be described as proof of actual server expiry or rotation.
