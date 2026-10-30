import { expect, test } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';

for (const locale of ['ar', 'en'] as const) {
  test(`welcome page renders in ${locale} over trusted HTTPS`, async ({ page, context }, testInfo) => {
    await catalogueServer(context);
    const errors: string[] = [];
    const apiCalls: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (request.url().includes('/api/')) apiCalls.push(request.url()); });
    await page.addInitScript((language) => { localStorage.setItem('brouj.locale', language); }, locale);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: locale === 'ar' ? 'بروج' : 'Brouj', level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await expect.poll(() => apiCalls.length).toBe(4);
    expect(apiCalls.map((url) => new URL(url).pathname).sort()).toEqual([
      '/api/v1/customers/me', '/api/v1/projects', '/api/v1/terms-and-conditions/current', '/api/v1/users/me',
    ]);
    await page.locator('main img').evaluate(async (node) => {
      if (!(node instanceof HTMLImageElement)) throw new Error('Architectural image is missing.');
      await node.decode();
      if (!node.naturalWidth) throw new Error('Architectural image failed to load.');
    });
    await page.screenshot({ path: testInfo.outputPath(`welcome-${locale}.png`), fullPage: true, animations: 'disabled' });
  });
}
