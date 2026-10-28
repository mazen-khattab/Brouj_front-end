# Part 02 - Bilingual theme and shared UI

## Objective and prerequisite

Prerequisite: Part 01 completed and explicitly approved. Build a reusable visual and localization foundation used by Website and Dashboard. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Add i18next/react-i18next with local Arabic/English resources grouped into common, auth, catalogue, account, admin, timePlans and errors namespaces. Start with common resources; add each feature's translations when its phase is implemented.
2. Read a valid persisted brouj.locale value before first render; otherwise choose Arabic. Set document lang and dir synchronously. Keep selection when navigating between public/admin layouts and after reload. Do not infer actor or permission from locale.
3. Create LocaleContext and a language switcher. Translate rendered validation messages when language changes rather than keeping stale translated strings in state. Use English fallback for unexpected missing resources; translation parity checks must still fail missing launch keys.
4. Define CSS variables for colors, spacing, radii, typography, focus rings and z-index layers. Use a local/system Arabic-capable font stack and avoid a runtime external font dependency. Set sensible reading widths and readable Arabic line heights.
5. Implement shared buttons, fields, select/checkbox/textarea controls, validation summary, alert/toast, loading/skeleton, empty state, error panel, accessible dialog, responsive table and pagination.
6. Use CSS logical properties throughout. Mirror navigation arrows where meaningful, not logos, photographs or universal icons. Isolate mixed-direction identifiers and preserve LTR entry for email/phone/password when appropriate.
7. Add shared Intl formatting helpers for locale-aware numbers, configured currency, and Gregorian dates. Keep date-only values free of timezone shifting; date-times need explicit parsing and browser-local display. Do not transform API numeric payloads into formatted display strings.
8. Create an internal component showcase for review; it is a development aid, not a public production route.

## Behavior and interfaces

Shared controls accept translated labels, field IDs, disabled/pending states and error descriptions. Dialogs trap focus, close with Escape where appropriate, restore trigger focus, and prevent unintended dismissal while a mutation is pending. Notifications use suitable live-region priority.

Use #1b4564 for primary actions/navigation, #bfae89 for accents, #FFFFFF for background. Add semantic error/success colors and neutral tokens with tested contrast. Gold is not the default background for small white text. Avoid layout shifts in loading states and honor prefers-reduced-motion.

Arabic/English cover screen-reader text, empty states and pagination as well as visible headings. Backend content remains unchanged and is rendered as escaped text.

## Verification and acceptance

Test language persistence, html attributes, dynamic validation translation, keyboard dialog operation, pagination boundaries and currency/date helpers. Review a form, table, dialog, notification and loading state in both languages at approximately 375px and 1440px widths. Check long Arabic/English labels, mixed-direction emails and narrow layouts; tables may use an explicitly labeled scroll region.

Deliver component showcase evidence, token/localization documentation and a completion report. Acceptance: no raw translation keys, unintended horizontal page overflow, unreadable contrast or keyboard traps.

## Approval gate

Stop after reporting Part 02 complete. Part 03 requires explicit approval.
