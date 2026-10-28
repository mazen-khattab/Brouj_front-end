# Part 03 - API services and CSRF

## Objective and prerequisite

Prerequisite: Part 02 approved. Establish the only HTTP transport and typed service foundation. Use the Part 01 contract matrix and [master conventions](00_Master_Index.md).

## Ordered implementation

1. Define TypeScript response, pagination, feature error, Problem Details and feature DTO/input/query types under Types. Match camelCase JSON and actual enum encoding; distinguish optional from nullable fields.
2. Create src/API.tsx as the only runtime Axios import/configuration/instantiation site. Configure validated API base URL, withCredentials: true, finite timeout and interceptors once. Avoid module hot-reload accumulation. No bearer token storage or Authorization header is required for browser cookie auth.
3. Create apiPaths endpoint builders in routePaths.ts, grouped separately from browser routes. Encode route segments and use Axios params for approved query fields. Do not accept arbitrary absolute request URLs from forms.
4. Implement a Security service for GET /api/v1/auth/csrf. Read response.data.data.requestToken and keep the proof only in memory. Deduplicate concurrent bootstrap calls. Use an internal request marker to prevent the CSRF request recursively bootstrapping itself.
5. Before every non-safe request, await a valid proof and set X-CSRF-TOKEN. Safe methods are GET, HEAD and OPTIONS. Include authentication and multipart mutations. Export token invalidation through a plain module interface for the session coordinator; reject proofs from a previous session generation.
6. Implement typed service functions for the full contract matrix, grouped by feature. Services return domain response data and throw normalized errors; accept AbortSignal on reads. Preserve query projectId where required and full update bodies for PATCH.
7. Let the browser/Axios set the FormData multipart boundary. Send only File and approved AltText/Description fields. Never stringify FormData or set a blanket JSON Content-Type for uploads.
8. Normalize errors into an ApiFailure interface with kind, status, featureCode, fieldErrors, retryAfter and safe diagnostic trace where available. Kind distinguishes feature, transport, network, canceled and unknown. Localize presentation outside transport.
9. Reserve an authentication-failure callback/coordinator interface for Part 04. Transport must not import AuthContext or navigate. Add request metadata for authenticated requests and refresh opt-out without triggering refresh yet.

## Error and retry policy

Success is {success,data,message}; feature failure is {success:false,code,message,errors}; Problem Details is a different shape. Do not blindly assume data or errors exists. Display recognized feature codes using localization and a generic safe fallback for unknown codes. Never surface raw stack traces.

No general automatic mutation retries. Generic 400 cannot establish CSRF failure. Bootstrap failure stops a pending unsafe request before sending it. Invalidate stale proof on known identity changes. Part 04 will define a narrowly bounded replay after a definitive 401. Respect Retry-After on 429 and expose a manual retry state.

Public API responses are no-store; do not introduce persistent/browser storage caching of DTOs.

## Verification and acceptance

Mock transport at the adapter/network boundary, not service return values alone. Test concurrent first writes use one bootstrap; safe reads do not need proof; login/logout/refresh/uploads attach it; canceled bootstrap and generation changes cannot release stale writes; unsafe calls fail closed on bootstrap failure. Test both error shapes, network cancellation, malformed error bodies and Retry-After.

Check service method/path/query/body mapping against the contract inventory, including GUID mutation results. An architecture scan must find no runtime Axios import/axios.create outside API.tsx.

Deliver typed services, transport tests and completion report. Stop for approval before Part 04.
