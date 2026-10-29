import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { routeDefinitions } from '../../src/Router/routeDefinitions';
import en from '../../src/i18n/locales/en/routing.json' with { type: 'json' };
import { routingServer, seedRouting, signIn } from './routingFixtures';

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const placeholderFile = /\/src\/Pages\/Catalogue\/CataloguePage\.tsx(?:\?.*)?$/;
for (const actor of ['anonymous', 'customer', 'admin', 'superAdmin'] as const) {
  test(`all route permissions and deep links for ${actor}`, async ({ page, context }) => {
    test.setTimeout(120_000);
    const server = await routingServer(context, actor); await seedRouting(page, actor);
    const adminFiles: string[] = [];
    page.on('request', (request) => { if (/\/src\/(Layouts\/AdminLayout|Pages\/Admin\/)/.test(request.url())) adminFiles.push(request.url()); });
    for (const route of routeDefinitions) {
      const path = route.path.replace(/:[^/]+/g, 'fixture');
      await page.goto(path);
      if (route.access === 'anonymous') {
        if (actor === 'anonymous') await expect(heading(page)).toHaveText(path === '/register' ? 'A new beginning.' : path === '/admin/login' ? 'Staff sign in.' : 'Welcome back.');
        else await expect(page).toHaveURL(actor === 'customer' ? /\/account$/ : /\/admin$/);
      } else if (route.access !== 'public' && actor === 'anonymous') {
        await expect(page).toHaveURL(route.access === 'staff' || route.access === 'superAdmin' ? /\/admin\/login\?returnTo=/ : /\/login\?returnTo=/);
        await expect(page.locator('#auth-password')).toBeVisible();
      } else {
        const forbidden = (route.access === 'customer' && actor !== 'customer') || (route.access === 'staff' && actor === 'customer') || (route.access === 'superAdmin' && actor !== 'superAdmin');
        await expect(heading(page)).toHaveText(forbidden ? 'Access unavailable' : route.path === '/' ? 'Brouj' : en[route.title as keyof typeof en]);
      }
    }
    // Own lists require a customer; staff operational reads stay inside the admin branch.
    expect(server.calls.every((path) => /\/(customers|users)\/me$/.test(path) || /^\/api\/v1\/(cities|areas|projects|units|terms-and-conditions)(\/|$)/.test(path) || (actor === 'customer' && ['/api/v1/reservations/me', '/api/v1/orders/me'].includes(path)) || (['admin', 'superAdmin'].includes(actor) && /^\/api\/v1\/admin\/(customers|reservations|orders)(\/|$)/.test(path)))).toBe(true);
    if (actor === 'anonymous' || actor === 'customer') expect(adminFiles).toEqual([]);
  });
}

test('reload, back/forward, localized titles, breadcrumbs, focus, scroll and 404 retain public layout', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  await page.goto('/projects/fixture/units/unit-fixture');
  await expect(heading(page)).toHaveText('Unit'); await page.reload();
  await expect(page).toHaveTitle('Unit · Brouj');
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toContainText('Projects');
  await expect(heading(page)).toBeFocused();
  await page.getByRole('navigation', { name: 'Breadcrumbs' }).getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(heading(page)).toHaveText('Projects');
  await expect(heading(page)).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack(); await expect(heading(page)).toHaveText('Unit');
  await page.goForward(); await expect(heading(page)).toHaveText('Projects');
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 500 });
  await page.goto('/'); await expect(heading(page)).toHaveText('Brouj');
  await page.evaluate(() => scrollTo(0, 300));
  const savedScroll = await page.evaluate(() => scrollY);
  expect(savedScroll).toBeGreaterThan(0);
  // Trigger the mounted Link without Playwright scrolling it into view first, so the
  // saved history position remains the one selected above. No second router is created.
  await page.getByRole('link', { name: 'Explore projects' }).evaluate((element: HTMLAnchorElement) => element.click());
  await expect(heading(page)).toHaveText('Projects');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack(); await expect(heading(page)).toHaveText('Brouj');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(savedScroll);
  await page.goto('/missing/page'); await expect(heading(page)).toHaveText('Page not found');
  await expect(page.locator('header')).toBeVisible(); await expect(page.locator('footer')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page).toHaveTitle('الصفحة غير موجودة · بروج');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('a protected return URL survives login with query and hash, and logout removes the private page', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  await page.goto('/account/reservations/fixture?tab=history#details');
  await expect(page.locator('#auth-email')).toBeVisible();
  await signIn(page);
  await expect(page).toHaveURL(/\/account\/reservations\/fixture\?tab=history#details$/);
  await expect(heading(page)).toHaveText('Reservation details');
  if (test.info().project.name.includes('mobile')) await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#auth-email')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Account navigation' })).toHaveCount(0);
});

test('external, forbidden and auth return URLs use an allowed actor default', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  await page.goto('/login?returnTo=' + encodeURIComponent('//example.test'));
  await signIn(page); await expect(page).toHaveURL(/\/account$/);
  for (const value of ['https://example.test', '/admin', '/login', '/%5cexample.test', '/unknown']) {
    await page.goto('/login?returnTo=' + encodeURIComponent(value));
    await expect(page).toHaveURL(/\/account$/);
  }
});

test('staff login returns to an allowed workspace and denies SuperAdmin routes without a loop', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/login\?returnTo=/);
  await signIn(page); await expect(page).toHaveURL(/\/admin$/);
  await expect(heading(page)).toHaveText('Dashboard');
  await page.goto('/admin/users'); await expect(heading(page)).toHaveText('Access unavailable');
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.goto('/admin/login?returnTo=' + encodeURIComponent('/admin/orders/fixture'));
  await expect(page).toHaveURL(/\/admin\/orders\/fixture$/);
  await expect(heading(page)).toHaveText('Order details');
});

test('lazy navigation uses a local pending view while the public header and footer remain available', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(placeholderFile, async (route) => { await pending; await route.continue(); });
  await page.goto('/'); await expect(heading(page)).toHaveText('Brouj');
  await page.getByRole('link', { name: 'Explore projects' }).click();
  await expect(page.getByText('Loading page', { exact: true })).toBeVisible();
  await expect(page.locator('header')).toBeVisible(); await expect(page.locator('footer')).toBeVisible();
  release();
  await expect(heading(page)).toHaveText('Projects'); await expect(heading(page)).toBeFocused();
});

test('bootstrap waits and unavailable session retries without a redirect or admin imports', async ({ page, context }) => {
  const server = await routingServer(context, 'admin'); server.state.unavailable = true; server.state.delay = 300;
  await seedRouting(page, 'admin');
  const files: string[] = []; page.on('request', (request) => { if (request.url().includes('/src/Layouts/AdminLayout')) files.push(request.url()); });
  await page.goto('/admin/orders/fixture');
  await expect(page.getByText('Loading page', { exact: true })).toBeVisible();
  expect(files).toEqual([]);
  await expect(heading(page)).toHaveText('We could not confirm your session');
  await expect(page).toHaveURL(/\/admin\/orders\/fixture$/);
  await expect(page.locator('#auth-password')).toHaveCount(0); expect(files).toEqual([]);
  server.state.unavailable = false; server.state.delay = 0;
  await page.getByRole('button', { name: 'Check session again' }).click();
  await expect(heading(page)).toHaveText('Order details');
  if (test.info().project.name.includes('mobile')) await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible();
});

test('a failed lazy page preserves its layout and offers a safe reload', async ({ page, context }) => {
  await routingServer(context); await seedRouting(page);
  await page.route(placeholderFile, (route) => route.abort('failed'));
  await page.goto('/projects');
  await expect(heading(page)).toHaveText('This page could not open');
  await expect(page.locator('header')).toBeVisible(); await expect(page.locator('footer')).toBeVisible();
  await page.unroute(placeholderFile);
  await page.getByRole('button', { name: 'Reload page' }).click();
  await expect(heading(page)).toHaveText('Projects');
});

for (const language of ['ar', 'en'] as const) {
  test(`bilingual layout review and language persistence in ${language}`, async ({ page, context }, info) => {
    const server = await routingServer(context, 'customer'); await seedRouting(page, 'customer', language);
    for (const [layout, path, actor] of [
      ['public', '/', 'customer'], ['account', '/account/reservations', 'customer'], ['admin', '/admin', 'superAdmin'],
    ] as const) {
      server.state.actor = actor; await page.goto(path); await expect(heading(page)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('main img').evaluateAll(async (images) => { await Promise.all(images.map((node) => node instanceof HTMLImageElement ? node.decode() : Promise.resolve())); });
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${language}-${layout}.png`), fullPage: true, animations: 'disabled' });
      if (info.project.name.includes('mobile')) {
        await page.getByRole('button', { name: language === 'en' ? 'Menu' : 'القائمة', exact: true }).click();
        await expect(page.getByRole('button', { name: language === 'en' ? 'Close menu' : 'إغلاق القائمة', exact: true })).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: language === 'en' ? 'Menu' : 'القائمة', exact: true })).toBeFocused();
      }
    }
    await page.getByRole('button', { name: language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية' }).click();
    if (info.project.name.includes('mobile')) await page.getByRole('button', { name: language === 'en' ? 'القائمة' : 'Menu', exact: true }).click();
    await page.getByRole('navigation', { name: language === 'en' ? 'التنقل في لوحة الإدارة' : 'Dashboard navigation' }).getByRole('link', { name: language === 'en' ? 'العقارات' : 'Catalogue', exact: true }).click();
    await expect(heading(page)).toHaveText(language === 'en' ? 'العقارات' : 'Catalogue');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', language === 'en' ? 'ar' : 'en');
    await expect(heading(page)).toHaveText(language === 'en' ? 'العقارات' : 'Catalogue');
    await page.getByRole('navigation', { name: language === 'en' ? 'مسار التنقل' : 'Breadcrumbs' }).getByRole('link', { name: language === 'en' ? 'الرئيسية' : 'Home', exact: true }).click();
    await expect(heading(page)).toHaveText(language === 'en' ? 'بروج' : 'Brouj');
    server.state.actor = 'customer'; await page.goto('/account');
    await expect(heading(page)).toHaveText(language === 'en' ? 'الملف الشخصي' : 'Profile');
  });
}
