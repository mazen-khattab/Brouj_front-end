# Open release checks

Date: 2026-10-29. The user has explicitly approved Part 13's frontend work and moved on to a homepage/navbar redesign. The acceptance does not establish passing evidence for the real-environment checks below. No deployment has occurred.

| Check | Exact dependency / required evidence | Current result |
|---|---|---|
| Real browser/API journeys | Configured HTTPS API, existing dedicated customer/Admin/SuperAdmin account references in an approved secure location, and disposable test inventory. Execute the runbook's customer/staff/governance journeys against that API, not intercepted responses. | Open. No listener on configured local port 7249; no account/configuration reference supplied. |
| Cookies, expiry, CSRF and authorization | Observe actual secure cookie flags, expiry/rotation/logout revocation, concurrent/tab coordination, invalid/missing CSRF rejection, ownership and actor/role denial. Record sanitized pass/fail with environment reference. | Open. Frontend/fixture tests are not real server evidence. |
| Business currency | Explicit owner confirmation of launch ISO 4217 currency and its approval reference. | Open. EGP is used only as a development/rehearsal example. |
| Persisted media disposition | Either explicit owner acceptance of unavailable project/unit/progress photos at launch, or an approved HTTPS identifier mapping/access contract followed by implementation and integration verification. | Open. Safe placeholders retained; setting an origin alone cannot close this. |
| Real hosting/staging | Selected host/root/TLS/configuration; run its configuration validator; verify actual CSP/security headers, CORS and cache rules, deep links, missing assets, client version transitions and rollback. | Open. Local Node HTTPS rehearsal passes its own checks; Nginx reference is undeployed and not syntax-tested here. |
| Backend operational inputs | Deployment owner confirms actual rate/body/depth budgets, initial SuperAdmin, protected Data Protection/shared storage, SQL privileges, trusted proxies and edge policy. | Open. Existing backend runbook remains authoritative; no infrastructure changed. |
| Final artifact/source | Clean reviewed source commit, approved public inputs, `release:build` and verified manifest/archive. | Open for promotion. Local artifact is explicitly a dirty-source rehearsal. |
| Release authorization | Explicit owner release approval after the above verification result is reviewable. | Not requested yet; no publication/deployment performed. |

The owner was asked for the environment/account reference, launch currency and media disposition during this phase. Keep credentials out of chat and evidence. Continue from these recorded checks when inputs arrive; the local implementation and regression evidence need not be recreated unless source/environment changes invalidate them.

See [staging steps and rollback](runbook.md), [release notes](release-notes.md), [API coverage](api-coverage.md) and the [Part 13 report](../part_13_completion.md). Known backend capacity/cache limitations and inactive real time are documented inherited boundaries, not newly verified production capabilities.
