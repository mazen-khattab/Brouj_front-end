import { test, expect, profileRoute } from './sessionFixtures';
import { seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/about.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/about.json' with { type: 'json' };

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`About page ${locale} at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium');
      const copy = locale === 'en' ? en : ar;
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401')))
          errors.push(message.text());
        if (/webgl.*(error|warning)|INVALID_OPERATION/i.test(message.text())) errors.push(message.text());
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.addInitScript(() => {
        if (!window.WebGL2RenderingContext) return;
        const original = WebGL2RenderingContext.prototype.drawElements;
        WebGL2RenderingContext.prototype.drawElements = function (...args) {
          if (this.canvas instanceof HTMLCanvasElement)
            this.canvas.dataset.draws = String(Number(this.canvas.dataset.draws ?? 0) + 1);
          original.apply(this, args);
        };
      });
      await seedRouting(page, 'anonymous', locale);
      await page.goto('/about');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.hero.title);
      await expect(page.locator('.about-page')).toHaveCSS('direction', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.about-sculpture')).toHaveCSS('opacity', '1');
      const canvas = page.locator('.about-canvas canvas');
      if (width === 1440) {
        await expect(canvas).toBeVisible();
        await expect.poll(() => canvas.getAttribute('data-draws').then(Number)).toBeGreaterThan(0);
        const resting = Number(await canvas.getAttribute('data-draws'));
        await page.mouse.move(1000, 350);
        await expect.poll(() => canvas.getAttribute('data-draws').then(Number)).toBeGreaterThan(resting);
      } else {
        await expect(canvas).toHaveCount(0);
        await expect(page.locator('.about-sculpture-fallback')).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath(`about-hero-${locale}-${width}.png`), animations: 'disabled' });
      await expect(page.locator('.leadership-deck-card')).toHaveCount(3);
      await expect(page.locator('.about-timeline li')).toHaveCount(4);
      await expect(page.locator('.about-closing a').first()).toHaveAttribute('href', '/projects?projectType=1');
      await expect(page.locator('.about-closing a').last()).toHaveAttribute('href', '/terms');
      await page.locator('.about-closing').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('[data-about-reveal]').evaluateAll(elements => elements.every(el => Number(getComputedStyle(el).opacity) === 1))).toBe(true);
      const sections = await page.locator('.about-page > section').evaluateAll(elements => elements.map(el => {
        const rect = el.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, width: rect.width };
      }));
      sections.slice(1).forEach((section, index) => expect(section.top).toBeGreaterThanOrEqual(sections[index]!.bottom - 1));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.about-page').evaluate(el => [...el.querySelectorAll('h1,h2,h3,p,a')].some(node => node.scrollWidth > node.clientWidth + 2))).toBe(false);
      await page.screenshot({ path: info.outputPath(`about-full-${locale}-${width}.png`), fullPage: true, animations: 'disabled', style: '.home-shell > header, a[href="#route-content"] { visibility: hidden; }' });
      if (width === 1440) {
        await canvas.dispatchEvent('webglcontextlost');
        await expect(canvas).toHaveCount(0);
        await expect(page.locator('.about-sculpture-fallback')).toBeVisible();
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(canvas).toHaveCount(0);
      await expect(page.locator('.about-scroll > span')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('.about-sculpture')).toHaveCSS('opacity', '1');
      expect(errors).toEqual([]);
    });
  }
}

test('About page survives unavailable WebGL and route changes', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium');
  await seedRouting(page);
  await page.addInitScript(() => { Object.defineProperty(window, 'WebGL2RenderingContext', { value: undefined }); });
  await page.goto('/about');
  await expect(page.locator('.about-sculpture-fallback')).toBeVisible();
  await expect(page.locator('.about-canvas')).toHaveCount(0);
  await page.locator('.about-closing a').last().click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
});
