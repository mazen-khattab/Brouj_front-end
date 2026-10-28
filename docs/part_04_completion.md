# Part 04 completion report

Date: 2026-10-29. Status: **Approved** by the user in the Part 05 invocation, with the explicit real-backend verification dependency below. Part 03 was approved by the owner before this phase. Its report and the master ledger record that approval. This report describes Part 04 at its handoff; subsequent routing work is recorded in the Part 05 report.

## Delivered

- AuthContext/useAuth expose bootstrapping, anonymous, customer, staff and unavailable states. Profiles establish identity and staff role; login metadata and persisted hints do not. The root provider subscribes safely under StrictMode.
- A plain coordinator owns identity generation, a shared refresh promise, refresh revision, cancellation and transition state. API.tsx consumes only a plain boundary, with no React/service dependency cycle. New writes are blocked during transitions; existing business writes prevent conflicting logout/identity switches.
- Reload probes the selected profile first, then the other only after definitive mismatch/unauthenticated results. Wrong hints are corrected by server profiles. Network/5xx failures remain unavailable with retry. Without a hint, no refresh actor is guessed.
- Customer login/registration and staff login use actual six-field/two-field inputs and live validator rules. Existing actors must log out before replacement. Login success rebinds proof and hydrates the matching profile before authentication is published. Failed hydration remains unavailable. Credentials stay in form/action/request memory, are aborted on form unmount and cleared on success/identity changes; no credentials/profile/token/proof persistence or logging was added.
- Eligible protected 401s share one refresh and permit at most one replay. Auth operations, profile probes, session-control and already-replayed requests are excluded. Generic 400, 403, 409, 429, network and 5xx errors never trigger request recovery. Refresh rebinds CSRF before and after cookie rotation and fetches the matching profile. expiresAt never schedules access refresh.
- Web Locks serialize cross-tab refresh/transitions. A profile probe after lock acquisition recognizes a peer's completed refresh. BroadcastChannel and storage fallback send only random IDs and invalidation kinds. Unsupported/denied locks fail closed; automatic rotation is disabled when locking is unavailable. A different/invalidated identity cannot receive old replay or private responses.
- Definitive refresh rejection clears local private state/hint/proof and offers sign-in. Uncertain renewal pauses writes and does not blindly repeat rotation; retry probes safely. Logout calls the active actor endpoint before clearing established state. Failure explicitly retains the actor and says server logout was not confirmed. Confirmation clears state, notifies tabs, requests anonymous proof and prevents late data restoration.
- Three localized reusable authentication pages are available at the development-only `/__auth` preview. The approved Manrope/Arabic fonts, layered brand palette, 16px corners, fades and shimmer are retained. Production authentication routing/guards remain Part 05. Old private notices clear without remounting failed-login forms.

The [authentication guide](authentication.md) includes the state diagram, transition rules and cross-tab/transport contract. The [real-backend verification document](session-verification.md) gives the explicit environment dependency and manual verification steps.

## Main files

| Area | Files |
|---|---|
| State/coordinator | `src/Types/auth.ts`, `src/Security/sessionCoordinator.ts`, `sessionBoundary.ts`, `sessionPlatform.ts` |
| Service composition | `src/Services/session.ts`; regenerated feature services/paths for session-control and recovery opt-out metadata |
| Transport | `src/API.tsx`, `src/Types/transport.ts`, optional failure-channel comment |
| Root context | `src/Context/AuthContext.ts`, `AuthProvider.tsx`, `src/Hooks/useAuth.ts`, `main.tsx`; private notice cleanup in ToastProvider |
| Pages/resources | `src/Pages/Auth/*`, development AuthPreview/router entry; Arabic/English auth resources and namespace registration |
| Generation | `scripts/generate-services.mjs` preserves endpoint/body/query mappings while adding explicit internal options; all 101 mappings remain tested |
| Tests | Coordinator, transport integration, validation, form state and notice tests; authentication browser cases and existing browser bootstrap fixtures |
| Evidence/docs | This report, state/verification guides, README, shared UI/transport guides, prerequisite approval and master status |

No dependency versions, backend files, actual accounts, database records, certificates, production data or deployment were changed. Generated files were regenerated after metadata changes; no endpoint/DTO/policy was invented.

## Checks

| Check | Result |
|---|---|
| `npm run contracts:check` | PASS: 101 operations, one CSRF endpoint, 87 inventoried schemas, seven numeric enums, zero live-source discrepancies. |
| `npm run services:check` | PASS: 101 generated typed operations, 83 reachable shapes and seven numeric enums. |
| `npm run typecheck` | PASS, including the final strict production build. |
| `npm run lint` | PASS, zero errors/warnings. |
| `npm test -- --maxWorkers=2` | PASS: **18 files, 256 tests**, zero failed/skipped; 45 new session/validation/privacy cases plus the 211 existing checks. |
| `npm run build` | PASS: 153 modules; welcome remains lazy and approved fonts/artwork are retained. |
| Trusted-HTTPS Chromium, `npm run test:browser -- --workers=2` with system CA enabled | PASS: **36 tests**, zero failed/skipped; all 18 prior UI/transport cases plus 18 authentication cases. CSS viewports are 1440x1000 and 375x812. TLS verification stays enabled. |
| Architecture / production / whitespace | PASS: runtime Axios import/create occurs only in API.tsx; API imports no React context/provider and reads no cookies/storage; sessionPlatform stores only non-sensitive hints/events; source CSS is confined to Styles; no development auth/showcase route or fixture credentials in production JS; git diff --check passes. |
| Actual backend cookie issuance, expiry/rotation and logout | **Environment dependency, not claimed:** port 7249 has no listener, and no dedicated existing account/configuration reference was supplied. See below. |

Unit coverage includes anonymous/customer/staff restoration, SuperAdmin profile hydration, wrong/absent hints, unavailable profiles, concurrent and late 401s, post-lock peer detection, denied/unsupported locks, uncertain/definitive refresh outcomes, login hydration failure, active-actor logout requirements, write blocking, logout retry, late responses, StrictMode and notice/credential cleanup. Real services and the real transport are exercised against an adapter for bounded replay and independent cancellation; service return values alone are not the integration boundary.

Browser coverage uses an intercepted API over trusted frontend HTTPS, with certificate verification enabled. It checks Arabic/English forms at 375px/1440px, locale-sensitive validation without losing edits, registration field mapping, role hydration, credential clearing, unsuccessful logout, native concurrent recovery, two tabs with native Web Locks, BroadcastChannel/storage fallback, unsupported locks and unavailable/retry state. This demonstrates frontend behavior; it does not prove real server cookie/rotation semantics.

## Bilingual visual review

Reviewed Arabic registration and English mobile login captures for typography, spacing, brand layers, field borders, logical layout and readable controls. Automated cases review all three page variants in both languages and widths, including no horizontal page overflow, 16px controls, LTR email entry and translated validation. Architectural artwork is decoded before final capture and retains its orientation.

| Language / CSS width | Customer login | Registration | Staff login |
|---|---|---|---|
| Arabic / 1440 | [Login](evidence/part_04/ar-1440-customer.png) | [Registration](evidence/part_04/ar-1440-register.png) | [Staff](evidence/part_04/ar-1440-staff.png) |
| English / 1440 | [Login](evidence/part_04/en-1440-customer.png) | [Registration](evidence/part_04/en-1440-register.png) | [Staff](evidence/part_04/en-1440-staff.png) |
| Arabic / 375 | [Login](evidence/part_04/ar-375-customer.png) | [Registration](evidence/part_04/ar-375-register.png) | [Staff](evidence/part_04/ar-375-staff.png) |
| English / 375 | [Login](evidence/part_04/en-375-customer.png) | [Registration](evidence/part_04/en-375-register.png) | [Staff](evidence/part_04/en-375-staff.png) |

## Environment dependency and approval

The Part 04 plan allows real-backend evidence **or an explicit environment dependency**. The local configured API was not listening on 7249 during inspection/recheck. No privileged user or credentials were invented. A running configured HTTPS backend and an owner-provided existing dedicated customer/staff account are needed for actual cookie transport, server access expiry, rotation and logout verification. Mocked responses, fixture cookies and native browser locks are not presented as proof of those backend outcomes.

Real-backend checks remain open environment work, with concrete steps in [session-verification.md](session-verification.md). Backend budget/cache/capacity limitations, release currency, initial staff provisioning and media delivery retain their earlier boundaries. Chromium desktop/mobile is covered; Firefox/WebKit and human screen-reader playback are not claimed.

All required frontend checks pass and the allowed environment dependency is explicitly documented. Part 04 was **Approved** by the user on 2026-10-29 in this conversation: "Ok, Approved. Now, let's navigate to the next part." with the Part 05 invocation. The real-backend environment dependency remains recorded above.
