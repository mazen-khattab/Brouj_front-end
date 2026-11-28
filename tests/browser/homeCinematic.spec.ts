import type { Locator, Page } from '@playwright/test';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import { expect, profileRoute, test } from './sessionFixtures';
import { legalBooklet } from '../../src/data/legalBooklet';
import homeAr from '../../src/i18n/locales/ar/home.json' with { type: 'json' };
import homeEn from '../../src/i18n/locales/en/home.json' with { type: 'json' };

async function align(section: Locator, inset: number) {
  await section.evaluate((element, top) => window.scrollTo({
    top: scrollY + element.getBoundingClientRect().top - top,
    behavior: 'instant',
  }), inset);
}

async function wheelTo(page: Page, top: number) {
  const readDistance = async () => Math.round(top - await page.evaluate(() => scrollY));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const distance = await readDistance();
    if (Math.abs(distance) < 3) return;
    const count = Math.ceil(Math.abs(distance) / 105);
    for (let step = 1; step <= count; step += 1) {
      await page.mouse.wheel(0, Math.round(distance * step / count) - Math.round(distance * (step - 1) / count));
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    await expect(page.locator('html')).not.toHaveClass(/\blenis-smooth\b/);
  }
  expect(Math.abs(await readDistance())).toBeLessThan(3);
}

function rotation(sheet: Locator) {
  return sheet.evaluate(element => {
    const transform = new DOMMatrix(getComputedStyle(element).transform);
    return Math.atan2(-transform.m13, transform.m11) * 180 / Math.PI;
  });
}

for (const locale of ['ar', 'en'] as const) {
  for (const width of [1440, 390]) {
    test(`cinematic Home in ${locale} at ${width}px`, async ({ page, context }, info) => {
      const mobile = width === 390;
      test.skip(info.project.name !== (mobile ? 'mobile-chromium' : 'chromium'));
      test.setTimeout(75_000);
      const copy = locale === 'ar' ? homeAr : homeEn;
      const errors: string[] = [];
      const termsRequests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        const anonymousProfile = /401/.test(message.text()) && profileRoute.test(message.location().url);
        if ((message.type() === 'error' && !anonymousProfile) || /INVALID_OPERATION|WebGL.*(?:error|warning)/i.test(message.text())) {
          errors.push(message.text());
        }
      });
      page.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/api/v1/terms-and-conditions')) termsRequests.push(request.url());
      });
      await page.setViewportSize({ width, height: mobile ? 844 : 1000 });
      const server = await catalogueServer(context);
      server.state.regularProjectCount = 4;
      await seedRouting(page, 'anonymous', locale);
      await page.goto('/');

      const hero = page.locator('.home-hero');
      const projects = page.locator('#initiatives');
      const booklet = page.locator('#booklet');
      await expect(hero.getByRole('heading', { level: 1 })).toHaveText(copy.hero.title);
      await expect(projects.getByRole('article')).toHaveCount(3);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect.poll(() => hero.locator('video').first().evaluate(video => video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.home-page canvas, .home-companion, .home-model-toggle')).toHaveCount(0);
      await expect(hero.getByRole('link', { name: copy.hero.explore })).toBeVisible();
      expect(await hero.locator('.hero-film-video').evaluate(video =>
        video.getBoundingClientRect().width === video.closest('.home-hero')?.getBoundingClientRect().width,
      )).toBe(true);
      await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
      await page.screenshot({ path: info.outputPath('01-hero.png'), scale: 'css' });

      await align(projects, mobile ? 35 : 95);
      expect(await projects.locator('.home-carousel-viewport').evaluate(carousel => {
        const bounds = carousel.getBoundingClientRect();
        const container = carousel.closest('.home-container')!.getBoundingClientRect();
        return bounds.left === container.left && bounds.right === container.right;
      })).toBe(true);
      const projectImages = await projects.locator('.home-project-image img').all();
      for (const image of projectImages) {
        await expect(image).toHaveCSS('clip-path', 'inset(0px)');
      }
      for (const image of projectImages.slice(0, mobile ? 1 : 3)) {
        await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
        await image.evaluate((element: HTMLImageElement) => element.decode());
      }
      await page.screenshot({ path: info.outputPath('02-initiative-projects.png'), scale: 'css' });

      await expect(booklet.getByRole('heading', { level: 2 })).toHaveText(legalBooklet.title[locale]);
      await expect(booklet.locator('.booklet-cover-content bdi')).toHaveText(legalBooklet.documentCode);
      if (mobile) {
        await expect(booklet.locator('.pin-spacer')).toHaveCount(0);
        await align(booklet.locator('.booklet-runway'), 95);
      } else {
        await expect(booklet).toHaveAttribute('data-scroll-linked', 'true');
        await align(booklet.locator('.pin-spacer'), 290);
      }
      await page.screenshot({ path: info.outputPath('03-booklet-cover.png'), scale: 'css' });

      const chapterButton = (index: number) => {
        const chapter = legalBooklet.chapters[index - 1]!;
        return booklet.getByRole('button', { name: `${chapter.index} ${chapter.title[locale]}` });
      };
      const expectChapter = async (index: number) => {
        await expect(booklet).toHaveAttribute('data-page', String(index));
        await expect(chapterButton(index)).toHaveAttribute('aria-pressed', 'true');
        await expect(booklet.getByRole('heading', { name: legalBooklet.chapters[index - 1]!.title[locale] })).toBeVisible();
      };
      const expectSettledChapter = async (index: number) => {
        await expectChapter(index);
        if (!mobile) await expect(page.locator('html')).not.toHaveClass(/\blenis-smooth\b/);
        const sheet = booklet.locator('.booklet-sheet').nth(mobile ? index : index - 1);
        await expect.poll(async () => Math.abs(await rotation(sheet))).toBeCloseTo(mobile ? 0 : index === 1 ? 175 : 180, 0);
      };
      if (mobile) {
        await booklet.getByRole('button', { name: copy.terms.open }).tap();
        await expectSettledChapter(1);
        await expect(booklet.locator('.booklet-back').first()).toHaveCSS('display', 'none');
        await align(booklet.locator('.booklet-reader'), 100);
      } else {
        const runway = booklet.locator('.booklet-runway');
        const { start, distance } = await runway.evaluate((element: HTMLElement) => {
          const spacer = element.parentElement!;
          const header = document.querySelector('.home-shell > header')!.getBoundingClientRect().height;
          const inset = Math.round((innerHeight + header - element.offsetHeight) / 2);
          return {
            start: spacer.getBoundingClientRect().top + scrollY - inset,
            distance: spacer.offsetHeight - element.offsetHeight,
          };
        });
        expect(distance).toBeGreaterThan(3 * 1000);
        await page.mouse.move(width / 2, 480);
        const sheet = booklet.locator('.booklet-sheet').nth(1);
        const chapterStops = [0.20, 0.43, 0.67, 0.90];
        const [beforeEdge, afterEdge] = [0.31, 0.32];
        const stops = [0.20, beforeEdge, afterEdge, 0.43, 0.67, 0.90, 0.67, 0.43, afterEdge, beforeEdge, 0.20];
        for (const progress of stops) {
          await wheelTo(page, start + distance * progress);
          await expect(runway).toHaveCSS('position', 'fixed');
          if (progress === beforeEdge || progress === afterEdge) {
            const outgoing = progress === beforeEdge;
            await expectChapter(outgoing ? 1 : 2);
            await expect(sheet).toHaveCSS('z-index', outgoing ? '4' : '2');
            await expect.poll(async () => Math.abs(await rotation(sheet))).toBeGreaterThan(outgoing ? 70 : 91);
            await expect.poll(async () => Math.abs(await rotation(sheet))).toBeLessThan(outgoing ? 89 : 110);
          } else {
            const chapter = chapterStops.indexOf(progress) + 1;
            await expectSettledChapter(chapter);
            if (chapter === 4) await page.screenshot({ path: info.outputPath('booklet-chapter-04.png'), scale: 'css' });
          }
        }
        await expect.poll(() => rotation(booklet.locator('.booklet-hardcover'))).toBeCloseTo(locale === 'ar' ? 175 : -175, 0);
      }
      await page.screenshot({ path: info.outputPath('04-booklet-open.png'), scale: 'css' });

      const chapterOneScroll = await page.evaluate(() => scrollY);
      await chapterButton(3).click();
      await expectSettledChapter(3);
      if (!mobile) {
        expect(await page.evaluate(() => scrollY)).toBeGreaterThan(chapterOneScroll + 1000);
      }
      await chapterButton(1).click();
      await expectSettledChapter(1);
      await booklet.locator('.booklet-front[aria-hidden="false"]').click();
      await expectSettledChapter(2);
      await booklet.getByRole('button', { name: copy.terms.previous }).click();
      await expectSettledChapter(1);
      await booklet.getByRole('button', { name: copy.terms.next }).click();
      await expectSettledChapter(2);

      const deck = page.locator('#about .leadership-deck');
      await expect(deck).toHaveAttribute('data-stacking', 'true');
      await deck.evaluate((element) => {
        const card = element.querySelector('.leadership-deck-card--legal')!;
        const marker = card.previousElementSibling!;
        window.scrollTo({ top: scrollY + marker.getBoundingClientRect().top - parseFloat(getComputedStyle(card).top) + 24, behavior: 'instant' });
      });
      await expect.poll(() => deck.locator('.leadership-card-bar').evaluateAll(bars => bars.every((bar) => {
        const box = bar.getBoundingClientRect();
        const point = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return point && bar.contains(point);
      }))).toBe(true);
      await expect(page.locator('.cinema-stage .cinema-panel')).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('05-leadership.png'), scale: 'css' });
      await page.locator('.cinema-chapters button').last().click();
      await expect(page.locator('.cinema-stage .cinema-panel').last()).toHaveAttribute('data-active', 'true');
      await expect(page.locator('.cinema-stage')).toHaveCSS('clip-path', 'inset(0%)');

      const works = page.locator('#regular-projects');
      await align(works.getByRole('heading', { level: 2 }), 160);
      await expect(works.locator('.home-project-image img').first()).toHaveCSS('clip-path', 'inset(0px)');
      await page.screenshot({ path: info.outputPath('06-works.png'), scale: 'css' });
      const contact = page.locator('#contact');
      await align(contact.getByRole('heading', { level: 2 }), 130);
      await expect(contact.locator('[data-contact-form]').last()).toHaveCSS('opacity', '1');
      await page.screenshot({ path: info.outputPath('07-contact.png'), scale: 'css' });
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await expect(page.locator('.home-footer')).toBeInViewport();
      expect(termsRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      await booklet.getByRole('link', { name: copy.terms.read }).click();
      await expect(page).toHaveURL(/\/terms$/);
      await expect.poll(() => termsRequests.length).toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });
  }
}

test('Home booklet and forms support reduced motion', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await catalogueServer(context);
  await seedRouting(page, 'anonymous', 'en');
  await page.goto('/');
  const booklet = page.locator('#booklet');
  await expect(booklet.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('.hero-film-video')).toHaveJSProperty('paused', true);
  await booklet.getByRole('button', { name: homeEn.terms.open }).click();
  await expect(booklet.getByRole('heading', { name: legalBooklet.chapters[0]!.title.en })).toBeVisible();
  await expect(page.locator('[data-contact-form]').first()).toHaveCSS('opacity', '1');
});
