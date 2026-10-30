import { expect, test } from '@playwright/test';
import { openPublicSessionActions } from './publicHeaderActions';
import { accountServer } from './accountFixtures';
import { adminOperationsServer } from './adminOperationsFixtures';
import { routingServer, seedRouting } from './routingFixtures';
import { catalogueServer, catalogueIds } from './catalogueFixtures';
import ar from '../../src/i18n/locales/ar/routing.json' with { type: 'json' };
import en from '../../src/i18n/locales/en/routing.json' with { type: 'json' };
import { routePaths } from '../../src/Router/routePaths';

for (const language of ['ar', 'en'] as const) {
  for (const actor of ['anonymous', 'customer', 'admin'] as const) {
    test(`disabled realtime makes zero hub requests across ${actor} routes in ${language}`, async ({ page, context }, info) => {
      const socketRequests: string[] = [];
      const apiRequests: string[] = [];
      page.on('websocket', (socket) => { socketRequests.push(socket.url()); });
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.port === '7249') {
          apiRequests.push(url.pathname);
        }
      });
      // EventSource does not create a WebSocket, so count its construction separately.
      await page.addInitScript(() => {
        const NativeEventSource = window.EventSource;
        Object.assign(window, { realtimeEventSourceCount: 0 });
        window.EventSource = class extends NativeEventSource {
          constructor(url: string | URL, options?: EventSourceInit) {
            const state = window as unknown as { realtimeEventSourceCount: number };
            state.realtimeEventSourceCount += 1;
            super(url, options);
          }
        };
      });
      if (actor === 'customer') {
        await accountServer(context);
      } else if (actor === 'admin') {
        await adminOperationsServer(context);
      } else {
        await routingServer(context);
        await catalogueServer(context);
      }
      await seedRouting(page, actor, language);
      const copy = language === 'ar' ? ar : en;
      const routes = actor === 'customer'
        ? [[`${routePaths.reservations}?status=0&pageSize=1`, copy.reservations], [`${routePaths.orders}?status=1&pageSize=1`, copy.orders], [routePaths.timePlan(catalogueIds.project), copy.timePlan]]
        : actor === 'admin'
          ? [['/admin/reservations?status=0', copy.reservations], ['/admin/orders?status=0', copy.orders]]
          : [['/projects', copy.projects], ['/terms', copy.terms]];
      for (const [path, title] of routes) {
        await page.goto(path!);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!);
        await expect(page.locator('html')).toHaveAttribute('lang', language);
        await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      if (actor === 'customer') {
        await expect(page.getByRole('heading', { name: 'Published schedule', exact: true })).toBeVisible();
      } else if (actor === 'admin') {
        await expect(page.getByText('O-PENDING', { exact: true }).first()).toBeVisible();
      }
      if (actor !== 'anonymous') {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `docs/evidence/part_12/${language}-${info.project.name.includes('mobile') ? '375' : '1440'}-${actor}.png`,
          fullPage: true, scale: 'css', animations: 'disabled',
          mask: [page.getByText(/Fixture Customer|Test Staff|staff@example\.test|customer@example\.test/)],
        });
        if (actor === 'customer') {
          await openPublicSessionActions(page);
        } else if (info.project.name.includes('mobile')) {
          await page.getByRole('button', { name: copy.menu, exact: true }).click();
        }
        await page.getByRole('button', { name: language === 'ar' ? 'تسجيل الخروج' : 'Sign out', exact: true }).click();
        await expect(page.locator('#auth-email')).toBeVisible();
      }
      // The development server's own HMR WebSocket is expected; the application starts none.
      expect(socketRequests.every((url) => new URL(url).host === 'localhost:5173')).toBe(true);
      expect(apiRequests.length).toBeGreaterThan(0);
      expect(apiRequests.every((path) => /^\/api\/v1\/(customers|users|auth|cities|areas|projects|units|terms-and-conditions|reservations|orders|admin\/(reservations|orders))(\/|$)/.test(path))).toBe(true);
      expect(await page.evaluate(() => (window as unknown as { realtimeEventSourceCount: number }).realtimeEventSourceCount)).toBe(0);
      await expect(page.getByRole('status').filter({ hasText: /^(Connected|Reconnecting|متصل|إعادة الاتصال)$/ })).toHaveCount(0);
    });
  }
}
