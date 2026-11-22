import { test, expect } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`film showcase ${locale} at ${width}px`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      await page.setViewportSize({ width, height: 1000 });
      await catalogueServer(context);
      await seedRouting(page, 'anonymous', locale);
      await page.goto('/');
      const section = page.locator('.home-films');
      await section.scrollIntoViewIfNeeded();
      const cards = section.locator('.home-film-trigger');
      await expect(cards).toHaveCount(2);
      await expect(section.locator('.film-description')).toHaveCount(2);
      await expect.poll(() => section.locator('.film-duration').first().textContent()).toMatch(/^\d{2}:\d{2}$/);
      await cards.first().hover();
      if (width === 1440) {
        const panels = section.locator('.cinema-panel');
        await expect.poll(async () => (await panels.first().boundingBox())!.width / (await section.locator('.cinema-stage').boundingBox())!.width).toBeGreaterThan(.63);
        await cards.last().hover();
        await expect.poll(async () => (await panels.last().boundingBox())!.width / (await section.locator('.cinema-stage').boundingBox())!.width).toBeGreaterThan(.63);
        await cards.first().focus();
        await expect(panels.first()).toHaveAttribute('data-active','true');
      }
      await expect(section.locator('.home-play').first()).toHaveCSS('backdrop-filter', 'blur(12px)');
      for (const card of await cards.all()) {
        await card.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect.poll(() => dialog.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(card).toBeFocused();
      }
      await expect.poll(() => section.locator('.cinema-panel[data-active="true"] .film-description').evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1);
      const clipped = await section.locator('.home-film-copy').evaluateAll(elements => elements.some(el => el.scrollWidth > el.clientWidth + 1));
      expect(clipped).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      await section.screenshot({ path: info.outputPath(`films-${locale}-${width}.png`), animations:'disabled',
        style: '.home-shell > header { visibility:hidden; } body > a { visibility:hidden; }' });
    });
  }
}
