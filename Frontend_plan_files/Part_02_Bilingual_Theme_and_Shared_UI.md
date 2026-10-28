# Part 02 - Bilingual theme and shared UI

## Objective and prerequisite

Prerequisite: Part 01 completed and explicitly approved. Build a reusable visual and localization foundation used by Website and Dashboard. Follow [master conventions](00_Master_Index.md).

## Ordered implementation

1. Add i18next/react-i18next with local Arabic/English resources grouped into common, auth, catalogue, account, admin, timePlans and errors namespaces. Start with common resources; add each feature's translations when its phase is implemented.
2. Read a valid persisted brouj.locale value before first render; otherwise choose Arabic. Set document lang and dir synchronously. Keep selection when navigating between public/admin layouts and after reload. Do not infer actor or permission from locale.
3. Create LocaleContext and a language switcher. Translate rendered validation messages when language changes rather than keeping stale translated strings in state. Use English fallback for unexpected missing resources; translation parity checks must still fail missing launch keys.
4. Use Tailwind utilities for components/pages and central theme variables in src/Styles. Do not add CSS files elsewhere in src. Preserve the owner-approved Manrope and IBM Plex Sans Arabic, bundled locally without a runtime font CDN. Set sensible reading widths and readable Arabic line heights. Follow the owner's luxury design revision: architectural imagery, generous editorial spacing, fine gold detailing and a shared 16px radius for component surfaces and controls.
5. Implement shared buttons, fields, select/checkbox/textarea controls, validation summary, alert/toast, loading/skeleton, empty state, error panel, accessible dialog, responsive table and pagination.
6. Use CSS logical properties throughout. Mirror navigation arrows where meaningful, not logos, photographs or universal icons. Isolate mixed-direction identifiers and preserve LTR entry for email/phone/password when appropriate.
7. Add shared Intl formatting helpers for locale-aware numbers, configured currency, and Gregorian dates. Keep date-only values free of timezone shifting; date-times need explicit parsing and browser-local display. Do not transform API numeric payloads into formatted display strings.
8. Create an internal component showcase for review; it is a development aid, not a public production route.

## Behavior and interfaces

Shared controls accept translated labels, field IDs, disabled/pending states and error descriptions. Dialogs trap focus, close with Escape or a click outside the dialog, restore trigger focus, and prevent unintended dismissal while a mutation is pending. A drag beginning inside the dialog is not a backdrop click. Notifications use suitable live-region priority and close after five seconds using setInterval, with interval cleanup on dismissal/unmount; language changes must not reset the deadline.

Use #1b4564 (navy), #bfae89 (gold) and #FFFFFF (white) with the user's 3:2:1 design weighting. Gold must appear as substantial secondary surfaces. The owner's latest revision requires varied backgrounds: layer navy shades, champagne-gold gradients and warm ivory/white surfaces derived from these three brand colors instead of a single flat page color. Keep readable text surfaces and logical RTL positioning. Add semantic error/success colors and neutral tokens with tested contrast; use dark text on gold. Add fade-in animations and Skeleton Shimmer loading states, preserving layout dimensions and honoring prefers-reduced-motion.

Arabic/English cover screen-reader text, empty states and pagination as well as visible headings. Backend content remains unchanged and is rendered as escaped text.

## Verification and acceptance

Test language persistence, html attributes, dynamic validation translation, keyboard dialog operation, pagination boundaries and currency/date helpers. Review a form, table, dialog, notification and loading state in both languages at approximately 375px and 1440px widths. Check long Arabic/English labels, mixed-direction emails and narrow layouts; tables may use an explicitly labeled scroll region.

Deliver component showcase evidence, token/localization documentation and a completion report. Acceptance: no raw translation keys, unintended horizontal page overflow, unreadable contrast or keyboard traps.

## Approval gate

Stop after reporting Part 02 complete. Part 03 requires explicit approval.
