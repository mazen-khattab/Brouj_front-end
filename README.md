# Brouj frontend

One Vite React/TypeScript SPA for the Website, customer account, and Admin Dashboard. This checkout implements **Parts 01–03**: the foundation, Arabic/English shared UI, typed services for all 101 business operations, and credentialed API transport with in-memory CSRF protection. The approved design uses layered navy/gold/ivory surfaces, self-hosted Manrope/IBM Plex Sans Arabic, 16px corners, fade-ins and shimmer skeletons. Identity and feature screens follow their separately approved phases in [the master index](Frontend_plan_files/00_Master_Index.md).

## Requirements and install

Use Node **24.14.0 or later in the 24.x line**, npm **11.9.0 or later in the 11.x line**. `.nvmrc` selects the verified local Node version. Direct dependencies are exact pins; commit the included `package-lock.json` with application changes. See [dependency/runtime decisions](docs/dependencies.md).

```powershell
npm ci
Copy-Item -LiteralPath .env.example -Destination .env.local
```

Keep local environment files private and edit their certificate paths. An existing ignored `.env` also works; retain your current configuration rather than overwriting it. Never put secrets in `VITE_` values: they are public browser configuration.

| Input | Meaning |
|---|---|
| `VITE_API_ORIGIN` | Absolute HTTPS origin only. Approved development default: `https://localhost:7249`; production default: `https://api.brouj.com`. Paths, credentials, queries and fragments are rejected. |
| `VITE_MEDIA_ORIGIN` | Optional future approved delivery origin. Empty until a host **and identifier-to-URL contract** are supplied; setting this does not make storage paths public URLs. |
| `VITE_BUSINESS_CURRENCY` | Optional uppercase ISO 4217 code during development; owner/deployment must supply the actual business currency for release. No currency is inferred from language. Formatting displays a localized number without a currency symbol when unset. |
| `BROUJ_HTTPS_CERT_FILE` | Absolute server-only path to a trusted localhost certificate in PEM format, outside this repository. |
| `BROUJ_HTTPS_KEY_FILE` | Absolute server-only path to its private PEM key, outside this repository. |

Process environment overrides `.env.local` in Vite configuration. Production builds read public environment values at **build time**. For release, explicitly supply `VITE_API_ORIGIN=https://api.brouj.com` and the owner-approved currency/media inputs; an `.env.local` copied for development must not be used for a release build.

## Trusted local HTTPS

The only development topology is **`https://localhost:5173` → `https://localhost:7249`**. Vite refuses to start without certificate/key paths. It binds localhost and refuses to silently switch ports. No HTTP fallback, backend proxy, cookie weakening, TLS bypass or CORS wildcard is configured. Certificates are needed for `dev`/`preview`, not builds or unit tests.

The owner has provisioned trusted frontend PEM files in the existing local environment configuration; Part 02's HTTPS browser checks pass with certificate verification enabled. For another machine, supply a trusted localhost certificate with localhost in its Subject Alternative Names and its matching private key. Keep both outside this repository; protect key access with your account's filesystem permissions. If using the existing .NET SDK, the following is an optional **manual** provisioning example, following [Microsoft's dev-certificate guide](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-dev-certs):

```powershell
$broujCertDirectory = Join-Path $env:LOCALAPPDATA 'Brouj/https'
New-Item -ItemType Directory -Path $broujCertDirectory -Force
dotnet dev-certs https --trust
dotnet dev-certs https --export-path (Join-Path $broujCertDirectory 'localhost.pem') --format PEM --no-password
```

The PEM export writes `localhost.pem` and `localhost.key`. Review the OS trust prompt, then put the corresponding absolute paths in `.env.local`, for example `C:/Users/<your-user>/AppData/Local/Brouj/https/localhost.pem` and `.../localhost.key`. An unencrypted key is for this protected local development location only. Do not commit or share it. No certificate-store changes or exports were performed by Part 01.

Before Playwright's Node-based readiness check, enable the OS trust store for that process:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm run dev
```

For an organization-managed CA, use your approved Node CA configuration instead (for example `NODE_EXTRA_CA_CERTS` pointing to the public CA certificate). Do not disable certificate verification. Open `https://localhost:5173` in a browser and confirm no certificate warning. Separately trust the backend's localhost certificate. Start the backend HTTPS profile only after supplying the configuration documented in [its API handoff](../Brouj/docs/Brouj.Docs/Part8.ApiConfiguration.md); do not copy backend secrets into this app.

## Commands and verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run contracts:check
npm run services:check
```

The unit suite exercises the application/shared UI, public configuration, all 101 service mappings at the adapter boundary, CSRF concurrency/cancellation/generation protection, safe errors, and the enforced Axios ownership rule. Only `src/API.tsx` imports Axios at runtime. It owns the single application transport; no authentication context or automatic refresh/retry exists yet. See [the transport guide](docs/api-services.md) for service calls, error presentation and Part 04 coordination interfaces.

Browser checks require trusted PEM configuration and Playwright's browser binary:

```powershell
npx playwright install chromium
$env:NODE_USE_SYSTEM_CA = '1'
npm run test:browser
```

Playwright starts the HTTPS server, checks Arabic/English at 1440px/375px, captures screenshots under ignored `test-results/`, and verifies dialog keyboard/focus behavior, pending dismissal protection, table scrolling, reduced motion and locale persistence. It verifies certificates. See the [Part 02 report](docs/part_02_completion.md) for results and saved screenshots. Build output is in ignored `dist/`; `npm run preview` is a local HTTPS preview, not a production deployment server. Production hosting must serve HTTPS and rewrite SPA navigation to `index.html` when feature routes are introduced.

## Shared UI showcase

While running `npm run dev`, visit **https://localhost:5173/__showcase**. The homepage also links to it in development. Review the form, table, dialog, notifications and loading states, then switch language without losing entered values. Idle modals close on a backdrop click; pending actions remain protected. Notifications close automatically after five seconds using an interval. This is an internal preview with in-memory fixtures and no API calls. The route and sample data are excluded from the production build; `npm run preview` does not expose it. Source CSS is restricted to `src/Styles`; components/pages use Tailwind utilities.

The luxury architectural/editorial design preserves the approved fonts and uses 16px component corners, generous spacing and fine gold detailing. Layered navy gradients, champagne-gold backdrops and warm ivory surfaces replace the single flat page background. The [shared UI guide](docs/shared-ui.md) documents component interfaces, localization/validation conventions, formatting helpers and theme tokens. Saved visual evidence is linked from the [completion report](docs/part_02_completion.md). The locally bundled decorative architectural artwork and its generation prompt are documented in [artwork notes](docs/architectural-artwork.md).

## Contracts and phase evidence

Start with [the API/UI matrix](docs/contracts/api-ui-matrix.md) and [wire contracts](docs/contracts/wire-contracts.md). The matrix covers 101 business operations and CSRF separately, with request/response shapes, policies, feature ownership and UI phases. `BROUJ_BACKEND_ROOT` can override the default read-only backend checkout path for verification. After inspecting a backend change, `npm run contracts:update` refreshes generated frontend evidence; this does not authorize backend edits or implementing a later phase.

Required directories are under `src/`: `API.tsx`, `App.tsx`, `Services`, `Context`, `Router`, `Pages`, `Components`, `Types`, `Hooks`, `Styles`, and `i18n`. Empty future-layer directories are retained with `.gitkeep`; they contain no simulated services. The locale bootstrap respects a previously selected `brouj.locale`; Arabic is the initial language. Locale and toast providers live outside the route tree so navigation retains their shared state.

See the [Part 01 report](docs/part_01_completion.md) and [Part 02 report](docs/part_02_completion.md) for the approved foundation and design, and the [Part 03 report](docs/part_03_completion.md) for transport verification. Media hosting, release currency configuration, real authentication environment, initial SuperAdmin provisioning and backend request/rate budgets remain deployment inputs. Part 04 requires explicit Part 03 approval in accordance with the master plan.
