import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { routeDefinitions } from '../../src/Router/routeDefinitions';
import { catalogueIds } from '../browser/catalogueFixtures';
import { operationsIds } from '../browser/adminOperationsFixtures';
import { governanceIds } from '../browser/governanceFixtures';
import ar from '../../src/i18n/locales/ar/routing.json' with { type: 'json' };
import en from '../../src/i18n/locales/en/routing.json' with { type: 'json' };
import authAr from '../../src/i18n/locales/ar/auth.json' with { type: 'json' };
import authEn from '../../src/i18n/locales/en/auth.json' with { type: 'json' };
import { releaseServer } from './fixtures';

const pointer = JSON.parse(readFileSync('artifacts/release/latest.json', 'utf8')) as { directory: string };
const manifest = JSON.parse(readFileSync(resolve(pointer.directory, 'site/.vite/manifest.json'), 'utf8')) as Record<string, { file: string }>;
const values: Record<string, string> = {
  cityId: catalogueIds.city, areaId: catalogueIds.area, projectId: catalogueIds.project, unitId: catalogueIds.unit,
  customerId: operationsIds.customer, reservationId: operationsIds.reservation, orderId: operationsIds.order,
  termsId: governanceIds.terms, logId: governanceIds.log, userId: governanceIds.staff,
};

for (const locale of ['ar', 'en'] as const) {
  test(`compiled artifact reviews every implemented screen in ${locale}`, async ({ page, context }, info) => {
    const server = await releaseServer(context);
    const copy = locale === 'ar' ? ar : en;
    const auth = locale === 'ar' ? authAr : authEn;
    const errors: string[] = [];
    page.on('pageerror', (error) => { errors.push(error.name); });
    await page.addInitScript((language) => {
      localStorage.setItem('brouj.locale', language);
      Object.assign(window, { cspViolations: [] });
      document.addEventListener('securitypolicyviolation', (event) => {
        (window as unknown as { cspViolations: string[] }).cspViolations.push(event.violatedDirective);
      });
    }, locale);
    const review: { route: string; title: string; durationMs: number; passed: boolean }[] = [];
    for (const route of routeDefinitions) {
      server.actor = route.access === 'customer' || route.access === 'member' ? 'customer' : ['staff', 'superAdmin'].includes(route.access) ? 'superAdmin' : 'anonymous';
      if (route.access === 'anonymous') {
        // Each auth-screen review begins a clean synthetic session, rather than simulating expiry.
        await page.evaluate(() => {
          localStorage.removeItem('brouj.actor-hint');
          sessionStorage.clear();
        });
      }
      const path = route.path.replace(/:([A-Za-z]+)/g, (_match, key: string) => values[key]!);
      const started = Date.now();
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(response?.headers()['cache-control']).toBe('no-cache');
      const title = route.path === '/' ? (locale === 'ar' ? 'بروج' : 'Brouj')
        : route.access === 'anonymous' ? (route.path === '/register' ? auth.registerTitle : route.path === '/admin/login' ? auth.staffTitle : auth.customerTitle)
          : copy[route.title as keyof typeof copy];
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const accessible = await page.locator('body').ariaSnapshot();
      expect(accessible.match(/^\s*- (button|textbox|combobox|checkbox)(?: \[[^\]]+\])?:/gm) ?? []).toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
      review.push({ route: route.path, title: route.title, durationMs: Date.now() - started, passed: true });
      await page.screenshot({ path: info.outputPath(`${locale}-${route.title}-${review.length}.png`), scale: 'css', animations: 'disabled', mask: [page.locator('input'), page.getByText(/Synthetic colleague|colleague@example.test|fixture-customer@example.test/)] });
      if (['/projects', '/account', '/admin/terms', '/admin/catalogue/projects'].includes(route.path)) {
        await page.screenshot({ path: `docs/evidence/part_13/${locale}-${info.project.name.includes('mobile') ? '375' : '1440'}-${route.path === '/projects' ? 'public' : route.path === '/account' ? 'account' : route.path.includes('catalogue') ? 'catalogue' : 'terms'}.png`, fullPage: true, scale: 'css', animations: 'disabled', mask: [page.locator('input'), page.getByText(/Synthetic colleague|colleague@example.test|fixture-customer@example.test/)] });
      }
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.tagName === 'BODY')).toBe(false);
    }
    expect(server.unknown).toEqual([]);
    expect(errors).toEqual([]);
    mkdirSync('docs/evidence/part_13', { recursive: true });
    writeFileSync(`docs/evidence/part_13/review-${locale}-${info.project.name}.json`, JSON.stringify({
      environment: 'Windows, headless Chromium, mobile emulation where configured, local trusted HTTPS artifact, synthetic API, no throttling',
      browserVersion: context.browser()?.version(), cache: 'HTTP cache disabled by Playwright request routing',
      locale, viewport: page.viewportSize(), artifact: pointer.directory, review,
    }, null, 2) + '\n');
  });
}

test('production hosting has safe headers, asset cache/404 behavior, no dev routes and isolated public startup', async ({ page, context, request }) => {
  await releaseServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  const loaded: string[] = [];
  page.on('request', (event) => { loaded.push(new URL(event.url()).pathname); });
  const response = await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Brouj', level: 1 })).toBeVisible();
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  for (const [key, entry] of Object.entries(manifest)) {
    if (key.includes('/Admin/') || key.includes('AdminLayout')) {
      expect(loaded).not.toContain('/' + entry.file);
    }
  }
  expect(loaded.filter((path) => path.startsWith('/api/v1/admin/'))).toEqual([]);
  for (const path of ['/assets/missing-abcdefgh.js', '/missing.css', '/.vite/manifest.json', '/src/main.tsx']) {
    const missing = await request.get(path);
    expect(missing.status()).toBe(404);
    expect(missing.headers()['cache-control']).toBe('no-store');
  }
  const asset = await request.get('/' + manifest['index.html']!.file);
  expect(asset.status()).toBe(200);
  expect(asset.headers()['cache-control']).toContain('immutable');
  for (const path of ['/__showcase', '/__auth']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  }
  await page.goto('/account/orders');
  await expect(page.locator('#auth-email')).toBeVisible();
});

test('failed production lazy chunk offers reload and recovers without exposing a development screen', async ({ page, context }) => {
  await releaseServer(context);
  await page.addInitScript(() => localStorage.setItem('brouj.locale', 'en'));
  let blocked = true;
  await page.route('**/' + manifest['src/Pages/Catalogue/CataloguePage.tsx']!.file, (route) => blocked ? route.abort('failed') : route.continue());
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore projects' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page could not open');
  blocked = false;
  await page.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projects');
});
