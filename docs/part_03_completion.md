# Part 03 completion report

Date: 2026-10-29. Status: **Approved**. The owner explicitly stated "Ok, Approved. Now, let's navigate to the next part." and requested Part 04. Prerequisite satisfied: the owner previously approved Part 02 and requested `$implement-brouj-frontend-part part_03`. This report records the Part 03 implementation scope.

## Implemented behavior

1. **Wire types and paths:** generated 83 reachable body/query/DTO shapes, success/failure envelopes, pagination, and seven numeric enums from the verified backend inventory. Full body properties remain explicit, including nullable values; defaulted/nullable query filters may be omitted except required members. API paths are separate from browser routes and encode identifiers. Arbitrary absolute request URLs, inline query strings and normalized traversal are rejected.
2. **Single transport:** only `src/API.tsx` imports/creates Axios at runtime. Its application instance uses the validated HTTPS origin, credentialed cookies, a 15-second timeout, explicit proof headers and one interceptor pair. Automatic cookie-XSRF discovery is disabled. HMR disposal removes interceptors, invalidates proof and rejects old pending work. No bearer storage, DTO persistence, React import, navigation or automatic refresh/retry is introduced.
3. **Fail-closed CSRF:** Security service bootstrap reads `response.data.data.requestToken`. Unsafe calls share one pending bootstrap, while GET/HEAD/OPTIONS do not require proof. An internal marker prevents recursion. Independent cancellation preserves other waiters; canceling the last waiter aborts bootstrap. Generation invalidation immediately rejects old waiting writes and prevents late proof caching, including adapters that ignore abort. Dispatch checks close the gap after interceptors/body transformation. Old private read results cannot cross identity generations.
4. **Complete services:** all **101 business operations** in 16 feature families use actual methods/routes, approved query keys, full PATCH bodies and unwrapped domain results. Unit detail/update/delete retain query `projectId`. GUID mutation results are returned. Reads accept AbortSignal; mutations accept it too without assuming cancellation means rollback.
5. **Multipart:** image creation sends a File with only approved AltText/Description metadata. Null metadata is omitted. The browser supplies the boundary; uploads are neither JSON-stringified nor assigned a blanket Content-Type. JSON metadata changes remain separate operations.
6. **Normalized failures and presentation:** feature failure envelopes, Problem Details, malformed responses, network/timeout/cancellation and unknown errors produce ApiFailure-compatible ApiError values. Recognized feature codes have safe Arabic/English presentation outside transport; unknown codes get a generic local message. Raw server message/detail and Axios config are not copied. Bounded field dictionaries and safe diagnostic traces are retained where appropriate. Retry-After supports delay/date values and manual retry decisions on 429; no retry is scheduled.
7. **Session coordination boundary:** plain modules expose proof invalidation/generation and a disposable current-generation 401 observer. Auth calls opt out and bootstrap errors do not masquerade as business-request 401s. Identity-changing attempts invalidate proof after dispatch. Part 04 will coordinate expired-access refresh, identity changes and any narrowly bounded recovery.

The approved Tailwind design, fonts, layered palette, 16px corners, fades, interval notifications and shimmer UI are unchanged. Common UI and errors resources remain bilingual.

## Changed files

| Area | Files |
|---|---|
| Transport and security | `src/API.tsx`, `src/Security/csrf.ts`, `authenticationFailures.ts`, `src/Services/Security.ts` |
| Wire contracts and paths | `src/Types/contracts.ts`, `failures.ts`, `transport.ts`, `src/Router/routePaths.ts` |
| Feature services | `src/Services/{CustomerAuth,StaffAuth,CustomerProfile,StaffProfile,StaffAdmin,CustomersAdmin,Cities,Areas,Projects,Units,Reservations,Orders,TimePlans,Templates,Terms,ActivityLogs}.ts`, `query.ts` |
| Generation and development | `scripts/generate-services.mjs`, package scripts; Vite eagerly optimizes Axios before lazy service imports |
| Safe bilingual errors | `src/i18n/apiFailures.ts`, `resources.ts`, Arabic/English `errors.json` |
| Verification | `tests/unit/api-transport.test.ts`, `service-contracts.test.ts`, `api-failure-presentation.test.ts`, architecture test setup; `tests/browser/transport.spec.ts` |
| Documentation | Master approval/status, Part 02 approval, README, shared UI guide, [transport guide](api-services.md), wire-contract notes, this report |

No dependency versions changed. The live JSON matrix, schemas and source fingerprints matched before regeneration; only Markdown table formatting was stale. Regenerating the matrix corrected that formatting without changing endpoint contracts or backend source.

## Verification

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 business operations, one CSRF endpoint, 87 inventoried schemas, seven numeric enums, zero discrepancies against current backend source. |
| `npm run services:check` | PASS: 101 generated typed operations, 83 reachable wire shapes, seven numeric enums. |
| `npm run typecheck` | PASS; also passed inside the final production build. |
| `npm run lint` | PASS, zero errors/warnings. |
| `npm test -- --maxWorkers=2` | PASS: **13 files, 211 tests**, zero failed/skipped. Includes 155 new transport/service/presentation cases and 56 existing checks. |
| `npm run build` | PASS, 78 modules; approved fonts/artwork retained and welcome route remains lazy. |
| `$env:NODE_USE_SYSTEM_CA = '1'; npm run test:browser -- --workers=2` | PASS: **18 tests**, zero failed/skipped, 1440x1000 desktop and 375x812 mobile CSS viewports. Includes four native-browser transport cases and the 14 existing bilingual UI checks. Certificate verification stays enabled. |
| Production architecture / whitespace | PASS: runtime Axios import/creation occurs only in API.tsx; source CSS stays under Styles; no internal showcase route, sample email or browser-proof fixture in production JS; git diff --check passes. |

The adapter suite exercises real service functions, serialization, interceptors and normalization rather than substituting service returns. All 101 operations are compared with the verified matrix, including route encoding, body/query separation, credential/proof metadata, multipart fields and GUID results. Concurrency tests include canceled bootstrap waiters, late ignored-abort responses, generation changes, invalid proofs and fail-closed bootstrap failure. Error tests cover both shapes, malformed bodies, missing data, safe traces, network/cancellation/timeout and Retry-After.

Browser transport cases use native Axios/XHR over trusted localhost HTTPS with a mocked API origin. They verify an HttpOnly/Secure fixture cookie, X-CSRF-TOKEN, native multipart boundary and exact fields, domain GUID result, no proof in storage, exposed Retry-After, and Arabic/English local messages. Existing bilingual/shared-control browser checks remain part of the full run. No new feature screen was needed.

Initial runs identified cold development dependency optimization reloading the page during its first service import; explicit Axios optimization resolved it. The existing architecture test also hit its five-second assertion deadline while loading ESLint configuration. Configuration now warms once in a bounded setup hook; every rule assertion and its expected outcomes remain intact.

## Boundaries and review state

This phase validates contracts through live source inspection and adapter/network mocks. It does not claim a real database login, refresh, logout, upload or business mutation. No backend files, database, credentials, cookies in a real account, deployment or production data were changed. Browser certification is Chromium desktop/mobile; Firefox/WebKit and screen-reader playback are not claimed.

Deployment configuration, initial staff provisioning, currency, backend capacity/cache limitations and the media identifier-to-delivery contract keep their existing boundaries. AuthSessionDto still has no bearer credentials or role, and expiresAt remains refresh-session expiry. Part 04 must invalidate proof before known identity/expired-access refresh transitions and own session recovery.

All required Part 03 checks passed. The owner explicitly approved Part 03 and requested Part 04 on 2026-10-29; the master ledger records that approval.
