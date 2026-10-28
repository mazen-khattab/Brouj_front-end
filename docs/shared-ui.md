# Shared UI, localization and tokens

Implemented in Part 02. Open `/__showcase` through the local HTTPS development server to review the patterns together. Its fixtures and route are development-only. Shared components and helpers are production code; no feature service, real mutation, authentication state or backend integration is implemented here.

## Locale and translation ownership

`src/i18n/bootstrap.ts` accepts only persisted `ar`/`en` from `brouj.locale`, defaults to Arabic, and sets document `lang`/`dir` before React renders. `instance.ts` initializes i18next synchronously from local resources, with English fallback. No detector infers an actor, permission or language from the browser or URL. Unknown keys in both languages render a safe English fallback instead of leaking internal keys.

`LocaleProvider` wraps the application outside the route tree and supplies the i18next instance and `LocaleContext`. Use `useLocale()` for `{ locale, direction, setLocale }` and `useTranslation()` for text. `LanguageSwitcher` persists explicit selection and updates document direction immediately; denied storage still permits switching for the current session. URLs remain unchanged. Future public/admin layouts inherit the same provider; no admin route was added early.

Resources are grouped into `common`, `auth`, `catalogue`, `account`, `admin`, `timePlans` and `errors`. Only `common` has keys now. Add a feature's keys to its namespace when that phase is implemented. Arabic and English must have identical, nonempty leaf keys. `translationGaps()` and the unit suite enforce parity even though runtime fallback is available. Backend names, descriptions and terms remain supplied text, never translation keys or auto-translated content.

Keep validation state as descriptors such as `{ fieldId, key, values }`, then call `t(key, values)` during rendering. Do not store the result of `t()` in long-lived validation state. The showcase stores validation keys and keeps field values when locale changes. Shared fields accept the resulting error string; `ValidationSummary` links translated messages to their fields. Future server-error mapping belongs to the transport/feature phases, not this sample form.

Notifications follow the same descriptor rule: `useToast()` accepts `{ message: { key, namespace?, values? }, tone? }`, where tone is `success`, `info` or `error`. Existing notices retranslate on locale change. They are in-memory, capped at four, manually dismissible, and automatically close after five seconds as requested by the owner. Each `Toast` owns a `setInterval(..., 5000)` effect; expiry removes it and cleanup clears the interval. Manual dismissal, eviction and provider unmount also clear timers. A language change does not restart the five-second deadline. Error notices use assertive alerts; routine info/success uses polite status regions. Inline and floating info notices have opaque white surfaces for readable contrast over gold and navy.

## Tokens and direction

The owner's revision replaces CSS Modules with Tailwind CSS 4 and its Vite plugin. **All source CSS is confined to `src/Styles`**: `tokens.css` defines the Tailwind theme/animations and `global.css` imports Tailwind, bundled fonts and global accessibility rules. Components use Tailwind utilities, with reusable class recipes in `src/Components/ui.ts`. No component/page CSS files remain. Skeleton dimensions remain runtime sizing inputs.

Typography preserves the owner-approved, locally bundled Manrope Variable for Latin and IBM Plex Sans Arabic (400/500/600/700) for Arabic. Font files ship with the app; no font CDN is contacted at runtime. The luxury architectural/editorial composition uses spacious typography, fine gold rules, restrained borders and a decorative architectural image. Navy/gold/white **3:2:1** remains the visual hierarchy: dominant navy, broad gold secondary surfaces and restrained white control surfaces. This is a composition guideline rather than an exact per-pixel ratio or a visible palette diagram. Semantic success/error surfaces retain their separate meanings.

`BrandWordmark` provides the shared mark and translated name. `ArchitecturalVisual` renders the locally bundled [decorative concept artwork](architectural-artwork.md), with a translated caption and empty image alternative. It does not represent actual property inventory, consume backend media identifiers or mirror with RTL.

The latest owner revision replaces flat page backgrounds with layered brand finishes. `LuxuryBackdrop` combines a deep-to-muted navy gradient, a soft gold glow and a champagne side panel behind the artwork; its side panel follows RTL and stacks beneath the image on mobile. `surfaces.ts` shares Tailwind recipes for navy, satin-like gold and warm ivory gradients. The showcase transitions into an ivory/champagne collection area, with navy and gold panels, then returns to a navy footer. Text, fields and live notices retain opaque readable surfaces. Gradients are static and use only shades of the three brand colors. Theme shades live alongside the original unchanged brand colors in `src/Styles/tokens.css`.

Gold text on navy gradients uses `text-accent-light`. Conservative endpoint checks include the maximum 10% gold glow: light gold on that navy is 5.31:1 and 75% white body text is 4.92:1. Primary text on the darkest gold stop is 4.63:1. Keep derived shades within these contrast bounds when extending the finishes.

Pages, panels, modal opening and toast entry fade in. Skeletons use a moving gradient shimmer rather than a spinner/pulse; a decorative five-second line accompanies each toast. Animation keyframes and Tailwind theme declarations live in `src/Styles/tokens.css`. Reduced-motion preferences disable both element and pseudo-element animations without hiding content or changing notification deadlines.

| Token family | Convention |
|---|---|
| Primary / accent / background | `#1b4564` / `#bfae89` / `#ffffff`. Navy/gold/white weighting is 3:2:1; text on gold is dark navy. |
| Text and muted text | Dark blue and neutral text on light surfaces; tested normal-text contrast >=4.5:1. |
| Error / success | Semantic foreground and light surface tokens; use text/live roles as well as color. |
| Control border / focus | Tested border contrast >=3:1 against white; visible 3px primary outline with offset. |
| Spacing / radii | Tailwind spacing utilities; `rounded-ui` maps to the shared `--radius-ui: 16px` for component surfaces and controls, including buttons, fields, panels, dialogs, notices and skeletons. |
| Typography | Tailwind `font-sans`, `font-latin`, `font-arabic`; `--line-body: 1.8`, `--reading-width: 65ch`. Fonts are self-hosted. |
| Layers | Toasts use Tailwind `z-50`; native dialogs use the browser top layer. |

Use inline/block logical sizing, padding, margins, borders and insets. Pagination arrows mirror for RTL; the decorative brand mark explicitly retains its geometry. `BidiText` uses `<bdi>` with LTR by default for emails, phone numbers, identifiers and codes; pass `direction="auto"` for unknown-direction supplied text. Email/tel/password/URL `Input` types default to LTR entry while their labels follow the page direction. Do not reverse strings.

## Shared components

| Component | Main interface / behavior |
|---|---|
| `Button` | Native button props, `variant`, `pending`, optional translated `pendingLabel`. Defaults to type button. Pending disables repeat activation and exposes busy state. |
| `Input`, `Select`, `Textarea`, `Checkbox` | Native props plus required `id`/translated `label`, optional `hint`, `error`, `pending`. Connect labels/descriptions, expose invalid state, and disable pending controls. Consumers own form state and submission. |
| `ValidationSummary` | `items: { fieldId, message }[]`; renders an alert only with errors. Links focus the corresponding field without changing the route. Include field names in summary messages. |
| `Alert`, `Loading`, `Skeleton` | Appropriate live status or alert priority. Skeleton Shimmer is decorative; use one translated Loading status for a group and size placeholders to match content. Reduced motion stops the shimmer pseudo-element. |
| `EmptyState`, `ErrorPanel` | Localized default title/description; optional custom translated text. ErrorPanel optionally offers a retry callback. Backend text is escaped by React. |
| `Dialog` | Controlled `open`, `onClose`, translated `title`/optional `description`, `pending`, children. Native `showModal()` makes background inert; Tab/Shift+Tab stay inside and trigger focus is restored. Escape, close button and backdrop clicks dismiss an idle dialog. Backdrop detection requires both pointer-down/up outside its bounding box; an inside-to-outside drag does not dismiss it. Pending actions block dismissal; callers must also disable their own cancel actions. |
| `DataTable<T>` | Translated `caption` and `scrollLabel`, typed columns `{ id, header, render }`, rows/rowKey, optional pending state. Real table headings/caption inside a labeled focusable scroll region. Narrow-screen keyboard scrolling is verified in both directions. |
| `Pagination` | One-based `page`, nonnegative `totalPages`, `onPageChange`, optional `pending`. Zero-result/single-page/pending boundaries are disabled. Display clamps if results shrink, with no callback during render; previous/next emit only an available adjacent page. |
| `LanguageSwitcher`, `BidiText` | Shared language selection and mixed-direction isolation, as described above. |

Use native field semantics (`required`, autocomplete, type) and align actual feature validation with the backend validators once those forms are implemented. The showcase is an isolated control example; its display-name/email checks do not define a new backend request contract. Never persist private form/profile data through this layer.

## Formatting

All helpers in `src/i18n/format.ts` return display strings. Input values stay numeric/ISO values; helpers do not modify API payloads or calculate authoritative business totals.

- `formatNumber(value, locale, options?)` requires a finite number and uses Intl formatting. Locale-aware formatting does not promise a particular digit shape on every platform; an explicit `numberingSystem` is available if needed.
- `formatCurrency(value, locale, currency?)` defaults to the explicitly configured business currency. If unset/empty it formats a localized number without a currency symbol, with up to four fractional digits. Locale does not select currency. The supplied local environment currently configures EGP; release builds still need their explicit target configuration.
- `formatDateOnly('YYYY-MM-DD', locale, options?)` validates actual calendar dates, uses Gregorian calendar and UTC formatting solely to preserve the given calendar day. It does not shift the value through the browser timezone. Invalid/overflow dates are rejected.
- `formatDateTime(offsetTimestamp, locale, options?)` accepts complete ISO date-times with seconds and an explicit Z/offset, including .NET fractional seconds. It validates the date, then displays the instant in the browser's local timezone unless the caller deliberately supplies `timeZone`. Gregorian calendar is enforced. Date/time style presets are supported without combining them with default component fields.

Primary implementation references: [i18next configuration](https://www.i18next.com/overview/configuration-options), [react-i18next instance integration](https://react.i18next.com/latest/i18next-instance), [WAI modal dialog keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [native dialog behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [Intl date formatting](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).
