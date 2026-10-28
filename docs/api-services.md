# API transport and services

Implemented in Part 03, with Part 04 session integration. See [authentication and lifecycle](authentication.md) for the coordinator, context, cross-tab locking and bounded 401 replay. Other feature pages remain in their own phases. The approved Part 02 design is unchanged.

## Ownership and contracts

`src/API.tsx` is the only runtime Axios import and creation site. Services use its `apiRequest` facade, not an Axios instance or arbitrary request configuration. The application owns one transport. `createApiTransport` accepts an adapter and isolated security/channel objects for tests; production services use the single module instance. HMR disposes that instance, ejects its interceptors and invalidates its proof before replacement.

The transport uses the validated HTTPS API origin, credentials, a 15-second request timeout and explicit CSRF headers. Axios automatic cookie-based XSRF discovery is disabled. There is no Authorization header, cookie reading, browser credential storage, DTO cache, navigation or React dependency. There are no general retries; Part 04 permits one replay only after definitive eligible 401 recovery through the plain session boundary. A bootstrap and its following write each have a finite timeout.

`src/Types/contracts.ts`, the API portion of `routePaths.ts`, and 16 feature service modules are generated as explicit TypeScript from the verified contract inventory. Run:

```powershell
npm run contracts:check
npm run services:check
# After reviewing a real contract change:
npm run contracts:update
npm run services:generate
```

The generator fails unsupported C# types and writes no backend files. Its 83 reachable wire shapes exclude internal stream-based UploadInput. It also supplies success/failure envelopes, pagination and all seven numeric enum definitions. Nullable values use `| null`; response fields and complete body shapes remain required. Query defaults and unused nullable filters are optional, except explicit required members. Template `isActive` is a required nullable query member; `null` omits that filter rather than becoming false. Live missing/null model-binding behavior remains a backend integration check, not an invented default.

The generation check compares source text, so keep generated files unformatted or regenerate them after tooling changes. API route builders encode segments and reject empty/dot traversal or invalid Unicode. Requests reject absolute URLs, inline query/fragment strings and normalized traversal. Services whitelist query keys and use Axios params, preserving false/zero. PATCH sends the full typed body. Mutation functions return GUID data rather than discarding it.

## Calling a service

```ts
import { getUnitById, updateUnit } from '../Services/Units';
import type { UnitInput } from '../Types/contracts';

const cancel = new AbortController();
const unit = await getUnitById(
  { id: unitId, query: { projectId } },
  { signal: cancel.signal },
);
const savedId = await updateUnit(
  { id: unit.id, query: { projectId }, body: completeUnitInput satisfies UnitInput },
  { signal: cancel.signal },
);
```

Signal and the explicit session-coordinator control/recovery opt-out flags are forwarded from request options. They cannot override method, URL, body or arbitrary Axios configuration. Profile probes and auth endpoints always opt out of automatic recovery. Bodies never include route identifiers unless the backend body explicitly contains them. All feature operations keep their matrix-mapped functions and policies.

Image services accept `{ body: { file: File, altText: string | null } }`, or description for stage-item images, plus their route arguments. They create FormData with File and only the approved AltText/Description field. Null metadata is omitted. The browser chooses the multipart boundary; no blanket JSON or multipart Content-Type is supplied. JSON metadata updates remain separate. Backend file size/type/signature rules still apply. A returned imagePath is not a public URL; this phase provides no media delivery resolver.

## CSRF and identity generations

Unsafe requests await one shared `GET /api/v1/auth/csrf`, read `response.data.data.requestToken`, and attach X-CSRF-TOKEN. GET/HEAD/OPTIONS do not bootstrap. An internal marker identifies bootstrap and prevents recursion. Proof is only in memory; invalid/malformed bootstrap stops the unsafe request.

Each waiter can cancel independently. One canceled waiter does not stop others; the last canceled waiter aborts bootstrap. A discarded or late bootstrap cannot enter the cache. `invalidateCsrfProof()` advances a generation, clears proof and aborts pending bootstrap. Waiting writes from the old generation reject, even if an adapter ignores abort. Generation and cancellation are checked again at dispatch after interceptors and body transformation. Old private read results are also rejected after a generation change.

Register/login/refresh/logout/password-change requests invalidate proof after reaching dispatch, including uncertain/failed outcomes. The next unsafe request bootstraps a fresh proof. This conservative invalidation does not mean the mutation succeeded. Canceling a dispatched mutation does not prove it did not commit, and the transport never replays it.

The Part 04 coordinator consumes the plain proof invalidation boundary before known identity transitions and expired-access refresh, then obtains fresh proof after cookie identity changes. It controls request admission/cancellation and a separate monotonic identity epoch through sessionBoundary. It does not schedule refresh from expiresAt or decode cookies/tokens.

`authenticationFailures.subscribe(listener)` remains an optional disposable failure observer. The plain sessionBoundary now coordinates eligible current-identity 401 recovery before a final failure is returned. Auth endpoints, profile probes, session-control and already-replayed calls are excluded. Bootstrap failures are not attributed to a business request. Listener/recovery failures cannot expose raw diagnostics. API.tsx still performs no navigation or React state management.

## Failure presentation

Every service rejects with `ApiError`, implementing `ApiFailure`: kind (`feature`, `transport`, `network`, `canceled`, `unknown`), optional-valued status/featureCode/retryAfter/diagnosticTrace and a fieldErrors dictionary. Both numeric feature failures and Problem Details are handled; malformed bodies remain safe failures. Error messages are fixed and never copy server message/detail, exception causes, request bodies or Axios config. Field dictionaries are bounded and filter malformed/control/stack-like values; 5xx fields are discarded. Trace identifiers accept only a bounded safe character set. Callers should map field names to their local validation descriptors, rather than displaying arbitrary server strings.

`apiFailureMessage(failure)` supplies an errors-namespace translation descriptor for recognized numeric feature codes, status conditions or a generic fallback. Unknown feature codes always use the generic local message. All descriptors have Arabic/English resources. Cancellation usually needs no user notification; the caller chooses presentation. Never render raw unknown messages or HTML.

429 exposes Retry-After as nonnegative seconds, parsed from a delay or HTTP date when available through CORS. The live backend exposes this header. Callers may show the localized retryAfter descriptor and offer manual retry after waiting. No automatic retry is scheduled, including for generic 400, network failures, 401 or 429.

## Verification boundary

Unit tests substitute the adapter while keeping actual services, serialization, interceptors and normalization. They cover every business operation and generation/cancellation races. Trusted-HTTPS Chromium tests intercept the API origin without calling the real backend: they verify native cookie credentials, CSRF, browser multipart boundaries, GUID results and exposed Retry-After with bilingual local messages. Real database/session/mutation verification is not claimed. Target environment budgets, credentials, media delivery and initial staff provisioning remain external deployment inputs.
