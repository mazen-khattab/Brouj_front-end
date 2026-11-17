import { test as base, expect } from './test';
export const profileRoute = /https:\/\/localhost:7249\/api\/v1\/(customers|users)\/me$/;
export const sessionCors = {
  'access-control-allow-origin': `https://localhost:${process.env.BROUJ_TEST_PORT ?? '5173'}`,
  'access-control-allow-credentials': 'true',
  'cache-control': 'no-store',
};
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(profileRoute, (route) => route.fulfill({ status: 401, headers: sessionCors, json: { status: 401 } }));
    await use(page);
  },
});
export { expect };
