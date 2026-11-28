import type { Locator, Page } from '@playwright/test';
import { test, expect, profileRoute } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import homeAr from '../../src/i18n/locales/ar/home.json' with { type: 'json' };
import homeEn from '../../src/i18n/locales/en/home.json' with { type: 'json' };
import aboutAr from '../../src/i18n/locales/ar/about.json' with { type: 'json' };
import aboutEn from '../../src/i18n/locales/en/about.json' with { type: 'json' };

async function scrollToCard(deck: Locator, index: number) {
  await deck.evaluate((element, layer) => {
    const card = element.querySelectorAll('.leadership-deck-card')[layer]!;
    const anchor = element.querySelectorAll('.leadership-card-anchor')[layer]!;
    const top = scrollY + anchor.getBoundingClientRect().top - parseFloat(getComputedStyle(card).top);
    window.scrollTo({ top: Math.ceil(top) + 24, behavior: 'instant' });
  }, index);
}

async function shownLayers(deck: Locator, active: number) {
  return deck.evaluate((element, layer) => {
    const cards = [...element.querySelectorAll('.leadership-deck-card')];
    const bars = [...element.querySelectorAll('.leadership-card-bar')];
    const edge = element.closest('.home-shell')?.querySelector(':scope > header')?.getBoundingClientRect().bottom ?? 0;
    const barBounds = bars.map((bar) => bar.getBoundingClientRect());
    const panel = cards[layer]!.querySelector('.leadership-card-panel')!.getBoundingClientRect();
    return {
      pinned: cards.slice(0, layer + 1).every((card) => {
        const style = getComputedStyle(card);
        return style.position === 'sticky' && Math.abs(card.getBoundingClientRect().top - parseFloat(style.top)) < 1;
      }),
      visible: bars.slice(0, layer + 1).every((bar, index) => {
        const rect = barBounds[index]!;
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.top > edge && !!hit && bar.contains(hit);
      }),
      aligned: barBounds.slice(1, layer + 1).every((bar, index) => Math.abs(bar.top - barBounds[index]!.bottom) < 1),
      fits: panel.bottom < innerHeight,
      uncoveredBody: cards[layer]!.contains(document.elementFromPoint(panel.x + panel.width / 2, panel.bottom - 10)),
    };
  }, active);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const anonymousProfile = /401/.test(message.text()) && profileRoute.test(message.location().url);
    if (message.type() === 'error' && !anonymousProfile) errors.push(message.text());
  });
  return errors;
}

for (const locale of ['ar', 'en'] as const) {
  for (const width of [1440, 390]) {
    test(`shared leadership deck in ${locale} at ${width}px`, async ({ page, context }, info) => {
      test.skip(info.project.name !== (width === 390 ? 'mobile-chromium' : 'chromium'));
      test.setTimeout(60_000);
      const copy = locale === 'ar' ? homeAr : homeEn;
      const about = locale === 'ar' ? aboutAr : aboutEn;
      const errors = collectErrors(page);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await catalogueServer(context);
      await seedRouting(page, 'anonymous', locale);
      await page.goto('/');

      for (const route of ['home', 'about'] as const) {
        const section = page.locator('.leadership-stack');
        const deck = section.locator('.leadership-deck');
        const next = page.locator(route === 'home' ? '.home-films' : '.about-journey');
        const storyLink = section.getByRole('link', { name: copy.about.readMore });
        await expect(section.getByRole('heading', { level: 2 })).toHaveText(copy.leadership.title);
        await expect(section.locator('.leadership-eyebrow')).toHaveText(route === 'home' ? copy.leadership.eyebrow : about.leadership.eyebrow);
        if (route === 'home') await expect(storyLink).toHaveAttribute('href', '/about');
        else await expect(section.locator('.leadership-intro')).toHaveText(about.leadership.intro);
        await expect(section).toHaveCSS('direction', locale === 'ar' ? 'rtl' : 'ltr');
        await page.evaluate(() => document.fonts.ready);
        await expect(deck).toHaveAttribute('data-stacking', 'true');
        const scrollContainers = await deck.evaluate((element) => {
          const ancestors: string[] = [];
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const { overflowX, overflowY } = getComputedStyle(parent);
            if ([overflowX, overflowY].some(overflow => ['auto', 'hidden', 'scroll'].includes(overflow))) {
              ancestors.push(parent.tagName);
            }
          }
          return ancestors;
        });
        expect(scrollContainers).toEqual([]);

        const cards = deck.getByRole('article');
        const ids = ['ceo', 'strategy', 'legal'] as const;
        const surfaces = ['rgb(19, 50, 74)', 'rgb(248, 247, 244)', 'rgb(255, 255, 255)'];
        for (const [index, id] of ids.entries()) {
          const person = copy.leadership[id];
          const card = cards.nth(index);
          await expect(card.getByRole('heading')).toHaveText(person.name);
          await expect(card.locator('.leadership-card-index')).toHaveText(`0${index + 1}`);
          await expect(card.locator('.leadership-card-role')).toHaveText(person.role);
          await expect(card.locator('.leadership-card-portrait span')).toHaveText(person.initials);
          await expect(card.locator('.leadership-card-portrait svg')).toHaveCSS('stroke', 'rgb(191, 174, 137)');
          await expect(card.locator('.leadership-card-panel')).toHaveCSS('background-color', surfaces[index]!);
          await expect(card.locator('.leadership-statement')).toHaveText(person.statement);
          await expect(card.locator('.leadership-bio')).toHaveText(about.leadership[id]);
          await scrollToCard(deck, index);
          await expect.poll(() => shownLayers(deck, index)).toEqual({ pinned: true, visible: true, aligned: true, fits: true, uncoveredBody: true });
          if (index > 0) {
            await expect(cards.nth(index - 1).locator('.leadership-card-body')).toHaveCSS('--leadership-dim', '0.12');
            await expect(cards.nth(index - 1).locator('.leadership-card-content')).toHaveCSS('transform', 'matrix(0.97, 0, 0, 0.97, 0, 0)');
          }
          await page.screenshot({ path: info.outputPath(`${route}-${locale}-${width}-card-0${index + 1}.png`) });
        }

        await cards.first().getByRole('button').click();
        await expect(page.locator('html')).not.toHaveClass(/\blenis-smooth\b/);
        await expect.poll(async () => (await shownLayers(deck, 0)).uncoveredBody).toBe(true);
        await expect(cards.first().locator('.leadership-card-body')).toHaveCSS('--leadership-dim', '0');
        await scrollToCard(deck, 2);
        await deck.evaluate((element) => {
          const last = element.querySelector('.leadership-deck-card--legal .leadership-card-panel')!;
          const release = element.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
          window.scrollTo({ top: scrollY + release + 36, behavior: 'instant' });
        });
        await expect.poll(() => deck.evaluate((element) => {
          const cards = [...element.querySelectorAll('.leadership-deck-card')];
          const bars = [...element.querySelectorAll('.leadership-card-bar')].map(bar => bar.getBoundingClientRect());
          const released = cards.every(card => card.getBoundingClientRect().top < parseFloat(getComputedStyle(card).top));
          return { released, gaps: bars.slice(1).map((bar, index) => Math.round(bar.top - bars[index]!.bottom)) };
        })).toEqual({ released: true, gaps: [0, 0] });

        await next.evaluate((element) => window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight * 0.55, behavior: 'instant' }));
        await expect(next).toBeInViewport();
        const nextTop = await next.evaluate(element => element.getBoundingClientRect().top);
        const deckBottom = await deck.evaluate(element => element.getBoundingClientRect().bottom);
        expect(deckBottom).toBeLessThan(nextTop);
        await page.screenshot({ path: info.outputPath(`${route}-${locale}-${width}-handoff.png`) });
        if (route === 'home') {
          await storyLink.click();
          await expect(page).toHaveURL(/\/about$/);
        }
      }

      await page.goBack();
      await expect(page.locator('#about .leadership-deck')).toHaveAttribute('data-stacking', 'true');
      await scrollToCard(page.locator('#about .leadership-deck'), 2);
      await expect.poll(async () => (await shownLayers(page.locator('#about .leadership-deck'), 2)).visible).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

test('leadership cards use editorial flow when the stack cannot fit or motion is reduced', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.setViewportSize({ width: 390, height: 390 });
  await catalogueServer(context);
  await seedRouting(page, 'anonymous', 'en');
  await page.goto('/');
  const deck = page.locator('.leadership-deck');
  const first = deck.getByRole('article').first();
  await expect(first).toHaveCSS('position', 'static');
  await expect(first.getByRole('button')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(first).toHaveCSS('position', 'sticky');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(first).toHaveCSS('position', 'static');
  await expect(first.locator('.leadership-card-content')).toHaveCSS('transform', 'none');
});
