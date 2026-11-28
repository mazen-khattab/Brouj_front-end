import { test, expect, profileRoute } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/auth.json' with { type: 'json' };

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`auth editorial ${locale} at ${width}px`, async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium');
      test.setTimeout(60_000);
      const copy = locale === 'en' ? en : ar;
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await seedRouting(page, 'anonymous', locale);
      for (const [mode, path, title] of [
        ['customer', '/login?returnTo=%2Faccount', copy.customerTitle],
        ['register', '/register?returnTo=%2Faccount', copy.registerTitle],
        ['staff', '/admin/login?returnTo=%2Fadmin', copy.staffTitle],
      ] as const) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
        await expect(page.locator('#auth-email')).toBeEnabled();
        await expect.poll(() => page.locator('.auth-title-mask h1').evaluate(el => Math.round(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42))).toBe(0);
        await expect(page.locator('#auth-email')).toHaveCSS('border-radius', '2px');
        await expect(page.locator('#auth-email')).toHaveAttribute('dir', 'ltr');
        await expect(page.locator('.auth-page')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        if (width === 1440) {
          await expect(page.locator('.auth-story')).toBeVisible();
          await expect(page.locator('.auth-story-copy > p').first()).toHaveCSS('opacity', '1');
          const story = (await page.locator('.auth-story').boundingBox())!;
          const form = (await page.locator('.auth-form-region').boundingBox())!;
          expect(story.x + story.width <= form.x + 1 || form.x + form.width <= story.x + 1).toBe(true);
        } else await expect(page.locator('.auth-story')).toBeHidden();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator('.auth-form-panel').evaluate(el => [...el.querySelectorAll('input,button,h1,p')].some(node => node.scrollWidth > node.clientWidth + 2))).toBe(false);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: info.outputPath(`auth-${mode}-${locale}-${width}.png`), fullPage: true, animations: 'disabled', style: 'a[href="#route-content"] { visibility: hidden; }' });
        if (mode === 'customer') {
          await page.locator('#auth-email').fill('visitor@example.test');
          await page.locator('.auth-header button').click();
          await expect(page.locator('#auth-email')).toHaveValue('visitor@example.test');
          await expect(page.locator('.auth-alternatives a').first()).toHaveAttribute('href', '/register?returnTo=%2Faccount');
          await page.locator('.auth-header button').click();
          await page.locator('#auth-email').fill('');
        }
        await page.getByRole('button', { name: mode === 'register' ? copy.register : copy.signIn, exact: true }).click();
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.locator(mode === 'register' ? '#auth-fName' : '#auth-email')).toBeFocused();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.locator('.auth-title-mask h1')).toBeVisible();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
      expect(errors).toEqual([]);
    });

    test(`loading states ${locale} at ${width}px`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await seedRouting(page, 'anonymous', locale);
      await catalogueServer(context);
      let releaseLogin!: () => void;
      const loginGate = new Promise<void>(resolve => { releaseLogin = resolve; });
      await page.route(/\/src\/Features\/Authentication\/Customer\/LoginPage\.tsx(?:\?.*)?$/, async route => {
        await loginGate; await route.continue();
      });
      try {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        const full = page.locator('.page-loading--full');
        await expect(full).toBeVisible();
        await expect(full).toHaveAttribute('role', 'status');
        await expect(full).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`loading-full-${locale}-${width}.png`), animations: 'disabled' });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(full.locator('.page-loading-pillars i').first()).toHaveCSS('animation-name', 'none');
      } finally { releaseLogin(); }
      await expect(page.locator('#auth-email')).toBeEnabled();
      let releaseProjects!: () => void;
      const projectGate = new Promise<void>(resolve => { releaseProjects = resolve; });
      await page.route(/\/src\/Features\/Projects\/Public\/ProjectPage\.tsx(?:\?.*)?$/, async route => {
        await projectGate; await route.continue();
      });
      try {
        await page.goto('/projects', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.page-loading--inline')).toBeVisible();
        await expect(page.locator('.home-shell > header')).toBeVisible();
        await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await page.screenshot({ path: info.outputPath(`loading-inline-${locale}-${width}.png`), animations: 'disabled' });
      } finally { releaseProjects(); }
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}
