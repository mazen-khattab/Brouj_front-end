import { test, expect, profileRoute, sessionCors } from './sessionFixtures';
import { mkdir } from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';
import { catalogueIds as ids, catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };
import enProjects from '../../src/i18n/locales/en/projects.json' with { type: 'json' };
import arProjects from '../../src/i18n/locales/ar/projects.json' with { type: 'json' };

async function citiesServer(context: BrowserContext) {
  await catalogueServer(context);
  const state = { fail: false };
  const calls: URL[] = [];
  const names = ['Cairo', 'Alexandria', 'El-sadat', 'العاصمة الجديدة', 'Luxor', 'Aswan', 'Giza', 'New Cairo', 'Mansoura'];
  await context.route(/https:\/\/localhost:7249\/api\/v1\/cities(?:\?|$)/, async route => {
    const url = new URL(route.request().url()); calls.push(url);
    if (state.fail) return route.fulfill({ status: 503, headers: sessionCors, json: { status: 503 } });
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
    const items = names.map((name, index) => ({ id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name }))
      .filter(city => city.name.toLowerCase().includes(search));
    return route.fulfill({ headers: sessionCors, json: { success: true, message: null, data: {
      items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize,
      totalCount: items.length, totalPages: Math.ceil(items.length / pageSize),
    } } });
  });
  return { state, calls };
}

for (const language of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`cities list ${language} at ${width}px preserves search and pagination`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      test.setTimeout(60000);
      const labels = language === 'en' ? en : ar;
      const copy = language === 'en' ? enProjects : arProjects;
      const errors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      const server = await citiesServer(context);
      await seedRouting(page, 'anonymous', language);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto('/cities?pageSize=3');
      await expect(page.locator('.cities-index h1')).toHaveText(language === 'en' ? 'Cities' : 'المدن');
      await expect(page.locator('.city-eyebrow')).toHaveText(labels.exploreDestinations);
      await expect(page.locator('.city-intro')).toHaveText(labels.cityDetailIntro);
      await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.locator('.cities-directory-card')).toHaveCount(3);
      await expect(page.locator('.cities-directory-card').last()).toHaveCSS('opacity', '1');
      await expect(page.locator('.cities-directory-card h2').first()).toHaveCSS('direction', language === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('link', { name: 'Cairo', exact: true })).toHaveAttribute('href', `/cities/${ids.city}`);
      const filters = page.locator('.cities-directory-filters');
      const toggle = filters.getByRole('button', { name: copy.filters.toggle, exact: true });
      const openFilters = async () => {
        if (width === 390 && await toggle.getAttribute('aria-expanded') === 'false') {
          await toggle.click();
          await expect(filters).toHaveAttribute('data-settled', 'true');
        }
      };
      if (width === 390) {
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('.projects-filter-grid')).toHaveAttribute('inert');
        await expect(filters.locator('.projects-filter-count')).toHaveCount(0);
        expect((await filters.boundingBox())!.height).toBeLessThan(70);
      } else await expect(filters).toHaveCSS('position', 'sticky');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0); });
      await mkdir('docs/evidence/cities-list', { recursive: true });
      await page.screenshot({ path: `docs/evidence/cities-list/${language}-${width}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
      await openFilters();
      if (width === 390) {
        const panel = (await filters.boundingBox())!;
        expect((await page.locator('.cities-directory-results').boundingBox())!.y).toBeGreaterThanOrEqual(panel.y + panel.height);
      }
      const search = page.getByRole('searchbox', { name: labels.search, exact: true });
      await search.fill('Alexandria');
      await expect(page.locator('.cities-directory-card')).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'Alexandria', exact: true })).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Alexandria');
      if (width === 390) {
        await expect(filters.locator('.projects-filter-count')).toHaveText(new Intl.NumberFormat(language).format(1));
        await search.focus(); await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await openFilters();
      }
      await filters.getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(search).toHaveValue('');
      await expect(page.locator('.cities-directory-card')).toHaveCount(3);
      expect(new URL(page.url()).searchParams.has('search')).toBe(false);
      const pagination = page.locator('.projects-pagination nav');
      await pagination.getByRole('button').last().click();
      await expect(page.getByRole('link', { name: 'العاصمة الجديدة', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
      await page.goBack();
      await expect(page.getByRole('link', { name: 'Cairo', exact: true })).toBeVisible();
      await openFilters();
      await search.fill('absent');
      await expect(page.locator('.cities-directory-empty')).toBeVisible();
      await page.locator('.cities-directory-empty').getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(page.locator('.cities-directory-card')).toHaveCount(3);
      await openFilters();
      await expect(search).toHaveValue('');
      await page.getByLabel(labels.pageSize, { exact: true }).selectOption('12');
      await expect(page.locator('.cities-directory-card')).toHaveCount(9);
      expect(server.calls.every(url => [...url.searchParams.keys()].every(key => ['pageNumber', 'pageSize', 'search'].includes(key)))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.cities-directory-card').evaluateAll(cards => cards.some(card => card.scrollWidth > card.clientWidth + 1))).toBe(false);
      if (width === 1440) {
        await page.evaluate(() => scrollTo(0, 500));
        await expect.poll(async () => Math.round((await filters.boundingBox())!.y)).toBe(await filters.evaluate(el => Math.round(parseFloat(getComputedStyle(el).top))));
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.cities-directory-card').first()).toHaveCSS('opacity', '1');
      await page.getByRole('link', { name: 'Cairo', exact: true }).click();
      await expect(page.locator('.city-hero h1')).toHaveText('Cairo');
      await expect(page).toHaveURL(new RegExp(`/cities/${ids.city}`));
      expect(errors).toEqual([]);
    });
  }
}

test('cities list retries a failed directory without losing the hero or search', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromium');
  const server = await citiesServer(context);
  server.state.fail = true;
  await seedRouting(page);
  await page.goto('/cities?search=Cairo');
  await expect(page.locator('.cities-index h1')).toHaveText('Cities');
  await expect(page.getByText(en.errorTitle, { exact: true })).toBeVisible();
  server.state.fail = false;
  await page.getByRole('button', { name: en.retry, exact: true }).click();
  await expect(page.getByRole('link', { name: 'Cairo', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('search')).toBe('Cairo');
});
