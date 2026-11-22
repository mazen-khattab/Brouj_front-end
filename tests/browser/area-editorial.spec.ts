import { test, expect, profileRoute } from './sessionFixtures';
import { mkdir } from 'node:fs/promises';
import { catalogueIds as ids, catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import { sessionCors } from './sessionFixtures';
import type { AmenityDto } from '../../src/Types/contracts';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };
import enProjects from '../../src/i18n/locales/en/projects.json' with { type: 'json' };
import arProjects from '../../src/i18n/locales/ar/projects.json' with { type: 'json' };

for (const language of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`area workspace ${language} at ${width}px preserves its scope and filters`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      test.setTimeout(60000);
      const labels = language === 'en' ? en : ar;
      const copy = language === 'en' ? enProjects : arProjects;
      const errors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      const server = await catalogueServer(context);
      server.state.regularProjectCount = 5;
      const state: { amenities: readonly AmenityDto[] } = { amenities: [] };
      await context.route(`https://localhost:7249/api/v1/areas/${ids.area}`, route => route.fulfill({ headers: sessionCors,
        json: { success: true, data: { id: ids.area, name: 'East Quarter', cityId: ids.city, cityName: 'Cairo', amenities: state.amenities }, message: null } }));
      await seedRouting(page, 'anonymous', language);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(`/areas/${ids.area}?projectType=1&pageSize=3`);
      await expect(page.locator('.area-hero h1')).toHaveText('East Quarter');
      await expect(page.locator('.area-city-badge')).toHaveText('Cairo');
      await expect(page.locator('.area-city-badge')).toHaveAttribute('href', `/cities/${ids.city}`);
      await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(page.locator('.area-amenities-empty')).toHaveText(labels.areaNoAmenities);
      expect((await page.locator('.area-amenities-band').boundingBox())!.height).toBeLessThan(180);
      await expect(page.locator('.projects-card')).toHaveCount(3);
      await expect(page.locator('.projects-card').last()).toHaveCSS('opacity', '1');
      const filters = page.locator('.projects-filters');
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
      await mkdir('docs/evidence/area-details', { recursive: true });
      await page.screenshot({ path: `docs/evidence/area-details/${language}-${width}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
      await openFilters();
      await expect(page.getByLabel(labels.projectType, { exact: true })).toHaveValue('1');
      if (width === 390) {
        const resultBox = (await page.locator('.projects-results').boundingBox())!;
        const filterBox = (await filters.boundingBox())!;
        expect(resultBox.y).toBeGreaterThanOrEqual(filterBox.y + filterBox.height);
        await page.screenshot({ path: info.outputPath(`area-filters-${language}-390.png`), fullPage: true, animations: 'disabled' });
      }
      await page.getByLabel(labels.projectType, { exact: true }).selectOption('0');
      await expect(page.getByRole('link', { name: 'Terrace Residence 1', exact: true })).toBeVisible();
      const search = page.getByRole('searchbox', { name: labels.search, exact: true });
      await search.fill('Terrace');
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Terrace');
      await page.locator('#filter-city summary').click();
      await page.getByRole('button', { name: labels.choose.replace('{{name}}', 'Cairo'), exact: true }).click();
      await page.locator('#filter-area summary').click();
      await page.getByRole('button', { name: labels.choose.replace('{{name}}', 'East Quarter'), exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('areaId')).toBe(ids.area);
      await expect(page.locator('.projects-card')).toHaveCount(3);
      const pagination = page.locator('.projects-pagination nav');
      await pagination.getByRole('button').last().click();
      await expect(page.getByRole('link', { name: 'Terrace Residence 4', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
      await page.goBack();
      await expect(page.getByRole('link', { name: 'Terrace Residence 1', exact: true })).toBeVisible();
      await openFilters();
      await search.fill('absent');
      await expect(page.locator('.projects-empty')).toBeVisible();
      await page.locator('.projects-empty').getByRole('button', { name: labels.clear, exact: true }).click();
      await expect(page.locator('.projects-card')).toHaveCount(3);
      await openFilters();
      await expect(search).toHaveValue('');
      await expect(page.getByLabel(labels.projectType, { exact: true })).toHaveValue('');
      expect(new URL(page.url()).searchParams.has('cityId')).toBe(false);
      await page.getByLabel(labels.pageSize, { exact: true }).selectOption('12');
      await expect(page.locator('.projects-card')).toHaveCount(12);
      const projectCalls = server.calls.filter(url => url.pathname === '/api/v1/projects');
      expect(projectCalls.length).toBeGreaterThan(4);
      expect(projectCalls.every(url => url.searchParams.get('areaId') === ids.area)).toBe(true);
      expect(projectCalls.some(url => url.searchParams.get('projectType') === '0')).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440) {
        await page.evaluate(() => scrollTo(0, 700));
        await expect.poll(async () => Math.round((await filters.boundingBox())!.y)).toBe(await filters.evaluate(el => Math.round(parseFloat(getComputedStyle(el).top))));
      } else {
        await search.focus();
        await page.keyboard.press('Escape');
        await expect(toggle).toBeFocused();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
      state.amenities = [{ name: 'Transport', value: 'Local connections' }];
      await page.reload();
      await expect(page.locator('.area-amenity-chips')).toContainText('Local connections');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `docs/evidence/area-details/${language}-${width}-amenities.png`, fullPage: true, animations: 'disabled', scale: 'css' });
      expect(errors).toEqual([]);
    });
  }
}
