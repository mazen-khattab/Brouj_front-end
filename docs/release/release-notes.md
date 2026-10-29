# Brouj V1 frontend release candidate

Prepared 2026-10-29. **Not released.** Part 13 verification is in progress; real backend/staging checks, currency/media decisions and explicit release authorization remain open.

The single Arabic/English SPA provides public catalogue discovery/filtering and supplied terms; customer registration/login/profile/password/reservations/orders and member project schedules; staff catalogue/media/customer/reservation/order workflows; time plans/templates; terms/audit/account administration; and SuperAdmin staff management. All 101 approved business operations have frontend consumers. Authorization and business state remain server authoritative. There is one active actor per browser session.

The release audit removes raw catalogue/form console logging, prevents embedding unrelated public environment inputs, removes obsolete unused placeholder components, and prepares verified static-artifact packaging, hosting/security/cache guidance, SHA-256 provenance and rollback instructions. Real time remains disabled behind the tested adapter. No analytics provider, payment/password-recovery feature, backend schema change or deployment is included.

Persisted property/progress photographs remain safe placeholders until an approved HTTPS mapping is implemented or the owner explicitly accepts that launch limitation. Existing local upload previews and metadata operations remain available. Currency is never inferred from language; the EGP rehearsal input is not an owner release decision. Backend capacity/cache limitations remain as documented by the backend owner; no new throughput claim is made.

See the [verification report](../part_13_completion.md), [API coverage](api-coverage.md) and [release/staging/rollback runbook](runbook.md) before considering promotion.
