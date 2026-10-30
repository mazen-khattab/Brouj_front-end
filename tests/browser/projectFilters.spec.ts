import { expect, test } from '@playwright/test';
import { catalogueIds, catalogueServer } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import { openProjectFilters } from './projectFilterActions';
import en from '../../src/i18n/locales/en/catalogue.json' with { type: 'json' };
import ar from '../../src/i18n/locales/ar/catalogue.json' with { type: 'json' };

for (const language of ['en', 'ar'] as const) {
  test(`project sidebar, searchable lookups and pagination in ${language}`, async ({ page, context }, info) => {
    await routingServer(context);
    const server = await catalogueServer(context);
    await seedRouting(page, 'anonymous', language);
    const copy = language === 'ar' ? ar : en;
    await page.goto('/projects?projectType=1&pageNumber=2&pageSize=3');
    await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
    await openProjectFilters(page);
    const filters = page.getByRole('region', { name: copy.filters, exact: true });
    const city = page.locator('#filter-city summary');
    const area = page.locator('#filter-area summary');
    const fields = [filters.getByLabel(copy.search, { exact: true }), filters.getByLabel(copy.projectType, { exact: true }), city, area];
    const positions = await Promise.all(fields.map(async (field) => (await field.boundingBox())!.y));
    expect(positions.every((top, index) => index === 0 || top > positions[index - 1]!)).toBe(true);
    const controls = page.getByRole('group', { name: copy.resultControls });
    await expect(controls.getByLabel(copy.pageSize)).toHaveValue('3');
    await expect(controls.getByRole('navigation')).toBeVisible();
    await expect(filters.getByLabel(copy.pageSize)).toHaveCount(0);
    const lastCard = (await page.getByRole('article').last().boundingBox())!;
    expect((await controls.boundingBox())!.y).toBeGreaterThan(lastCard.y + lastCard.height);
    expect(server.calls.filter((url) => url.pathname.endsWith('/lookup'))).toHaveLength(0);

    await city.click();
    const citySearch = page.locator('#filter-city-search');
    await expect(citySearch).toBeFocused();
    await citySearch.fill('Cai');
    await expect.poll(() => server.calls.some((url) => url.pathname === '/api/v1/cities/lookup' && url.searchParams.get('search') === 'Cai')).toBe(true);
    await page.getByRole('button', { name: language === 'ar' ? 'اختيار Cairo' : 'Choose Cairo', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('cityId=' + catalogueIds.city));
    await expect(page.locator('#filter-city')).not.toHaveAttribute('open');
    await expect(city).toContainText('Cairo');
    expect(new URL(page.url()).searchParams.has('pageNumber')).toBe(false);

    await area.click();
    await expect(page.getByRole('button', { name: language === 'ar' ? 'اختيار East Quarter' : 'Choose East Quarter', exact: true })).toBeVisible();
    await page.getByRole('button', { name: language === 'ar' ? 'اختيار East Quarter' : 'Choose East Quarter', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('areaId=' + catalogueIds.area));
    await page.reload();
    await openProjectFilters(page);
    await expect(city).toContainText('Cairo');
    await expect(area).toContainText('East Quarter');
    await city.click();
    await page.locator('#filter-city-search').fill('Alex');
    await page.getByRole('button', { name: language === 'ar' ? 'اختيار Alexandria' : 'Choose Alexandria', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('cityId=' + catalogueIds.city2));
    expect(new URL(page.url()).searchParams.has('areaId')).toBe(false);
    await filters.getByRole('button', { name: copy.clear, exact: true }).click();
    await expect(page).toHaveURL(/\/projects\?pageSize=3$/);
    await controls.getByLabel(copy.pageSize).selectOption('24');
    await expect(page.getByRole('article')).toHaveCount(24);
    expect(new URL(page.url()).searchParams.get('pageSize')).toBe('24');
    await controls.getByRole('button', { name: language === 'ar' ? 'الصفحة التالية' : 'Next page', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Garden Residence 25', exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('article')).toHaveCount(24);
    const lookupCalls = server.calls.filter((url) => url.pathname.endsWith('/lookup'));
    expect(lookupCalls.some((url) => url.pathname === '/api/v1/areas/lookup')).toBe(true);
    expect(lookupCalls.every((url) => [...url.searchParams.keys()].every((key) => key === 'search'))).toBe(true);

    await page.goto('/projects?projectType=1&pageSize=3');
    await expect(page.getByRole('article')).toHaveCount(3);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`projects-${language}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    await openProjectFilters(page);
    await city.click();
    await expect(page.getByRole('button', { name: language === 'ar' ? 'اختيار Cairo' : 'Choose Cairo', exact: true })).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`city-dropdown-${language}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    if (info.project.name === 'chromium') {
      await page.keyboard.press('Escape');
      for (const width of [1024, 768]) {
        await page.setViewportSize({ width, height: 1024 });
        await expect(page.getByRole('article')).toHaveCount(3);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
        await page.screenshot({ path: info.outputPath(`projects-${language}-${width}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
      }
    }
  });
}

test('lookup failures, late search responses, keyboard dismissal and empty results remain usable', async ({ page, context }) => {
  await routingServer(context);
  const server = await catalogueServer(context);
  await seedRouting(page);
  server.state.failCitiesLookup = true;
  await page.goto('/projects');
  await openProjectFilters(page);
  const city = page.locator('#filter-city summary');
  await city.click();
  await expect(page.getByRole('heading', { name: 'Locations could not load' })).toBeVisible();
  server.state.failCitiesLookup = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Cairo', exact: true })).toBeVisible();
  await page.locator('#filter-city-search').fill('slow');
  await expect.poll(() => server.calls.some((url) => url.pathname === '/api/v1/cities/lookup' && url.searchParams.get('search') === 'slow')).toBe(true);
  await page.locator('#filter-city-search').fill('latest');
  await expect(page.getByRole('button', { name: 'Choose Latest city', exact: true })).toBeVisible();
  await expect.poll(() => server.completed.includes('lookup-slow')).toBe(true);
  await expect(page.getByRole('button', { name: 'Choose Obsolete city', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(city).toBeFocused();
  await expect(page.getByLabel('Project type', { exact: true })).toBeVisible();
  const area = page.locator('#filter-area summary');
  await area.click();
  await page.locator('#filter-area-search').fill('unlisted place');
  await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  await page.getByRole('heading', { level: 1 }).click();
  await expect(page.locator('#filter-area')).not.toHaveAttribute('open');
  await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
});
