# Verified backend wire contracts

Verified on 2026-10-28 against the backend revision in [api-ui-matrix.json](api-ui-matrix.json). The frontend matrix reconciles all 101 business controller actions with the Part 8 JSON/Markdown inventory. CSRF is a separate supporting endpoint. No backend source was changed or live business data requested.

Use [api-ui-matrix.md](api-ui-matrix.md) for UI ownership, [backend-schemas.json](backend-schemas.json) for exact source types, nullable fields, defaults and validation rules, and [source-manifest.json](source-manifest.json) for normalized source hashes. Schema records describe C# types, not generated TypeScript or a replacement JSON Schema. Shared internal `UploadInput` is included as source context; browsers send the transport `IFormFile` field, never a JSON stream. `requiredMember` records C# declarations; actual acceptance also depends on MVC binding and the recorded validators. A missing initializer means CLR defaults, not an invented optional-field guarantee.

Run `npm run contracts:check` with the backend checkout available. If source changes, inspect differences before `npm run contracts:update`; the latter writes only frontend documentation. Override the local backend location with the server-only `BROUJ_BACKEND_ROOT` process variable. The verifier checks the live route/method, DTOs, policy, response/status and rate category; reads requests, handlers and validators; fingerprints relevant sources; and detects stale generated evidence. Its parser intentionally supports the current explicit C# controller/class style, not arbitrary C# or runtime integration. A changed count or unsupported declaration needs review.

## JSON, nullability, enum values

ASP.NET Core MVC uses System.Text.Json web defaults (camelCase property names), with `UnmappedMemberHandling.Disallow` and the deployment-supplied JSON depth limit in `ApiServiceExtensions.cs`. There is no string-enum converter or custom converter in the current backend source. JSON enum values are **numbers**, despite database enum string storage. Do not send translated labels or database strings. Query enum filters should use numeric values as well; do not depend on permissive name binding. The exact additional `FeatureErrorCode` values are captured in the schema inventory.

| Enum | Numeric JSON values |
|---|---|
| ProjectType | Regular = 0; Initiative = 1 |
| UserRole | SuperAdmin = 0; Admin = 1 |
| ReservationStatus | Processing = 0; Cancelled = 1; Confirmed = 2 |
| OrderStatus | Pending = 0; Processing = 1; Completed = 2; Cancelled = 3 |
| PlanStageItemStatus | Pending = 0; Processing = 1; Completed = 2 |
| ActivityAction | Created = 0; Updated = 1; Deleted = 2 |

Nullable values retain JSON `null`; no null-ignore option is configured. For example `UnitDto.neighborMeterPrice` and `percentage`, `OrderDto.completedAt`, image `altText` and relevant schedule dates are nullable. `AuthSessionDto` contains only `actorId` (GUID string) and `expiresAt` (DateTimeOffset string); it has no role or access/refresh token. Hydrate actor/profile state through the documented customer/staff profile operations in their assigned phases.

## Envelopes, errors, pagination

Successful business operations return `{ "success": true, "data": ..., "message": null }`, with the matrix's 200/201 status. Mutation data is usually a GUID string; a successful DELETE does not imply a 204/no-body response. CSRF returns the same envelope with `data.requestToken`.

Application failures use `{ "success": false, "code": <numeric FeatureErrorCode>, "message": "...", "errors": null }`; `errors`, when present, is a field-to-string-array dictionary. `ApiControllerBase` maps Validation/Unauthorized/Forbidden/NotFound/Conflict to 400/401/403/404/409. Binding, unsupported body formats, request limits, rate rejection and unexpected failures can instead return safe Problem Details. Handle both shapes, including validation failures before the handler. Do not expose raw unknown exception content in UI. A 429 exposes `Retry-After`; do not replay a mutation solely because a connection was cancelled or interrupted.

List data is `{ items, pageNumber, pageSize, totalCount, totalPages }`, inside `data`. Page numbers are 1-based; transport defaults are pageNumber 1/pageSize 20. Validators limit pageSize to 1–100; zero results produce totalPages 0. Nullable filters are omitted when unused. Template list parameters include nullable `isActive` with a C# `required` declaration; preserve the current binding contract and verify missing/null behavior during transport integration. Do not silently reinterpret it as an always-false filter.

## Requests and validation

Unknown JSON members are rejected. PATCH accepts the full approved update DTO, not JSON Patch or arbitrary partial object properties. Do not send route identifiers in JSON unless the body DTO explicitly contains them. Unit detail, update and deletion require **query `projectId` and route `id`**. Catalogue public reads also serve Admin lists; do not invent parallel admin GET endpoints.

DateTimeOffset values serialize as ISO 8601 strings with an explicit offset/UTC indicator; preserve offsets at boundaries. Form controls must deliberately convert local input when their phase is implemented. Nullable draft dates can still be required by validators: e.g. stage delivery dates and item due dates are `DateTimeOffset?` in inputs but receive `.NotNull()` validation; a Completed stage item additionally requires confirmedDate. Render business dates using Gregorian calendar formatting as the master specifies.

Decimal properties are JSON numbers, not currency strings. `meterPrice` accepts decimal(19,4), `size` decimal(18,4), with nonnegative price and strictly positive size; `neighborMeterPrice` is nullable/nonnegative. `Pricing.Total` rounds upward to two decimal places using decimal arithmetic and enforces the supported maximum. JavaScript Number is not exact decimal arithmetic: display authoritative server totals and do not create payment/business calculations from floating-point approximations. Garage price is currently zero in the approved backend; do not add garage pricing inputs beyond `UnitInput`. Business currency is a separate release configuration input, never inferred from Arabic/English.

The schema inventory includes the full validators, including names/lengths, conditional fields, enum validation, item counts and ordering. Shared rules use Egyptian phone `01[0125][0-9]{8}`, 14 ASCII digits for national ID, and trimmed valid email of at most 254 characters. Registration/new password minimum is 8; existing password inputs are validated separately. Client validation complements the server and must not change its actor/ownership rules.

## Authentication and actor boundaries

One browser has one active actor because customer/staff sessions share the API-host cookie names. Admin and SuperAdmin are staff roles. `AdminOnly` permits both staff roles; `SuperAdminOnly` narrows staff administration. `MemberOnly` permits customers or staff, with live account/ownership checks in Application. Customer order detail deliberately uses `GET /api/v1/admin/orders/{id}`. Project schedules use anonymous `GET /api/v1/projects/{projectId}/time-plan`; all time-plan writes remain staff protected. Neither URL naming nor a UI guard establishes server access rights.

Browser calls must use credentials over approved HTTPS origins: development `https://localhost:5173` to `https://localhost:7249`; production `https://brouj.com` to `https://api.brouj.com`. Cookies are HttpOnly, Secure, host-only, path `/`, SameSite Strict. Never read cookies or store authentication tokens/private DTOs in localStorage. `expiresAt` describes refresh-session expiry, not a reliable access-token timer.

Part 03 now bootstraps `GET /api/v1/auth/csrf` through the sole Axios transport, keeps its proof only in memory, and attaches `X-CSRF-TOKEN` to every unsafe request including auth operations. Identity-changing attempts that reached dispatch invalidate proof; the next unsafe request obtains a new one. A plain generation boundary lets Part 04 invalidate before identity/expired-access refresh transitions. Missing/invalid CSRF or wrong actor may stop a request before its business handler. See [API services](../api-services.md).

## Files, media and release dependencies

Image creation uses multipart/form-data with **exactly one nonempty `File`** and only its approved `AltText` or `Description`. The individual cap is 5 MiB, possibly lower if deployment config requires it; total multipart budget must leave room for headers/fields. Current storage recognizes JPEG (`.jpg`/`.jpeg`), PNG and WebP with MIME/signature validation. Metadata updates use their separate JSON DTOs. Do not add file URL fetch/upload mechanisms.

`imagePath` is a storage identifier, not a deliverable browser URL. The current API does not serve uploads. Optional `VITE_MEDIA_ORIGIN` merely reserves an origin input for a later approved resolver; setting it alone does not establish the mapping from image identifiers to URLs. Later UI phases must use the prescribed placeholders until the owner supplies an approved delivery host/mapping or changed backend contract. Never expose disk paths or concatenate identifiers into guessed URLs.

The owner/deployment must supply business currency, trusted localhost certificates, real API configuration, exact origins, request/depth/rate budgets, and approved media delivery/disposition before the corresponding integration/release checks. Provision initial SuperAdmin through the existing [backend runbook](../../../Brouj/docs/Brouj.Docs/Part10.InitialAdmin.md), then disable bootstrap; frontend code supplies no staff credentials. The backend's [final handoff](../../../Brouj/docs/Brouj.Docs/Part12.FinalVerification.md) retains accepted cache/heavy-query/capacity limitations. Pagination and debouncing do not fix those backend limitations. No payment gateway, password recovery, contact submission, automatic translation, independent dual login or live SignalR hub is authorized.
