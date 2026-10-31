import { expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { catalogueIds as ids, catalogueServer, catalogueUnit } from './catalogueFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import { sessionCors } from './sessionFixtures';
import type { TimePlanDto } from '../../src/Types/contracts';

async function detailsServer(context: BrowserContext) {
  await routingServer(context); await catalogueServer(context);
  const calls: URL[] = [];
  const state = { failUnits: false, failNextBatch: false, planFailure: 0, unitCount: 27 };
  const plan: TimePlanDto = { id: 'plan', projectId: ids.project, name: 'Published schedule', deliveryDate: '2027-12-01T12:00:00Z', stages: [
    { id: 'stage-1', name: 'Structure', sortOrder: 1, deliveryDate: '2027-06-01T12:00:00Z', items: [0, 1, 3, 4, 6].map((count, index) => ({
      id: `item-${index}`, name: `Work ${count}`, status: index === 0 ? 99 as 0 : index === 1 ? 0 : index === 2 ? 1 : 2, sortOrder: index,
      dueDate: '2027-05-01T12:00:00Z', confirmedDate: index ? '2027-04-01T12:00:00Z' : null,
      images: Array.from({ length: count }, (_, image) => ({ id: `image-${count}-${image}`, imagePath: `C:\\PRIVATE-PROGRESS\\image-${image}.webp`, sortOrder: image, description: `Progress note ${image + 1}` })),
    })) },
    { id: 'stage-2', name: 'Finishes', sortOrder: 2, deliveryDate: '2027-11-01T12:00:00Z', items: [] },
  ] };
  await context.route(/https:\/\/localhost:7249\/api\/v1\/projects\/[^/]+\/(units|time-plan)(?:\?|$)/, async (route) => {
    const url = new URL(route.request().url()); calls.push(url);
    const ok = (data: unknown) => route.fulfill({ headers: sessionCors, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers: sessionCors, json: { status } });
    if (url.pathname.endsWith('time-plan')) return state.planFailure ? fail(state.planFailure) : ok(plan);
    const number = Number(url.searchParams.get('pageNumber') ?? 1), size = Number(url.searchParams.get('pageSize') ?? 12);
    if (state.failUnits || number > 1 && state.failNextBatch) return fail(503);
    const items = Array.from({ length: state.unitCount }, (_, index) => ({ ...catalogueUnit, id: `unit-${index}`, number: `A-${index + 1}` }));
    return ok({ items: items.slice((number - 1) * size, number * size), pageNumber: number, pageSize: size, totalCount: state.unitCount, totalPages: Math.ceil(state.unitCount / size) });
  });
  return { calls, state, plan };
}

for (const language of ['en', 'ar'] as const) {
  const text = language === 'en' ? { next: 'Next units', previous: 'Previous units', soon: 'Unit details are coming soon.', all: 'Show all 6 photographs for Work 6', open: 'Open photograph 5 for Work 6', back: 'Back to all photographs', close: 'Close' } : { next: 'الوحدات التالية', previous: 'الوحدات السابقة', soon: 'تفاصيل الوحدات قريبًا.', all: 'عرض جميع الصور (٦) لـ Work 6', open: 'فتح الصورة ٥ لـ Work 6', back: 'العودة إلى جميع الصور', close: 'إغلاق' };

  test(`anonymous details carousel and progress gallery in ${language}`, async ({ page, context }) => {
    const server = await detailsServer(context); await seedRouting(page, 'anonymous', language);
    const digits = await page.evaluate((locale) => [1, 3, 5, 6].map((value) => new Intl.NumberFormat(locale).format(value)), language);
    const unsafeImages: string[] = [];
    page.on('request', (request) => { if (request.resourceType() === 'image' && /PRIVATE|image-\d+\.webp/.test(request.url())) unsafeImages.push(request.url()); });
    const path = `/projects/${ids.project}?pageNumber=8&pageSize=3&search=ignored`;
    await page.goto(path);
    const carousel = page.locator('#project-units [aria-roledescription]');
    await expect(carousel.getByRole('article')).toHaveCount((page.viewportSize()?.width ?? 1440) >= 1280 ? 3 : 1);
    await expect(page.getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
    await expect(page.locator('#project-units input, #project-units select, #project-units a')).toHaveCount(0);
    await carousel.getByRole('button').first().click();
    await expect(page.getByText(text.soon, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(path);
    const next = page.getByRole('button', { name: text.next, exact: true });
    for (let step = 0; step < 28; step++) {
      if (await next.isDisabled()) break;
      await next.click();
      // Wait for an approaching-end prefetch before attempting the loaded boundary.
      await expect(page.locator('#project-units [aria-busy="true"]')).toHaveCount(0);
    }
    await expect(carousel.getByRole('button').last()).toContainText('A-27');
    await expect(next).toBeDisabled();
    const unitCalls = server.calls.filter((url) => url.pathname.endsWith('/units'));
    expect(unitCalls.map((url) => url.searchParams.get('pageNumber'))).toEqual(['1', '2', '3']);
    expect(unitCalls.every((url) => url.searchParams.get('pageSize') === '12' && !url.searchParams.has('search'))).toBe(true);
    await carousel.focus(); await carousel.press('Home');
    await expect(carousel.getByRole('button').first()).toContainText('A-1');
    await carousel.press(language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByRole('button', { name: text.previous, exact: true })).toBeEnabled();

    const stages = page.locator('#project-time-plan details');
    await expect(stages.nth(0)).toHaveAttribute('open'); await expect(stages.nth(1)).not.toHaveAttribute('open');
    await stages.nth(1).locator('summary').click();
    await expect(stages.nth(0)).toHaveAttribute('open'); await expect(stages.nth(1)).toHaveAttribute('open');
    const items = stages.nth(0).getByRole('article');
    await expect(items.getByRole('heading')).toHaveText(['Work 0', 'Work 1', 'Work 3', 'Work 4', 'Work 6']);
    await expect(items.nth(0).getByText(language === 'en' ? 'Unspecified' : 'غير محدد', { exact: true })).toBeVisible();
    await expect(items.nth(3).getByRole('button').last()).toHaveText(`+${digits[0]}`);
    const trigger = page.getByRole('button', { name: language === 'en' ? text.all : `عرض جميع الصور (${digits[3]}) لـ Work 6`, exact: true });
    await expect(trigger).toHaveText(`+${digits[1]}`);
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button')).toHaveCount(7);
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
    const image = dialog.getByRole('button', { name: language === 'en' ? text.open : `فتح الصورة ${digits[2]} لـ Work 6`, exact: true });
    await image.click(); await expect(dialog.getByText('Progress note 5', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: text.back, exact: true }).click();
    await expect(image).toBeFocused();
    const close = dialog.getByRole('button', { name: text.close, exact: true });
    await close.focus(); await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button').last()).toBeFocused();
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.locator('main').innerHTML()).not.toContain('PRIVATE-PROGRESS'); expect(unsafeImages).toEqual([]);
    await page.goto(`/projects/${ids.project}/time-plan`);
    await expect(page.getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/time-plan$'));
  });

  test(`responsive project screenshots in ${language}`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'chromium');
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await detailsServer(context); await seedRouting(page, 'anonymous', language);
    await page.goto(`/projects/${ids.project}`);
    await expect(page.getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
    await mkdir('docs/evidence/project-details', { recursive: true });
    for (const [name, width, count] of [['desktop', 1440, 3], ['tablet', 900, 2], ['mobile', 375, 1]] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('#project-units article')).toHaveCount(count);
      const item = page.locator('#project-time-plan article').nth(1);
      const textBox = await item.locator(':scope > div').nth(0).boundingBox();
      const mediaBox = await item.locator(':scope > div').nth(1).boundingBox();
      expect(textBox && mediaBox).toBeTruthy();
      if (width >= 768) { expect(textBox!.x).toBeLessThan(mediaBox!.x); expect(Math.abs(textBox!.width - mediaBox!.width)).toBeLessThan(2); }
      else expect(textBox!.y).toBeLessThan(mediaBox!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `docs/evidence/project-details/${language}-${name}.png`, fullPage: true, animations: 'disabled', scale: 'css' });
    }
  });
}

test('unit and time-plan errors retry independently, including missing and empty plans', async ({ page, context }) => {
  const server = await detailsServer(context); await seedRouting(page);
  server.state.failUnits = true; server.state.planFailure = 404;
  await page.goto(`/projects/${ids.project}`);
  await expect(page.getByText('Shared outdoor space', { exact: true })).toBeVisible();
  await expect(page.getByText('The time plan is not available yet', { exact: true })).toBeVisible();
  server.state.failUnits = false;
  await page.locator('#project-units').getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Unit A-1', exact: true })).toBeVisible();
  server.state.planFailure = 503;
  await page.locator('#project-time-plan').getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('The time plan could not load', { exact: true })).toBeVisible();
  server.state.planFailure = 0; server.plan.stages = [];
  await page.locator('#project-time-plan').getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No stages have been published.', { exact: true })).toBeVisible();
  server.state.unitCount = 0; await page.reload();
  await expect(page.getByText('No units have been listed.', { exact: true })).toBeVisible();
});

test('touch swiping advances without opening the unit notice', async ({ page, context }) => {
  await detailsServer(context); await seedRouting(page);
  await page.goto(`/projects/${ids.project}`);
  const carousel = page.locator('#project-units [aria-roledescription]');
  await expect(carousel.getByRole('button').first()).toContainText('A-1');
  await carousel.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 250, clientY: 120 });
  await carousel.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 60, clientY: 125 });
  await expect(carousel.getByRole('button').first()).not.toContainText('A-1');
  await expect(page.getByText('Unit details are coming soon.', { exact: true })).toHaveCount(0);
});
