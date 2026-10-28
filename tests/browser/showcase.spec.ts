import { expect, test } from './sessionFixtures';

for (const locale of ['ar', 'en'] as const) {
  test(`showcase layout, translation and keyboard review in ${locale}`, async ({ page }, testInfo) => {
    const english = locale === 'en';
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((initial) => {
      if (!localStorage.getItem('brouj.locale')) localStorage.setItem('brouj.locale', initial);
    }, locale);
    await page.goto('/__showcase');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('main img').evaluate(async (node) => {
      if (!(node instanceof HTMLImageElement)) throw new Error('Architectural image is missing.');
      await node.decode();
      if (!node.naturalWidth) throw new Error('Architectural image failed to load.');
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(english ? 'Considered in every detail.' : 'عناية في كل تفصيل.');
    for (const selector of ['#sample-name', '#sample-email', '#sample-view', '#sample-notes', 'section[aria-labelledby="form-title"]', 'figure']) {
      expect(await page.locator(selector).first().evaluate((node) => getComputedStyle(node).borderTopLeftRadius)).toBe('16px');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#sample-email')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('bdi').first()).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('unchanged-text')).toContainText('<b>Sample content</b>');
    expect(await page.getByTestId('unchanged-text').locator('b').count()).toBe(0);
    // Fixture text must be localized, while the deliberately supplied backend-text sample remains intact.
    expect(await page.locator('body').innerText()).not.toMatch(/showcase\.[a-zA-Z]|pagination\.[a-zA-Z]|validation\.[a-zA-Z]|Content unavailable/);
    await page.screenshot({ path: testInfo.outputPath(`showcase-${locale}.png`), fullPage: true, animations: 'disabled' });
    const tableRegion = page.getByRole('region', { name: english ? 'Shared table examples, horizontally scrollable' : 'أمثلة الجدول المشترك، قابل للتمرير أفقيًا' });
    if ((page.viewportSize()?.width ?? 1440) < 700) {
      expect(await tableRegion.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
      await tableRegion.focus();
      await page.keyboard.press(english ? 'ArrowRight' : 'ArrowLeft');
      await expect.poll(() => tableRegion.evaluate((node) => Math.abs(node.scrollLeft))).toBeGreaterThan(0);
    }
    await page.getByRole('button', { name: english ? 'Show notification' : 'عرض إشعار' }).click();
    const notifications = page.getByRole('complementary', { name: english ? 'Notifications' : 'الإشعارات' });
    await expect(notifications.getByRole('status')).toContainText(english ? 'Everything is ready' : 'كل شيء جاهز');
    expect(await notifications.getByRole('status').evaluate((node) => getComputedStyle(node).borderTopLeftRadius)).toBe('16px');
    await page.screenshot({ path: testInfo.outputPath(`notification-${locale}.png`), animations: 'disabled' });
    // A slow screenshot may outlive the notice. Both expiry and manual dismissal are valid here.
    await notifications.getByRole('button').click({ timeout: 2_000 }).catch(async (error: unknown) => {
      if (await notifications.getByRole('status').count()) throw error;
    });
    await expect(notifications.getByRole('status')).toHaveCount(0);
    const open = page.getByRole('button', { name: english ? 'Open dialog' : 'فتح النافذة', exact: true });
    await open.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((node) => getComputedStyle(node).borderTopLeftRadius)).toBe('16px');
    expect(await dialog.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return bounds.top >= 0 && bounds.bottom <= innerHeight && bounds.width <= innerWidth;
    })).toBe(true);
    for (let index = 0; index < 8; index++) {
      await page.keyboard.press(index < 4 ? 'Tab' : 'Shift+Tab');
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`dialog-${locale}.png`), animations: 'disabled' });
    const inputBox = await dialog.locator('input').boundingBox();
    if (!inputBox) throw new Error('Dialog input is missing.');
    await page.mouse.move(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(4, 4);
    await page.mouse.up();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: english ? 'Start pending example' : 'بدء مثال الانتظار' }).click();
    await page.mouse.click(4, 4);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: english ? 'Close' : 'إغلاق', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: english ? 'Finish pending example' : 'إنهاء مثال الانتظار' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    await open.click();
    await page.mouse.click(4, 4);
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    await page.getByRole('button', { name: english ? 'Save' : 'حفظ', exact: true }).click();
    await expect(page.locator('#sample-name')).toHaveAttribute('aria-invalid', 'true');
    const originalError = english ? 'This field is required.' : 'هذا الحقل مطلوب.';
    await expect(page.locator('#sample-name-error')).toHaveText(originalError);
    await page.locator('#sample-notes').fill('preserved');
    await page.getByRole('button', { name: english ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', english ? 'ar' : 'en');
    await expect(page.locator('#sample-name-error')).toHaveText(english ? 'هذا الحقل مطلوب.' : 'This field is required.');
    await expect(page.locator('#sample-notes')).toHaveValue('preserved');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(new URL(page.url()).pathname).toBe('/__showcase');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', english ? 'ar' : 'en');
    await page.getByRole('link', { name: english ? 'بروج' : 'Brouj', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', english ? 'ar' : 'en');
    expect(errors).toEqual([]);
  });
}

test('reduced motion disables the loading animation without hiding its status', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/__showcase');
  const loading = page.locator('[aria-busy="true"]').filter({ has: page.getByRole('status') }).first();
  await expect(loading).toBeVisible();
  const animationNames = await loading.locator('span[aria-hidden], div[aria-hidden]').evaluateAll((nodes) => nodes.flatMap((node) => [getComputedStyle(node).animationName, getComputedStyle(node, '::after').animationName]));
  expect(animationNames.length).toBeGreaterThan(0);
  expect(animationNames.every((name) => name === 'none')).toBe(true);
});

test('fade-in and skeleton shimmer are active when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/__showcase');
  const panel = page.locator('section[aria-labelledby="form-title"]');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((node) => getComputedStyle(node).animationName)).toBe('fade-in');
  const skeleton = page.locator('[aria-busy="true"] div[aria-hidden="true"]').first();
  expect(await skeleton.evaluate((node) => getComputedStyle(node, '::after').animationName)).toBe('shimmer');
  expect(await skeleton.evaluate((node) => getComputedStyle(node, '::after').backgroundImage)).toContain('linear-gradient');
});

test('notifications close automatically after five seconds in the browser', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  await page.goto('/__showcase');
  await page.getByRole('button', { name: 'Try again' }).click();
  const region = page.getByRole('complementary');
  await expect(region.getByRole('status')).toBeVisible();
  expect(await region.getByRole('status').evaluate((node) => getComputedStyle(node).backgroundColor)).toBe('rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(region.getByRole('status')).toContainText('تظهر أسماء المحتوى');
  await expect(region.getByRole('status')).toHaveCount(0, { timeout: 6500 });
});
