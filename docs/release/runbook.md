# Frontend release and rollback runbook

Target topology: `https://brouj.com` → `https://api.brouj.com`. One static SPA artifact, three lazy route areas. This document prepares a release; it is not release approval. Part 13 stays In progress until its real-environment checks and owner decisions are closed. No command below deploys automatically.

## Inputs and approval record

| Required input/check | Current disposition |
|---|---|
| Launch currency | Owner confirmation required. EGP in the development example/local rehearsal is illustrative, not release approval. |
| Media | Placeholder resolver retained. Obtain explicit launch acceptance of missing persisted project/unit/progress photographs, or approve and implement/test a complete HTTPS identifier mapping and access policy. A host alone is insufficient. |
| Real API/test data | Provide the configured HTTPS API and secure references for existing dedicated customer/Admin/SuperAdmin accounts and disposable business test data. No passwords in chat, source, command arguments, traces or screenshots. |
| Staging/hosting | Owner-selected environment, DNS/TLS and host configuration; actual staging header/cache/fallback/rollback verification is pending. |
| Backend deployment | Owners must confirm exact credentialed CORS, secure cookies, SQL and protected Data Protection keys, persistent storage, body/depth/rate budgets, trusted proxies, runtime SQL privileges and initial SuperAdmin provisioning. No guessed budgets or incidental backend setup. |
| Release authorization | Explicit owner release approval after reviewing the final verification result. Packaging, phase approval and a build are not deployment approval. |

Use the [Part 13 verification report](../part_13_completion.md) for current evidence and remaining checks. The [101-operation matrix](api-coverage.md) records frontend consumers with no exclusions; it does not substitute for backend execution.

## Reproducible build and review

Use the pinned Node 24/npm 11 runtime and lockfile. Work from a reviewed source commit. Run `npm ci` in a clean checkout; use the organization's normal dependency registry and trust configuration. Do not introduce secrets into any `VITE_` value.

```powershell
npm run contracts:check
npm run services:check
npm run release:coverage
npm run typecheck
npm run lint
npm test -- --maxWorkers=2
npm run release:test
$env:NODE_OPTIONS='--use-system-ca'
npm run test:browser -- --workers=2
```

The ordinary `npm run build`/`dist` may reflect development dotenv inputs and is not the release artifact. Build the release with explicit process values, which override ignored local inputs. Keep the repository clean: `release:build` rejects uncommitted source. Record public owner decision references only, never secrets or account identifiers.

```powershell
$env:VITE_API_ORIGIN='https://api.brouj.com'
$env:VITE_BUSINESS_CURRENCY='<owner-approved ISO 4217 code>'
$env:VITE_MEDIA_ORIGIN=''
$env:BROUJ_CURRENCY_APPROVAL_REFERENCE='<recorded owner decision reference>'
$env:BROUJ_MEDIA_APPROVAL_REFERENCE='<recorded placeholder launch acceptance reference>'
npm run release:build
npm run release:verify
```

The build has no backend credential input. The current packaging boundary permits placeholder media only; a real media delivery implementation needs a reviewed change to the resolver, CSP, release policy and its tests. Do not set an arbitrary media host to bypass the decision.

Output is `artifacts/release/<timestamp>-<commit>/site/`, with a sibling `manifest.json`. The manifest records source commit/dirty flag, runtime/lock hash, public decisions and sorted SHA-256/size inventory. `latest.json` selects the local artifact; it is not a production alias. The site directory contains the frontend output only; keep the sibling manifest in the private release record. Assets are deterministic for fixed source/dependencies/configuration; timestamped provenance is intentionally different per build. Archive the entire artifact and record its hash using the deployment system. No archive or artifact is uploaded automatically.

`release:rehearse` allows a dirty source tree and omits decision references. Its manifest explicitly marks `rehearsal: true`; it must never be deployed. Local Part 13 uses explicit production API origin and illustrative EGP solely for synthetic fixture display. The build test injects a harmless unrelated public sentinel; artifact verification checks it did not enter output. Static environment property access prevents embedding the whole `import.meta.env` object.

For a local compiled-artifact rehearsal, configure trusted localhost PEM paths outside the repository, then run `npm run release:browser -- --workers=2`. It starts the read-only HTTPS artifact server at `https://localhost:4173`, checks CSP/cache/fallback/deep links/lazy errors and uses synthetic API responses. It does not prove actual API cookies, CORS, SQL or the selected host. Vite `preview` is a local preview tool, not a production server ([Vite deployment guidance](https://vite.dev/guide/static-deploy)).

## Hosting configuration

The [Nginx reference](../../deployment/nginx/brouj.conf.example) is an undeployed example for deployment owners to adapt. A different static host must reproduce the same tested semantics. Actual TLS files, artifact root, installed server version and staging origin remain owner inputs. Run the selected host's configuration validation before switching traffic; Nginx `nginx -t` has not been run in this Windows checkout.

- Serve only `site/` over HTTPS. Retain the exact production frontend/API origins and credentials. Do not proxy the API through the frontend or change backend no-store behavior.
- Rewrite page navigations accepting HTML to `index.html`, including public/account/admin deep links. API/source/hidden/config paths and missing static resources return actual 404s, never SPA HTML. Return correct JS/CSS/font/image MIME types and support HEAD.
- Successful hashed `/assets/` resources get `public, max-age=31536000, immutable`. HTML gets `no-cache` so it revalidates. Missing resources/errors get `no-store`, including missing hashed assets. Never apply a year-long cache lifetime to asset errors.
- Apply CSP, nosniff, frame denial, no-referrer and Permissions-Policy to successful and error responses. Enable HSTS on the real HTTPS frontend after confirming the selected host; the reference uses a one-year host-only policy, without includeSubDomains/preload. Local rehearsal does not alter HSTS state.
- The CSP permits bundled scripts/styles, self-hosted fonts including build-inlined `data:` font subsets, same-origin resources and the explicit API. Image `blob:` supports local upload previews; it does not make storage identifiers public. `style-src-attr 'none'` works with React's direct CSS property assignments, which are permitted independently of setting style attributes ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr)). No external analytics, inline scripts, eval or remote fonts are enabled.
- Nginx `add_header` inheritance can be replaced by a location's own headers. The example keeps every header at server scope and derives caching with a status-aware map ([Nginx documentation](https://nginx.org/en/docs/http/ngx_http_headers_module.html)). Verify behavior behind the real CDN/proxy too; avoid duplicate conflicting policies.
- Log only status, duration, byte count and a safe request trace ID at the frontend edge. The example omits raw paths/queries, IP/referrer/cookies and bodies; request-level error logging requires an approved redaction pipeline. Application console logging is prohibited by ESLint. Keep backend diagnostics under its existing redaction/no-store policies.

Do not expand CSP origins until an actual approved media mapping or host integration needs them. Test the final policy with every route, preview, dialog, font, dynamic error and reduced-motion mode in staging.

## Staging smoke checklist

Record environment/configuration reference, artifact ID, source/lock hash, date, actor kinds and pass/fail only. Disable browser trace/video and mask screenshots for real credentials/PII. Test against dedicated disposable data; keep values in the approved secure account configuration.

1. Check TLS trust without bypass; exact CORS credentials; frontend headers and HTML/asset/error cache rules. Reload public/account/admin deep links; request a missing JS/CSS asset and hidden path; verify real 404/no-store/MIME behavior.
2. Customer registration/login, profile restore/update, correct/wrong password change, browse/filter/unit details, confirmed reservation creation/cancel, own order and member time plan, sign-out. Confirm actual server-issued Secure/HttpOnly/host-only/Strict cookies, identity-bound CSRF and logout revocation. Never record cookie/proof values.
3. Let actual access credentials expire according to backend lifetime. Trigger concurrent 401s and two-tab refresh coordination; verify one safe refresh/replay, delayed-response cancellation and logout/actor/private-state cleanup. Test unavailable Web Locks and interrupted refresh/logout without blind replay. Do not substitute manually deleting cookies for expiry evidence.
4. Staff catalogue CRUD, amenities and image upload/metadata/delete; customer soft-delete/restore; bodyless reservation conversion and supported initiative completion. Re-read server totals/statuses. Check conflicting/uncertain results without repeated writes.
5. Plan/stage/item/image hierarchy and sibling ordering, template application and activation/assignments; immutable terms creation/activation with public refresh; bounded audit read/detail; SuperAdmin staff CRUD/soft-delete/restore. Confirm Admin/customer direct route **and real API** denial, ownership-scoped 404 and live role/account changes.
6. Send missing/invalid CSRF to the real backend with dedicated data and verify rejection before mutations. Distinguish business/binding 400, auth 401/403, stale 409, upload 413/415, throttling 429/Retry-After and network outage. Verify no private diagnostics in UI/logs/storage.
7. Review Arabic/English, 375/1440 px, mixed identifiers, dynamic errors, keyboard/dialog/focus, reduced motion and actual accessible labels. Local scripted accessibility snapshots are not human screen-reader playback. Run the organization's human assistive-technology review before claiming that coverage.
8. Verify approved media mapping and access restrictions, or record explicit placeholder launch acceptance: persisted property/progress photographs are unavailable, while local upload previews and metadata management work. Never publish local disk/storage paths.
9. Record representative navigation timing with browser, device, network, cache state and API environment. Local synthetic timings do not establish production latency, backend capacity or the deferred RPS target. Do not rerun the backend's long benchmark as this frontend check.
10. Exercise the actual hosting artifact switch/cache refresh and rollback below. Keep failed checks open and obtain explicit release approval only after the result is reviewable.

## Publish and rollback — operator actions after release approval

1. Archive the verified artifact, manifest, approvals and staging record. Retain the previous frontend artifact and its build-time configuration. Never combine a new `index.html` with arbitrary old/new chunks or edit compiled JS.
2. Stage the new complete `site/` beside the prior release. Verify all hashes and host configuration. Switch the host's current alias atomically using the deployment platform's supported mechanism; this runbook does not assume a platform command or change backend infrastructure.
3. Preserve access to prior hashed chunks during the agreed client transition window. The Nginx example serves `/assets/` from an additive `/srv/brouj/shared/assets/` directory while HTML follows `/srv/brouj/current/site`. Upload only verified artifact assets there before switching HTML. If an asset name already exists, verify identical SHA-256 bytes; never overwrite different content under an immutable URL. Retain prior asset files for the deployment owner's recorded transition period, including rollback. An already open tab may request an old lazy chunk after the switch; do not remove prior assets immediately. The deployed page's existing safe reload can recover an unavailable chunk. Vite documents this version-skew risk ([guidance](https://vite.dev/guide/troubleshooting#failed-to-fetch-dynamically-imported-module)). Do not cache HTML indefinitely or introduce a service worker incidentally.
4. Purge/revalidate HTML and relevant edge negative caches; keep valid immutable assets cached. Run the staging smoke subset on the live topology and record sanitized results.
5. Roll back by atomically restoring the **prior complete artifact and its matching public build configuration**, then revalidate HTML/edge caches and repeat deep-link/auth/read smoke checks. A frontend rollback does not reverse committed business operations, database changes or backend deployment. Reconcile uncertain writes through authoritative reads.
6. If rollback fails its checks, stop traffic promotion and follow the deployment owner's incident process. Keep the failed artifact/evidence for review without exposing private payloads.

The local Node policy tests rehearse root selection/new/prior HTML and cache behavior. Actual Nginx/CDN configuration, atomic switch, old-chunk retention and staging/production rollback remain deployment-owner checks until executed.
