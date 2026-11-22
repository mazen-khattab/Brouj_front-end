import { test, expect, profileRoute } from './sessionFixtures';
import { catalogueIds, catalogueServer } from './catalogueFixtures';
import { seedRouting } from './routingFixtures';
import en from '../../src/i18n/locales/en/projects.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/projects.json' with { type: 'json' };
import enCatalogue from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import arCatalogue from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 390]) {
    test(`editorial projects ${locale} at ${width}px`, async ({ page, context }, info) => {
      test.skip(info.project.name !== 'chromium');
      test.setTimeout(60_000);
      const copy = locale === 'en' ? en : ar;
      const catalogue = locale === 'en' ? enCatalogue : arCatalogue;
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !(profileRoute.test(message.location().url) && message.text().includes('401'))) errors.push(message.text());
      });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      const server = await catalogueServer(context);
      server.state.regularProjectCount = 5;
      await seedRouting(page, 'anonymous', locale);
      await page.goto(`/projects?search=Garden&cityId=${catalogueIds.city}&projectType=1&pageNumber=2&pageSize=3`);
      const heading = locale === 'en' ? 'Projects' : 'المشروعات';
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.locator('.home-shell > header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      if (width === 390) await page.locator('.mobile-menu-trigger').click();
      const navigation = page.getByRole('navigation', { name: locale === 'en' ? 'Main navigation' : 'التنقل الرئيسي' }).filter({ visible: true });
      await expect(navigation.getByRole('link', { name: heading, exact: true })).toHaveAttribute('href', '/projects');
      if (width === 390) await page.keyboard.press('Escape');
      await expect(page.getByRole('tab', { name: copy.types.initiative, exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
      await expect(page.locator('.projects-card').first()).toHaveCSS('opacity', '1');
      const filters = page.locator('.projects-filters');
      const toggle = page.getByRole('button', { name: copy.filters.toggle, exact: true });
      if (width === 390) {
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('.projects-filter-grid')).toHaveAttribute('inert');
        expect((await filters.boundingBox())!.height).toBeLessThan(70);
      }
      await expect(page.locator('.projects-card').last()).toHaveCSS('opacity', '1');
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      await page.screenshot({ path: info.outputPath(`projects-${locale}-${width}.png`), animations: 'disabled' });
      await page.screenshot({ path: info.outputPath(`projects-full-${locale}-${width}.png`), fullPage: true, animations: 'disabled', style: 'a[href="#route-content"] { visibility: hidden; }' });
      const openFilters = async () => {
        if (width === 390 && await toggle.getAttribute('aria-expanded') !== 'true') {
          await toggle.click();
          await expect(filters).toHaveAttribute('data-settled', 'true');
        }
      };
      await openFilters();
      await expect(page.getByRole('searchbox', { name: catalogue.search, exact: true })).toHaveValue('Garden');
      if (width === 390) {
        const results = (await page.locator('.projects-results').boundingBox())!;
        const panel = (await filters.boundingBox())!;
        expect(results.y).toBeGreaterThanOrEqual(panel.y + panel.height);
        await page.screenshot({ path: info.outputPath(`projects-filters-${locale}-${width}.png`), animations: 'disabled' });
      }
      await page.getByRole('tab', { name: copy.types.regular, exact: true }).click();
      await expect(page.getByRole('link', { name: 'Terrace Residence 1', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('projectType')).toBe('0');
      expect(new URL(page.url()).searchParams.has('search')).toBe(false);
      expect(new URL(page.url()).searchParams.has('cityId')).toBe(false);
      await openFilters();
      const search = page.getByRole('searchbox', { name: catalogue.search, exact: true });
      await expect(search).toHaveValue('');
      await search.fill('Terrace');
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Terrace');
      await page.locator('#filter-city summary').click();
      await page.getByRole('button', { name: catalogue.choose.replace('{{name}}', 'Cairo'), exact: true }).click();
      await page.locator('#filter-area summary').click();
      await page.getByRole('button', { name: catalogue.choose.replace('{{name}}', 'East Quarter'), exact: true }).click();
      await page.getByRole('tab', { name: copy.types.initiative, exact: true }).click();
      await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
      expect(new URL(page.url()).searchParams.get('pageSize')).toBe('3');
      expect(new URL(page.url()).searchParams.has('areaId')).toBe(false);
      await openFilters();
      await expect(search).toHaveValue('Garden');
      await page.getByRole('tab', { name: copy.types.regular, exact: true }).click();
      await expect(page.getByRole('link', { name: 'Terrace Residence 1', exact: true })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('areaId')).toBe(catalogueIds.area);
      await openFilters();
      await expect(search).toHaveValue('Terrace');
      await search.fill('absent');
      await expect(page.locator('.projects-empty')).toBeVisible();
      await filters.getByRole('button', { name: catalogue.clear, exact: true }).click();
      expect(new URL(page.url()).searchParams.get('projectType')).toBe('0');
      await expect(search).toHaveValue('');
      await expect(page.locator('.projects-card')).toHaveCount(5);
      if (width === 390) await toggle.click();
      await expect(page.locator('.projects-card').first()).toHaveCSS('opacity', '1');
      await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: info.outputPath(`projects-regular-${locale}-${width}.png`), animations: 'disabled' });
      if (width === 1440) {
        const catalogueTop = await page.locator('.projects-catalogue').evaluate(el => el.getBoundingClientRect().top + window.scrollY);
        await page.evaluate(top => window.scrollTo({ top: top + 50, behavior: 'instant' }), catalogueTop);
        await expect.poll(async () => Math.round((await filters.boundingBox())!.y)).toBe(
          await filters.evaluate(el => Math.round(parseFloat(getComputedStyle(el).top))),
        );
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.projects-card').evaluateAll(elements => elements.some(el => el.scrollWidth > el.clientWidth + 1))).toBe(false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      if (width === 390) await toggle.click();
      await expect(page.getByRole('searchbox', { name: catalogue.search, exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

test('active project tabs preserve paging and support keyboard navigation', async ({ page, context }) => {
  await seedRouting(page);
  const server = await catalogueServer(context);
  server.state.regularProjectCount = 5;
  await page.goto('/projects?projectType=1&pageNumber=2&pageSize=3');
  const initiative = page.getByRole('tab', { name: en.types.initiative, exact: true });
  await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await initiative.click();
  expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('2');
  await initiative.press('ArrowRight');
  await expect(page.getByRole('tab', { name: en.types.regular, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('link', { name: 'Terrace Residence 1', exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: en.types.all, exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(page.getByRole('tab', { name: en.types.regular, exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
});
