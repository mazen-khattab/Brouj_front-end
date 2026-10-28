# Part 13 - Final verification and release

## Objective and prerequisite

Prerequisite: Part 12 approved. Verify launch behavior, document operational dependencies and prepare a reviewable release. Follow [master conventions](00_Master_Index.md). Deployment itself requires explicit authorization after the release result is reviewable.

## Ordered implementation

1. Audit the API/UI matrix: every approved operation has its implemented screen/action or an explicitly approved exclusion. Check there are no fake endpoints, accidental new business flows or unfinished route placeholders.
2. Run production build, strict typecheck, lint and the accumulated focused Vitest/React Testing Library tests. Use Playwright for critical end-to-end journeys. Record commands, environment, results and limitations; do not label unavailable backend checks passed.
3. Run real HTTPS browser verification against configured backend/test data: registration/login, profile/password, reservation lifecycle, order viewing, staff catalogue mutations, order conversion/completion, plan hierarchy, terms activation, audit reads and SuperAdmin staff management.
4. Validate session expiry, concurrent 401s and tab refresh coordination, identity-bound CSRF, cookie logout, role changes, actor switching, delayed responses and private-state cleanup. Missing/invalid CSRF must be rejected by the real backend.
5. Review both languages on every implemented screen; compare translation keys and inspect dynamic errors. Check RTL/LTR at mobile/desktop widths, mixed identifiers, keyboard navigation, focus restoration, screen-reader labels, reduced motion and contrast.
6. Inspect production bundles/network activity: public startup does not eagerly fetch admin code/data, lazy errors recover, no secrets or raw customer data appear in logs, and filters do not produce duplicate/unbounded requests. Measure representative navigation with an identified environment rather than claiming unsupported capacity targets.
7. Verify media deployment: if no approved delivery exists, retain safe placeholders and document the precise launch limitation for explicit acceptance. A configured media host needs tested HTTPS URL mapping and access rules; local file paths never become browser URLs.
8. Prepare a hosting runbook for https://brouj.com -> https://api.brouj.com. Configure SPA history fallback for page routes while returning actual 404s for missing assets, immutable caching for hashed assets and revalidated HTML. API no-store remains unchanged.
9. Document frontend security headers: CSP adapted to the actual API/media origins and required styles, nosniff, frame protection, referrer policy and HTTPS. Do not copy an API-only CSP that prevents SPA assets from loading. Verify headers in staging.
10. Require configured business currency, trusted HTTPS, correct CORS origins, backend rate/body budgets, provisioned initial SuperAdmin, and media disposition. Keep Data Protection/storage/SQL/edge setup with backend deployment owners; do not modify backend infrastructure as an incidental frontend fix.
11. Produce release notes, reproducible build/artifact instructions, environment checklist, staging smoke test and rollback to the prior frontend artifact/configuration. Keep detailed telemetry limited to sanitized route templates/status/trace; do not introduce an external analytics provider without authorization.

## Acceptance scenarios

- Customer: register/sign in, browse/filter, inspect unit, reserve, cancel, view own order/plan, update profile/password, sign out.
- Admin: catalogue and images, customer deletion/restoration, reservation conversion, approved order completion, time plans/templates, terms and audit.
- SuperAdmin: staff create/update/delete/restore; Admin/customer direct routes remain denied.
- Failures: foreign-owner 404, 400 validation/CSRF distinction, 401/403, stale-record 409, 413/415 upload errors, 429 Retry-After, network outage and uncertain mutation result.
- Hosting: public/account/admin deep-link reload, missing asset 404, expired-session navigation, build cache refresh and rollback.

## Release report and approval gate

Deliver a verification report with automated/manual evidence, bilingual review results, remaining accepted limitations, final API coverage matrix and release/rollback runbook. Do not rerun the backend's long capacity benchmark or claim its deferred performance work completed.

Mark Part 13 Awaiting approval when verified. Publish/deploy only after explicit release approval. If currency, real authentication environment or media disposition remains unresolved, report the exact dependency and keep the corresponding release check open.
