import { expect, test } from './sessionFixtures';
import { catalogueServer } from './catalogueFixtures';
import enAuth from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import arAuth from '../../src/i18n/locales/ar/auth.json' with { type: 'json' };

for (const locale of ['en', 'ar'] as const) {
  test(`sticky navigation and dedicated About page in ${locale}`, async ({ page, context }, info) => {
    const server = await catalogueServer(context);
    await page.addInitScript((language) => localStorage.setItem('brouj.locale', language), locale);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => scrollTo(0, 900));
    const header = page.getByRole('banner');
    await expect.poll(async () => Math.round((await header.boundingBox())!.y)).toBe(0);
    await expect(header).toBeInViewport();
    if (info.project.name.includes('mobile')) {
      await header.getByRole('button', { name: locale === 'ar' ? 'القائمة' : 'Menu', exact: true }).click();
    }
    const nav = page.getByRole('navigation', { name: locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation' }).filter({ visible: true });
    await nav.getByRole('link', { name: locale === 'ar' ? 'من نحن' : 'About us', exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    const heading = page.getByRole('heading', { name: locale === 'ar' ? 'من نحن' : 'About us', level: 1 });
    await expect(heading).toBeFocused();
    await expect(page).toHaveTitle(locale === 'ar' ? 'من نحن · بروج' : 'About us · Brouj');
    await expect(page.getByRole('navigation', { name: locale === 'ar' ? 'مسار التنقل' : 'Breadcrumbs' })).toContainText(locale === 'ar' ? 'من نحن' : 'About us');
    const owners = page.locator('.owner-gallery button');
    await expect(owners).toHaveCount(3);
    await owners.nth(2).focus();
    await expect(owners.nth(2)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => Math.round((await header.boundingBox())!.y)).toBe(0);
    await owners.nth(0).click();
    await page.mouse.move(0, 0);
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
    await page.locator('main img').evaluateAll(async (images) => Promise.all(images.map((image) => (image as HTMLImageElement).decode())));
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`about-${locale}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
    // A direct About visit works without fetching project/terms data for its static content.
    server.calls.length = 0;
    await page.reload();
    await expect(heading).toBeVisible();
    await expect(page.locator('.owner-gallery button')).toHaveCount(3);
    expect(server.calls).toEqual([]);
    await page.getByRole('link', { name: locale === 'ar' ? 'استكشف المشروعات' : 'Explore projects', exact: true }).click();
    await expect(page.getByLabel(locale === 'ar' ? 'نوع المشروع' : 'Project type', { exact: true })).toHaveValue('1');
  });

  test(`image-free sign-in screens and registration in ${locale}`, async ({ page }, info) => {
    await page.addInitScript((language) => localStorage.setItem('brouj.locale', language), locale);
    const copy = locale === 'ar' ? arAuth : enAuth;
    for (const [mode, path, title] of [
      ['customer', '/login?returnTo=%2Faccount', copy.customerTitle],
      ['staff', '/admin/login', copy.staffTitle],
      ['register', '/register', copy.registerTitle],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await expect(page.locator('#auth-email')).toBeEnabled();
      await expect(page.locator('main img')).toHaveCount(0);
      await expect(page.locator('main aside')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: info.outputPath(`auth-${mode}-${locale}.png`), fullPage: true, animations: 'disabled', scale: 'css' });
      if (mode === 'customer') {
        await page.locator('#auth-email').fill('visitor@example.test');
        await page.getByRole('button', { name: locale === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic' }).click();
        await expect(page.locator('#auth-email')).toHaveValue('visitor@example.test');
        await expect(page.getByRole('link', { name: locale === 'ar' ? enAuth.registerTab : arAuth.registerTab, exact: true })).toHaveAttribute('href', '/register?returnTo=%2Faccount');
        await page.getByRole('button', { name: locale === 'ar' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية' }).click();
      }
    }
  });
}
