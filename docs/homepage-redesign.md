# Homepage and navigation redesign

Requested and implemented on 2026-10-29, after the owner's explicit Part 13 approval.
Updated on 2026-10-30 with the owner's responsive hero, typography and navigation refinements.

## Result

- Public navigation: Home, About us, Initiative projects, Terms. Desktop separates logo, centered links and compact account/language controls. Signed-in users open a dismissible account-icon disclosure for their account/dashboard and logout. Below 1024px, language and the menu icon share one row; navigation and session actions open vertically. The latest update makes this header sticky and links About us to `/about`; older homepage anchors remain usable. See [the public style update](public-style-update.md).
- Hero: desktop keeps the split layout and existing content/image. Below 1024px, the image covers the hero behind a 20% black overlay and the same text/button. Explore projects is its only link. Desktop image entrance follows the language direction; the mobile image fades in, and reduced motion disables animations.
- Initiative projects: API-filtered, three records per carousel page, previous/next controls, a partial last page, and a See all link to `/projects?projectType=1`. Regular projects are excluded. Mobile presents each group as three stacked cards.
- Terms: the current published title and up to three plain-text paragraphs, with a link to the existing full Terms page. The backend supplies one title/content document; the UI does not invent or translate legal clauses.
- About: a 1:3 desktop introduction/gallery layout, with About us / من نحن as a full section heading above the company name. The first owner panel starts expanded; mouse movement, keyboard focus and taps select another panel. Mobile uses a vertical accordion. The owner approved labeled portrait/name/biography placeholders.
- Contact: Name and Subject only. Sending is visibly deferred and disabled, as approved; there is no contact endpoint or destination to connect yet.
- Footer: enlarged Brouj wordmark, Terms link and copyright. New sections use navy backgrounds for readable gold/white text, with gold terms/footer surfaces and the existing fonts/radius.
- Arabic uses an 18px root font size (English retains 16px). The gold backdrop ends sharply without its former bottom fade. Diagonal arrows are removed from the homepage/footer; project cards use a View project label instead.

## Implementation

`src/Pages/WelcomePage.tsx` composes the sections from `src/Components/Home/`. `HomeProvider`, `HomeContext` and `useHome` keep independent project/terms reads behind the existing services. Reads retain cancellation/latest-response protection and refresh after catalogue invalidation. Failures, retries and empty results use existing shared feedback.

`PublicLayout.tsx` supplies the footer and mounts `PublicHeader.tsx`. Its account disclosure supports Tab, Escape/focus return, focus departure and outside-click dismissal, and resets across routes/identities. Shared controls accept compact/vertical variants; admin navigation keeps its existing arrangement. `Navigation.tsx` distinguishes query-filter and hash destinations when marking links active. Styles stay in `src/Styles/global.css`; English/Arabic copy uses the `home` namespace. No dependencies, backend code, endpoints or DTOs changed.

Part 13 approval was recorded in the ledger/report. Its previously documented real-environment release checks remain open; no deployment was performed.

## Verification

The following 58-case regression and four-case spacing refresh describe the original 2026-10-29 redesign. The 2026-10-30 checks are recorded separately below.

- `npm run build`: passed, including TypeScript.
- `npm run lint`: passed.
- `npm test -- --maxWorkers=2`: 441 tests passed.
- `npm run routes:check-build`: passed; admin chunks and development fixtures stay out of public startup imports.
- `npm run test:browser -- tests/browser/homepage.spec.ts tests/browser/foundation.spec.ts tests/browser/routing.spec.ts tests/browser/catalogue.spec.ts --workers=2`: all 58 cases passed across desktop/mobile Chromium and Arabic/English. `NODE_OPTIONS=--use-system-ca` uses the trusted system certificate store. Coverage includes carousel bounds/filtering, independent errors/retry, owner focus/hover/tap, anchor navigation, reduced motion and the existing catalogue/access/history flows.
- After the final CSS spacing adjustments, `npm run build` passed again and `npm run test:browser -- tests/browser/homepage.spec.ts --grep 'homepage sections' --workers=2` passed all four bilingual desktop/mobile cases and refreshed the saved screenshots. `git diff --check` passed.

Browser fixtures exercise the real frontend services over trusted local HTTPS with intercepted synthetic API responses. They do not establish live backend or deployment verification.

### 2026-10-30 refinement checks

- Build/typecheck, lint, all 441 unit tests, lazy bundle isolation and `git diff --check` pass.
- A 44-case affected-workflow browser run passed 39 cases, skipped two duplicate mobile-project width reviews, and exposed three fixture/synchronization failures. After correcting the transport fixture's newly required public reads and waiting for lazy route focus before opening account actions, all 14 targeted account/transport/session cases pass. All 42 distinct applicable cases have passing evidence across these runs.
- The initial new signed-in tests were corrected to remove the foundation fixture's anonymous-profile override. Production authentication code was unchanged.
- Coverage includes 375px/768px/1024px/1440px, both languages, compact/vertical navigation, image/text placement, 18px Arabic sizing, account link/logout, Escape/focus return, outside-click dismissal, cookie/CSRF multipart transport, and the existing disabled-realtime/session behavior.
- Earlier Part 12 screenshots regenerated by regression tests were restored; new visual evidence is saved only under `docs/evidence/homepage/`.

## Visual review

Full-page screenshots use synthetic catalogue/terms content, the approved owner placeholders, and empty contact fields:

| Language | Desktop | Mobile |
|---|---|---|
| English | [Screenshot](evidence/homepage/home-en-desktop.png) | [Screenshot](evidence/homepage/home-en-mobile.png) |
| Arabic | [Screenshot](evidence/homepage/home-ar-desktop.png) | [Screenshot](evidence/homepage/home-ar-mobile.png) |

Intermediate-width reviews: [English 768px](evidence/homepage/home-en-768.png), [Arabic 768px](evidence/homepage/home-ar-768.png), [English 1024px](evidence/homepage/home-en-1024.png), [Arabic 1024px](evidence/homepage/home-ar-1024.png). All eight saved screenshots reflect the 2026-10-30 refinement.

Reviewed both directions for layout, overflow, text visibility, owner expansion and footer. Project photos continue to use the existing safe media placeholders because the public project list does not contain photos and no approved persisted-media delivery mapping exists.

When ready, owner names/biographies can replace the entries in `src/i18n/locales/{en,ar}/home.json`, and approved portraits can fill the photo slots in `AboutSection.tsx`. Contact sending can be connected after its destination is supplied.
