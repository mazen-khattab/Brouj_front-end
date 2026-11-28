import { test, expect, profileRoute } from './sessionFixtures';
import { mkdir } from 'node:fs/promises';
import { catalogueIds as ids, catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import { sessionCors } from './sessionFixtures';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };
import enProjects from '../../src/i18n/locales/en/projects.json' with { type: 'json' };
import arProjects from '../../src/i18n/locales/ar/projects.json' with { type: 'json' };

for (const language of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`city directory ${language} at ${width}px preserves city queries and navigation`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      test.setTimeout(60000);
      const labels = language === 'en' ? en : ar;
      const copy = language === 'en' ? enProjects : arProjects;
      const errors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      await catalogueServer(context);
      const calls: URL[] = [];
      await context.route(/https:\/\/localhost:7249\/api\/v1\/cities\/[^/]+\/areas(?:\?|$)/, async route => {
        const url = new URL(route.request().url()); calls.push(url);
        const cityId = url.pathname.split('/')[4]!;
        const search = url.searchParams.get('search')?.toLowerCase() ?? '';
        const pageNumber = Number(url.searchParams.get('pageNumber') ?? 1);
        const pageSize = Number(url.searchParams.get('pageSize') ?? 12);
        const items = Array.from({ length: cityId === ids.city ? 9 : 4 }, (_, index) => ({
          id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          name: cityId === ids.city ? String(35 + index) : `Harbour ${index + 1}`,
          cityId, cityName: cityId === ids.city ? 'Cairo' : 'Alexandria',
        })).filter(area => area.name.toLowerCase().includes(search));
        await route.fulfill({ headers: sessionCors, json: { success: true, message: null, data: {
          items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), pageNumber, pageSize,
          totalCount: items.length, totalPages: Math.ceil(items.length / pageSize),
        } } });
      });
      await seedRouting(page, 'anonymous', language);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(`/cities/${ids.city}?pageSize=3`);
      await expect(page.locator('.city-hero h1')).toHaveText('Cairo');
      await expect(page.locator('.city-intro')).toHaveText(labels.cityDetailIntro);
      await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect.poll(() => new URL(page.url()).searchParams.get('cityId')).toBe(ids.city);
      await expect(page.locator('.area-directory-card')).toHaveCount(3);
      await expect(page.locator('.area-directory-card').last()).toHaveCSS('opacity', '1');
      await expect(page.locator('.area-directory-card h2').first()).toHaveCSS('direction', language === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.area-directory-city').first()).toHaveCSS('direction', language === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('link', { name: '35', exact: true })).toHaveAttribute('href', `/areas/${ids.area}`);
      const filters = page.locator('.area-directory-filters');
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
        await expect(filters.locator('.projects-filter-count')).toHaveText(new Intl.NumberFormat(language).format(1));
        expect((await filters.boundingBox())!.height).toBeLessThan(70);
      } else await expect(filters).toHaveCSS('position', 'sticky');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0); });
      await mkdir('docs/evidence/city-details', { recursive: true });
      await page.screenshot({ path: `docs/evidence/city-details/${language}-${width}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
      await openFilters();
      if (width === 390) {
        const panel = (await filters.boundingBox())!;
        expect((await page.locator('.area-directory-results').boundingBox())!.y).toBeGreaterThanOrEqual(panel.y + panel.height);
        await page.screenshot({ path: info.outputPath(`city-filters-${language}.png`), fullPage: true, animations: 'disabled' });
      }
      const search = page.getByRole('searchbox', { name: labels.search, exact: true });
      await expect(filters.locator('#filter-city summary')).toContainText('Cairo');
      await search.fill('35');
      await expect(page.locator('.area-directory-card')).toHaveCount(1);
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('35');
      await filters.getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(search).toHaveValue('');
      await expect(page.locator('.area-directory-card')).toHaveCount(3);
      expect(new URL(page.url()).searchParams.get('cityId')).toBe(ids.city);
      const pagination = page.locator('.projects-pagination nav');
      await pagination.getByRole('button').last().click();
      await expect(page.getByRole('link', { name: '38', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
      await page.goBack();
      await expect(page.getByRole('link', { name: '35', exact: true })).toBeVisible();
      await openFilters();
      await filters.locator('#filter-city summary').click();
      await page.getByRole('button', { name: labels.choose.replace('{{name}}', 'Alexandria'), exact: true }).click();
      await expect(page.getByRole('link', { name: 'Harbour 1', exact: true })).toBeVisible();
      await expect.poll(() => new URL(page.url()).searchParams.get('cityId')).toBe(ids.city2);
      expect(calls.some(url => url.pathname.includes(`/cities/${ids.city2}/areas`))).toBe(true);
      await search.fill('absent');
      await expect(page.locator('.area-directory-empty')).toBeVisible();
      await page.locator('.area-directory-empty').getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(page.getByRole('link', { name: '35', exact: true })).toBeVisible();
      await openFilters();
      await expect(search).toHaveValue('');
      await page.getByLabel(labels.pageSize, { exact: true }).selectOption('12');
      await expect(page.locator('.area-directory-card')).toHaveCount(9);
      expect(calls.every(url => [...url.searchParams.keys()].every(key => ['pageNumber', 'pageSize', 'search'].includes(key)))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.area-directory-card').evaluateAll(cards => cards.some(card => card.scrollWidth > card.clientWidth + 1))).toBe(false);
      if (width === 1440) {
        await page.evaluate(() => scrollTo(0, 500));
        await expect.poll(async () => Math.round((await filters.boundingBox())!.y)).toBe(await filters.evaluate(el => Math.round(parseFloat(getComputedStyle(el).top))));
      } else {
        await search.focus(); await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.area-directory-card').first()).toHaveCSS('opacity', '1');
      await page.getByRole('link', { name: '35', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/areas/${ids.area}`));
      await expect(page.locator('.area-hero h1')).toHaveText('East Quarter');
      expect(errors).toEqual([]);
    });
  }
}
