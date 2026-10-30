# Sticky navigation, About us and authentication styling

Implemented on 2026-10-30 at the owner's request.

## Result

- The public navbar stays at the top while scrolling, with an opaque navy backdrop and shadow. Mobile navigation has a bounded scroll area for shorter screens. Scroll padding keeps anchor targets below the header.
- `/about` is a new public lazy route with translated title/breadcrumbs, a company introduction, three guiding principles, the shared interactive owner gallery, and an initiative-project link. The navbar and homepage's Our story link open it. Owner names/portraits remain the previously approved placeholders; no company metrics or biographies were invented.
- Customer sign-in, staff sign-in and registration share a centered ivory form card with gold trim and a small decorative lock icon. The former architectural photograph and promotional sidebar are removed. The navy/gold/white palette and enlarged Arabic typography remain in use.

Authentication handlers, validators, pending/error states, credential cleanup and return-query links retain their existing behavior. No backend, dependencies or endpoints changed. The new static About route does not fetch catalogue data.

## Implementation

- `src/Components/PublicHeader.tsx`, `src/Styles/global.css`: sticky navbar, bounded mobile panel and scroll offset.
- `src/Pages/AboutPage.tsx`, browser paths, route definitions and router: new public route, lazy rendering, title/breadcrumb/access integration.
- `src/Components/OwnerGallery.tsx` and `Home/AboutSection.tsx`: shared owner hover/focus/tap behavior and a homepage link to the full story.
- `src/Pages/Auth/AuthPage.tsx`: image-free form layout for all three auth modes.
- English/Arabic `home.json`: About page copy. `docs/routing-access.md`: current public route map.
- `tests/browser/publicStyle.spec.ts` and the updated homepage navigation case: sticky scrolling, direct About loads, owner interaction, route links, image-free auth screens, language switching and return-query preservation.

## Verification

- `npm run build`, `npm run typecheck`, `npm run lint`, `npm run routes:check-build` and `git diff --check`: passed.
- `npm test -- --maxWorkers=2`: all 441 unit tests passed.
- `npm run test:browser -- tests/browser/publicStyle.spec.ts tests/browser/homepage.spec.ts tests/browser/auth.spec.ts tests/browser/foundation.spec.ts --workers=2`: 50 passed, two intentionally skipped duplicate intermediate-width cases in the mobile project. Trusted system certificates use `NODE_OPTIONS=--use-system-ca`.
- Browser checks cover 375px/768px/1024px/1440px, Arabic/English, sticky placement after scroll, direct About visits and reloads, title/breadcrumb/focus behavior, shared owner selection, initiative filtering, image-free customer/staff/registration screens, language switching, retained edits and return queries. Existing authentication validation, invalid-login recovery, coordinated refresh and cross-tab logout checks pass.
- Reviewed the full-page desktop/mobile captures in both languages for layout, text visibility and overflow. The existing homepage captures are also refreshed.

Browser checks use trusted local HTTPS and intercepted synthetic API responses. They establish frontend behavior, not a live backend or deployment result.

## Screenshots

| Screen | English desktop | Arabic desktop | English mobile | Arabic mobile |
|---|---|---|---|---|
| About us | [View](evidence/public-style/about-en-desktop.png) | [View](evidence/public-style/about-ar-desktop.png) | [View](evidence/public-style/about-en-mobile.png) | [View](evidence/public-style/about-ar-mobile.png) |
| Customer sign-in | [View](evidence/public-style/auth-customer-en-desktop.png) | [View](evidence/public-style/auth-customer-ar-desktop.png) | [View](evidence/public-style/auth-customer-en-mobile.png) | [View](evidence/public-style/auth-customer-ar-mobile.png) |
| Staff sign-in | [View](evidence/public-style/auth-staff-en-desktop.png) | [View](evidence/public-style/auth-staff-ar-desktop.png) | [View](evidence/public-style/auth-staff-en-mobile.png) | [View](evidence/public-style/auth-staff-ar-mobile.png) |
| Registration | [View](evidence/public-style/auth-register-en-desktop.png) | [View](evidence/public-style/auth-register-ar-desktop.png) | [View](evidence/public-style/auth-register-en-mobile.png) | [View](evidence/public-style/auth-register-ar-mobile.png) |
