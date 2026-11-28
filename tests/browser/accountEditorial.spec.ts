import { expect, test } from './test';
import { accountServer } from './accountFixtures';
import { seedRouting } from './routingFixtures';

for (const language of ['ar', 'en'] as const) {
  test(`architectural account in ${language}`, async ({ page, context }, info) => {
    await accountServer(context);
    await seedRouting(page, 'customer', language);
    const width = info.project.name === 'mobile-chromium' ? 390 : 1440;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/account');
    const tabs = page.locator('.account-tabs');
    const header = page.getByRole('banner');
    await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    for (const [path, route, ready] of [
      ['/account', 'profile', '#profile-fName'],
      ['/account/reservations', 'reservations', '.account-record'],
      ['/account/orders', 'orders', '.account-record'],
    ] as const) {
      const tab = tabs.locator(`a[href="${path}"]`);
      if (route !== 'profile') await tab.click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(await tab.innerText());
      await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(tab).toHaveAttribute('aria-current', 'page');
      await expect(page.locator(ready)).toBeVisible();
      await expect(page.locator('.account-panel').first()).toHaveCSS('border-radius', '0px');
      await expect(page.locator('.account-hero')).toHaveCSS('background-color', 'rgb(19, 50, 74)');
      const underline = await tab.evaluate((element) => {
        const style = getComputedStyle(element, '::after');
        return [style.height, style.backgroundColor];
      });
      expect(underline).toEqual(['2px', 'rgb(191, 174, 137)']);
      await expect(page.locator('.account-content')).toHaveCSS('opacity', '1');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: info.outputPath(`${language}-${width}-${route}.png`), fullPage: true, scale: 'css' });

      if (route === 'profile') {
        const first = await page.locator('#profile-fName').boundingBox();
        const last = await page.locator('#profile-lName').boundingBox();
        expect(first).toBeTruthy();
        expect(last).toBeTruthy();
        if (width === 390) {
          expect(first!.y + first!.height).toBeLessThan(last!.y);
          expect(first!.x).toBeCloseTo(last!.x);
        } else {
          expect(first!.y).toBeCloseTo(last!.y);
          const [left, right] = language === 'ar' ? [last!, first!] : [first!, last!];
          expect(left.x + left.width).toBeLessThan(right.x);
        }
      } else {
        const status = page.locator('#account-status');
        await status.focus();
        await status.selectOption('2');
        await expect(page.locator('.account-empty h2')).toHaveText(language === 'ar' ? 'لا يوجد ما يُعرض بعد' : 'Nothing to show yet');
        await expect(page.locator('.account-empty a')).toHaveAttribute('href', '/projects');
        await expect(status).toBeFocused();
        await page.screenshot({ path: info.outputPath(`${language}-${width}-${route}-empty.png`), fullPage: true, scale: 'css' });
      }
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await tabs.locator('a[href="/account"]').click();
    await expect(page.locator('#profile-fName')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('transform', 'none');
    expect(consoleErrors).toEqual([]);
  });
}
