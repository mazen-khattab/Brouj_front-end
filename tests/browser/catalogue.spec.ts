import { expect, test } from '@playwright/test';
import { catalogueIds as ids, catalogueServer } from './catalogueFixtures';
import { routingServer, seedRouting, signIn } from './routingFixtures';
import { openProjectFilters } from './projectFilterActions';

test('cities, areas, projects and units follow actual services with the required projectId', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto('/cities'); await page.getByRole('link', { name: 'Cairo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cairo', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'East Quarter', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'East Quarter', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Garden Residence 1', exact: true }).click();
  await expect(page.getByText('Shared outdoor space')).toBeVisible();
  await expect(page.getByText('Second paragraph. <b>Plain text</b>', { exact: false })).toBeVisible();
  expect(await page.locator('main b').count()).toBe(0);
  await page.getByRole('button', { name: 'Unit A-204', exact: true }).click();
  await expect(page.getByText('Unit details are coming soon.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp('/projects/' + ids.project + '$'));
  await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
  await expect(page.getByRole('heading', { name: 'Unit A-204', exact: true })).toBeVisible();
  await expect(page.getByText('1,234,567.89', { exact: false })).toBeVisible();
  expect(server.calls.find((url) => url.pathname === '/api/v1/units/' + ids.unit)?.searchParams.get('projectId')).toBe(ids.project);
  expect(server.calls.find((url) => url.pathname === '/api/v1/projects')?.searchParams.get('areaId')).toBe(ids.area);
  await page.getByRole('link', { name: 'Current terms and conditions', exact: true }).click();
  await expect(page.getByText('Supplied legal text.', { exact: false })).toBeVisible();
  expect(await page.locator('main b').count()).toBe(0);
});

test('supported project URL filters, pagination, reset and browser history round-trip', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto(`/projects?search=Garden&cityId=${ids.city}&areaId=${ids.area}&projectType=1&pageNumber=2&pageSize=3`);
  await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await expect(page.getByLabel('Project type', { exact: true })).toHaveValue('1');
  await expect(page.getByText('Results: 25', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await openProjectFilters(page);
  await page.getByLabel('Project type', { exact: true }).selectOption('0');
  await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('pageNumber')).toBe(false);
  await page.goBack(); await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Garden Residence 7', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('3');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.toString()).toBe('pageSize=3');
  expect(server.calls.filter((url) => url.pathname === '/api/v1/projects').every((url) => [...url.searchParams.keys()].every((key) => ['search', 'cityId', 'areaId', 'projectType', 'pageNumber', 'pageSize'].includes(key)))).toBe(true);
});

test('location choices use the public lookups and changing city clears the previous area', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto('/projects?pageNumber=2');
  await openProjectFilters(page);
  await page.locator('#filter-city summary').click();
  await page.getByRole('button', { name: 'Choose Cairo', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('cityId=' + ids.city));
  expect(new URL(page.url()).searchParams.has('pageNumber')).toBe(false);
  await page.locator('#filter-area summary').click();
  await page.getByRole('button', { name: 'Choose East Quarter', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('areaId=' + ids.area));
  await page.locator('#filter-city summary').click();
  await page.getByRole('button', { name: 'Choose Alexandria', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('areaId')).toBe(false);
  expect(server.calls.some((url) => url.pathname === '/api/v1/cities/lookup')).toBe(true);
  expect(server.calls.some((url) => url.pathname === '/api/v1/areas/lookup')).toBe(true);
  expect(server.calls.filter((url) => url.pathname.endsWith('/lookup')).every((url) => [...url.searchParams.keys()].every((key) => key === 'search'))).toBe(true);
});

test('rapid search debounces, cancels obsolete reads and rejects late results', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto('/projects'); await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search', exact: true });
  await search.fill('discard this draft');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(search).toHaveValue('');
  await search.fill('s'); await search.fill('sl'); await search.fill('slow');
  await expect.poll(() => server.calls.some((url) => url.searchParams.get('search') === 'slow')).toBe(true);
  await search.fill('latest');
  await expect(page.getByRole('link', { name: 'Latest project', exact: true })).toBeVisible();
  await expect(search).toBeFocused();
  await expect.poll(() => server.completed.includes('slow')).toBe(true);
  await expect(page.getByRole('link', { name: 'Obsolete project', exact: true })).toHaveCount(0);
  expect(server.calls.filter((url) => ['s', 'sl'].includes(url.searchParams.get('search') ?? ''))).toHaveLength(0);
  expect(new URL(page.url()).searchParams.get('search')).toBe('latest');
});

test('empty/error/retry and invalid/out-of-range pages remain usable', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto('/projects?search=absent'); await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  server.state.failProjects = true; await page.goto('/projects');
  await expect(page.getByText('We could not load this section', { exact: true })).toBeVisible();
  server.state.failProjects = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
  await page.goto('/projects?pageNumber=999&pageSize=3');
  await expect(page.getByRole('link', { name: 'Garden Residence 25', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('9');
  await page.goto('/projects?pageNumber=-1&pageSize=900&projectType=bad&sort=price');
  await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/projects$/);
});

test('missing project/unit, malformed identifiers and terms retrieval failure are safe', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  server.state.missingProject = true; await page.goto('/projects/' + ids.project);
  await expect(page.getByText('This item is unavailable', { exact: true })).toBeVisible();
  server.state.missingUnit = true; await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
  await expect(page.getByText('This item is unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to request a reservation' })).toHaveCount(0);
  const before = server.calls.length; await page.goto('/projects/not-a-guid/units/not-a-guid');
  await expect(page.getByText('This item is unavailable', { exact: true })).toBeVisible(); expect(server.calls).toHaveLength(before);
  server.state.failTerms = true; await page.goto('/terms');
  await expect(page.getByText('We could not load this section', { exact: true })).toBeVisible();
  server.state.failTerms = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Published terms' })).toBeVisible();
});

test('reservation CTA returns a customer to the selected unit and never submits a mutation', async ({ page, context }) => {
  const session = await routingServer(context); await catalogueServer(context); await seedRouting(page);
  const path = `/projects/${ids.project}/units/${ids.unit}`;
  await page.goto(path); await page.getByRole('link', { name: 'Sign in to request a reservation' }).click();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(path + '#reservation');
  await signIn(page); await expect(page).toHaveURL(new RegExp(ids.unit + '#reservation$'));
  await expect(page.getByRole('button', { name: 'Request reservation', exact: true })).toBeVisible();
  expect(session.calls.some((path) => path === '/api/v1/reservations')).toBe(false);
  await page.goto('/projects/' + ids.project);
  await expect(page.locator('#project-time-plan').getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Project time plan', exact: true })).toHaveCount(0);
  await page.goto(`/projects/${ids.project}/time-plan`);
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.project}/time-plan$`));
});

for (const language of ['ar', 'en'] as const) {
  test(`cards, detail, gallery and terms review in ${language}`, async ({ page, context }, info) => {
    test.setTimeout(60_000);
    await routingServer(context); await catalogueServer(context); await seedRouting(page, 'anonymous', language);
    const imageCalls: string[] = []; page.on('request', (request) => { if (request.resourceType() === 'image') imageCalls.push(request.url()); });
    for (const [view, path] of [
      ['cities', '/cities'], ['city', '/cities/' + ids.city], ['area', '/areas/' + ids.area + '?pageSize=3'],
      ['projects', '/projects?pageSize=3'], ['project', '/projects/' + ids.project],
      ['unit', `/projects/${ids.project}/units/${ids.unit}`], ['terms', '/terms'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(language === 'en' ? 'Loading properties' : 'جارٍ تحميل العقارات', { exact: true })).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      expect(await page.locator('main').innerHTML()).not.toContain('PRIVATE-STORAGE');
      if (view === 'project' || view === 'unit') {
        await expect(page.getByRole('img', { name: language === 'en' ? 'Photo unavailable' : 'الصورة غير متاحة' }).first()).toBeVisible();
        await page.getByRole('button', { name: language === 'en' ? 'Next photo' : 'الصورة التالية' }).click();
        await expect(page.getByRole('button', { name: language === 'en' ? 'Next photo' : 'الصورة التالية' })).toBeDisabled();
      }
      // Capture from the top after gallery interaction so fixed, offscreen skip links
      // are not painted at an old scroll offset by a full-page screenshot.
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`${language}-${view}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    }
    expect(imageCalls).toEqual([]);
  });
}
