import { test, expect, sessionCors } from './sessionFixtures';
import { mkdir } from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';
import { catalogueIds as ids, catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };

async function areasServer(context: BrowserContext) {
  await catalogueServer(context);
  const state = { fail: false };
  const calls: URL[] = [];
  const names = ['East Quarter', 'Garden District', 'River Quarter', 'الحي الجديد', 'West Quarter'];
  await context.route(/https:\/\/localhost:7249\/api\/v1\/(?:areas|cities\/[^/]+\/areas)(?:\?|$)/, async route => {
    const url = new URL(route.request().url()); calls.push(url);
    if (state.fail) return route.fulfill({ status: 503, headers: sessionCors, json: { status: 503 } });
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
    const items = names.map((name, index) => ({ id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name, cityId: ids.city, cityName: 'Cairo' }))
      .filter(area => area.name.toLowerCase().includes(search));
    return route.fulfill({ headers: sessionCors, json: { success: true, message: null, data: {
      items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize,
      totalCount: items.length, totalPages: Math.ceil(items.length / pageSize),
    } } });
  });
  return { state, calls };
}

for (const language of ['en', 'ar'] as const) {
  for (const width of [1440, 768, 390]) {
    test(`areas list ${language} at ${width}px preserves discovery`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      const labels = language === 'en' ? en : ar;
      const server = await areasServer(context);
      await seedRouting(page, 'anonymous', language);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto('/areas?pageSize=3');
      await expect(page.locator('.areas-index h1')).toHaveText(language === 'en' ? 'Areas' : 'المناطق');
      await expect(page.locator('.areas-index-eyebrow')).toHaveText(labels.exploreNeighborhoods);
      await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.locator('.areas-index-hero')).toHaveCSS('background-color', 'rgb(19, 50, 74)');
      await expect(page.locator('.area-directory-card')).toHaveCount(3);
      await expect(page.locator('.area-directory-card').last()).toHaveCSS('opacity', '1');
      await expect(page.getByRole('link', { name: 'East Quarter', exact: true })).toHaveAttribute('href', `/areas/${ids.area}`);
      const filters = page.locator('.area-directory-filters');
      const toggle = filters.locator('.projects-filters-toggle');
      const openFilters = async () => {
        if (width < 1024 && await toggle.getAttribute('aria-expanded') === 'false') {
          await toggle.click();
          await expect(filters).toHaveAttribute('data-settled', 'true');
        }
      };
      if (width < 1024) {
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(filters.locator('.projects-filter-grid')).toHaveAttribute('inert');
        expect((await filters.boundingBox())!.height).toBeLessThan(70);
      } else await expect(filters).toHaveCSS('position', 'sticky');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0); });
      await mkdir('docs/evidence/areas-list', { recursive: true });
      await page.screenshot({ path: `docs/evidence/areas-list/${language}-${width}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
      await page.locator('.projects-pagination nav').getByRole('button').last().click();
      await expect(page.getByRole('link', { name: 'الحي الجديد', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
      await page.goBack();
      await expect(page.getByRole('link', { name: 'East Quarter', exact: true })).toBeVisible();
      await openFilters();
      const search = page.getByRole('searchbox', { name: labels.search, exact: true });
      await search.fill('Garden');
      await expect(page.locator('.area-directory-card')).toHaveCount(1);
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Garden');
      await page.locator('#filter-city summary').click();
      await page.getByRole('button', { name: labels.choose.replace('{{name}}', 'Cairo'), exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('cityId')).toBe(ids.city);
      await expect.poll(() => server.calls.some(url => url.pathname === `/api/v1/cities/${ids.city}/areas` && url.searchParams.get('search') === 'Garden')).toBe(true);
      await search.fill('absent');
      await expect(page.locator('.area-directory-empty')).toBeVisible();
      await page.locator('.area-directory-empty').getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(page.locator('.area-directory-card')).toHaveCount(3);
      await expect(search).toHaveValue('');
      expect(new URL(page.url()).searchParams.has('cityId')).toBe(false);
      await page.getByLabel(labels.pageSize, { exact: true }).selectOption('12');
      await expect(page.locator('.area-directory-card')).toHaveCount(5);
      if (width < 1024) {
        await search.focus(); await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.area-directory-card').first()).toHaveCSS('opacity', '1');
      await page.getByRole('link', { name: 'East Quarter', exact: true }).click();
      await expect(page.locator('.area-hero h1')).toHaveText('East Quarter');
    });
  }
}

test('areas directory retries without losing its search or hero', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  const server = await areasServer(context);
  server.state.fail = true;
  await seedRouting(page);
  await page.goto('/areas?search=Garden');
  await expect(page.locator('.areas-index h1')).toHaveText('Areas');
  await expect(page.getByText(en.errorTitle, { exact: true })).toBeVisible();
  server.state.fail = false;
  await page.getByRole('button', { name: en.retry, exact: true }).click();
  await expect(page.getByRole('link', { name: 'Garden District', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Garden');
});
