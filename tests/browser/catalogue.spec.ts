import { expect, test } from './test';
import { catalogueIds as ids, cataloguePaymentPlan, catalogueProject, catalogueServer, initiativePaymentPlan } from './catalogueFixtures';
import { ProjectType } from '../../src/Types/contracts';
import { routingServer, seedRouting, signIn } from './routingFixtures';
import { openProjectFilters } from './projectFilterActions';
import { loadEnv } from 'vite';
import enCatalogue from '../../src/i18n/locales/en/catalogue.json' with { type: "json" };
import arCatalogue from '../../src/i18n/locales/ar/catalogue.json' with { type: "json" };

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
  await page.getByRole('link', { name: enCatalogue.viewUnits, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.project}/units$`));
  await page.getByRole('link', { name: 'Unit A-204', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.project}/units/${ids.unit}$`));
  await expect(page.getByRole('heading', { name: 'Unit A-204', exact: true })).toBeVisible();
  const pricing = page.getByRole('region', { name: 'Unit pricing', exact: true });
  await expect(pricing.getByText('999', { exact: false })).toBeVisible();
  await expect(pricing.getByText('1,250', { exact: false })).toBeVisible();
  const prices = pricing.locator('dl > div');
  // Read both positions in the same frame while the pricing section reveals.
  const priceTops = await prices.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
  expect(Math.abs(priceTops[0]! - priceTops[1]!)).toBeLessThan(2);
  const details = page.getByRole('region', { name: 'Unit details', exact: true });
  await expect(page.getByRole('region', { name: 'Payment plan', exact: true })).toHaveCount(0);
  await expect(details.getByText('A-204', { exact: true })).toBeVisible();
  await expect(details.getByText('Garden view', { exact: true })).toBeVisible();
  await expect(page.getByText('1,234,567.89', { exact: false })).toBeVisible();
  expect(server.calls.find((url) => url.pathname === '/api/v1/units/' + ids.unit)?.searchParams.get('projectId')).toBe(ids.project);
  expect(server.calls.find((url) => url.pathname === '/api/v1/projects')?.searchParams.get('areaId')).toBe(ids.area);
  await page.locator('footer').getByRole('link', { name: 'Terms and conditions', exact: true }).click();
  await expect(page.getByText('Supplied legal text.', { exact: false })).toBeVisible();
  expect(await page.locator('main b').count()).toBe(0);
});

test('supported project URL filters, pagination, reset and browser history round-trip', async ({ page, context }) => {
  await routingServer(context); const server = await catalogueServer(context); await seedRouting(page);
  await page.goto(`/projects?search=Garden&cityId=${ids.city}&areaId=${ids.area}&projectType=1&pageNumber=2&pageSize=3`);
  await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Initiative projects', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Results: 25', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await openProjectFilters(page);
  await page.getByRole('tab', { name: 'Regular projects', exact: true }).click();
  await expect(page.getByText('No results found', { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('pageNumber')).toBe(false);
  await page.goBack(); await expect(page.getByRole('link', { name: 'Garden Residence 4', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Garden Residence 7', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('pageNumber')).toBe('3');
  await openProjectFilters(page);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('link', { name: 'Garden Residence 1', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.toString()).toBe('projectType=1&pageSize=3');
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
  await openProjectFilters(page);
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
  await page.goto(path); await page.getByRole('button', { name: 'Reserve now', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Already have an account? Sign in' }).click();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(path + '#reservation');
  await signIn(page); await expect(page).toHaveURL(new RegExp(ids.unit + '#reservation$'));
  await expect(page.getByRole('button', { name: 'Reserve now', exact: true })).toBeVisible();
  expect(session.calls.some((path) => path === '/api/v1/reservations')).toBe(false);
  await page.goto('/projects/' + ids.project);
  await expect(page.locator('#project-time-plan').getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Project time plan', exact: true })).toHaveCount(0);
  await page.goto(`/projects/${ids.project}/time-plan`);
  await expect(page).toHaveURL(new RegExp(`/projects/${ids.project}/time-plan$`));
});

for (const language of ['ar', 'en'] as const) {
  test(`project summary shows localized reservations and payment terms in ${language}`, async ({ page, context }) => {
    await routingServer(context);
    const server = await catalogueServer(context);
    await seedRouting(page, 'anonymous', language);
    const catalogue = language === 'ar' ? arCatalogue : enCatalogue;
    const copy = catalogue.projectSummary;
    const reservations = page.getByRole('region', { name: copy.reservations, exact: true });
    const payment = page.getByRole('region', { name: copy.paymentPlan, exact: true });
    const number = new Intl.NumberFormat(language);

    await page.goto('/projects/' + ids.project);
    await expect(reservations.locator('dt')).toHaveText([copy.withoutOrder, copy.pendingOrder]);
    await expect(reservations.locator('dd')).toHaveText([number.format(1284), number.format(0)]);
    await expect(payment).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const paymentPlanDto = { downpaymentStartFrom: 112500.75, installmentStartFrom: 4250.5, repaymentPeriod: 36 };
    server.state.projectDetail = {
      ...catalogueProject, projectType: ProjectType.Regular, paymentPlanDto,
      reservationsWithoutOrderCount: null, reservationsWithPendingOrderCount: null,
    };
    const currency = loadEnv('development', process.cwd(), 'VITE_').VITE_BUSINESS_CURRENCY;
    const amount = new Intl.NumberFormat(language, { maximumFractionDigits: 4, ...(currency && { style: 'currency', currency }) });
    const months = new Intl.NumberFormat(language, { style: 'unit', unit: 'month', unitDisplay: 'long' });
    await page.reload();
    await expect(payment.locator('dt')).toHaveText([copy.downpayment, copy.installment, copy.repaymentPeriod]);
    await expect(payment.locator('dd')).toHaveText([
      amount.format(paymentPlanDto.downpaymentStartFrom),
      amount.format(paymentPlanDto.installmentStartFrom),
      months.format(paymentPlanDto.repaymentPeriod),
    ]);
    const price = payment.locator('xpath=../preceding-sibling::*[1]');
    const facts = payment.locator('xpath=following-sibling::*[1]');
    await expect(price.locator('dt').first()).toHaveText(catalogue.startingMeterPrice);
    await expect(facts.locator('dt').first()).toHaveText(catalogue.size);
    const priceFontSize = await price.locator('dd').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    const termsFontSize = await payment.locator('dd').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(termsFontSize).toBeLessThan(priceFontSize);
    await expect(reservations).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    server.state.projectDetail = { ...server.state.projectDetail, paymentPlanDto: null };
    await page.reload();
    await expect(page.getByRole('heading', { name: catalogueProject.name, exact: true })).toBeVisible();
    await expect(payment).toHaveCount(0);
  });

  test(`regular unit payment plans preserve installment order and show localized percentages in ${language}`, async ({ page, context }) => {
    await routingServer(context);
    const server = await catalogueServer(context);
    server.state.unitPaymentPlan = true;
    await seedRouting(page, 'anonymous', language);
    await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
    const plan = page.getByRole('region', { name: language === 'ar' ? 'خطة السداد' : 'Payment plan', exact: true });
    const details = page.getByRole('region', { name: language === 'ar' ? 'تفاصيل الوحدة' : 'Unit details', exact: true });
    await expect(details.locator('xpath=following-sibling::*[1]').and(plan)).toBeVisible();
    await expect(plan.getByRole('heading', { level: 3 })).toHaveText(cataloguePaymentPlan.map((row) => row.installmentName));
    const formatter = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 4 });
    for (const [index, row] of cataloguePaymentPlan.entries()) {
      await expect(plan.getByRole('listitem').nth(index).getByText(formatter.format(row.installmentPercentage / 100), { exact: true })).toBeVisible();
    }
    await expect(plan.getByText(language === 'ar' ? 'عند البداية' : 'At the start', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(server.calls.find((url) => url.pathname === '/api/v1/units/' + ids.unit)?.searchParams.get('projectId')).toBe(ids.project);
  });

  test(`initiative payment plans show stage costs and unpriced stages in ${language}`, async ({ page, context }) => {
    await routingServer(context);
    const server = await catalogueServer(context);
    server.state.initiativePaymentPlan = true;
    await seedRouting(page, 'anonymous', language);
    await page.goto(`/projects/${ids.project}/units/${ids.unit}`);
    const catalogue = language === 'ar' ? arCatalogue : enCatalogue;
    const labels = catalogue.paymentPlan;
    const plan = page.getByRole('region', { name: labels.title, exact: true });
    const details = page.getByRole('region', { name: catalogue.unitDetails, exact: true });
    await expect(details.locator('xpath=following-sibling::*[1]').and(plan)).toBeVisible();
    await expect(plan.getByRole('heading', { level: 3 })).toHaveText(initiativePaymentPlan.map((row) => row.stageName));
    const percentage = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 4 });
    const currency = loadEnv('development', process.cwd(), 'VITE_').VITE_BUSINESS_CURRENCY;
    const amount = new Intl.NumberFormat(language, { maximumFractionDigits: 4, ...(currency && { style: 'currency', currency }) });
    for (const [index, row] of initiativePaymentPlan.entries()) {
      const item = plan.getByRole('listitem').nth(index);
      await expect(item.locator('h3 bdi')).toHaveAttribute('dir', 'auto');
      await expect(item.getByText(percentage.format(row.unitPercentage / 100), { exact: true })).toBeVisible();
      await expect(item.getByText(row.stageCost === null ? labels.pricingUnavailable : amount.format(row.stageCost), { exact: true })).toBeVisible();
    }
    const unitReads = server.calls.filter((url) => url.pathname === '/api/v1/units/' + ids.unit);
    expect(unitReads.map((url) => url.searchParams.get('projectId'))).toEqual([ids.project]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    server.state.initiativePaymentPlan = false;
    await page.reload();
    await expect(details).toBeVisible();
    await expect(plan).toHaveCount(0);
    expect(server.calls.some((url) => url.pathname.endsWith('/time-plan'))).toBe(false);
  });

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
      if (view === 'unit') {
        const pricing = page.getByRole('region', { name: language === 'en' ? 'Unit pricing' : 'أسعار الوحدة', exact: true });
        const prices = pricing.locator('dl > div');
        const first = await prices.nth(0).boundingBox();
        const second = await prices.nth(1).boundingBox();
        expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
        await expect(page.getByRole('region', { name: language === 'en' ? 'Unit details' : 'تفاصيل الوحدة', exact: true }).getByText('Garden view', { exact: true })).toBeVisible();
      }
      // Capture from the top after gallery interaction so fixed, offscreen skip links
      // are not painted at an old scroll offset by a full-page screenshot.
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`${language}-${view}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    }
    expect(imageCalls).toEqual([]);
  });
}
