import { test, expect, profileRoute } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`hero film ${locale} at ${width}px`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        // Anonymous-session fixtures deliberately return 401 for profile reads.
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401')))
          errors.push(message.text());
      });
      await catalogueServer(context);
      await seedRouting(page, 'anonymous', locale);
      await page.goto('/');
      const film = page.locator('.hero-film-video');
      await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0.1);
      expect(await film.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, paused: v.paused, loop: v.loop, inline: v.playsInline, error: v.error })))
        .toEqual({ muted: true, paused: false, loop: false, inline: true, error: null });
      await expect(page.locator('.home-hero-showcase')).toHaveCSS('opacity', '1');
      const stage = (await page.locator('.home-hero-stage').boundingBox())!;
      const copy = (await page.locator('.home-hero-copy').boundingBox())!;
      const cta = (await page.locator('.home-hero-action').boundingBox())!;
      expect(stage.y + stage.height).toBeLessThanOrEqual(width === 390 ? 844 : 900);
      expect(stage.width).toBeGreaterThan(width === 390 ? 340 : 600);
      if (width === 390) expect(stage.y).toBeGreaterThan(cta.y + cta.height);
      else expect(copy.x + copy.width <= stage.x || stage.x + stage.width <= copy.x).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const controls = page.locator('.hero-film-transport button');
      await controls.nth(1).click();
      await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
      await controls.nth(1).click();
      await controls.first().click();
      await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await controls.first().click();
      await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
      const expand = page.locator('.hero-film-expand');
      await expand.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect.poll(() => dialog.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
      expect(await dialog.locator('video').evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
      expect(await film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(expand).toBeFocused();
      await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
      await page.screenshot({ path: info.outputPath(`hero-${locale}-${width}.png`), animations: 'disabled' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.home-hero-showcase')).toHaveCSS('opacity', '1');
      expect(errors).toEqual([]);
    });
  }
}
