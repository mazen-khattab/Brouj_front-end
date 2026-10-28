import type { BrowserContext, Page } from '@playwright/test';
import { sessionCors } from './sessionFixtures';

export type TestActor = 'anonymous' | 'customer' | 'admin' | 'superAdmin';
export async function routingServer(context: BrowserContext, actor: TestActor = 'anonymous') {
  const state = { actor, unavailable: false, delay: 0 };
  const calls: string[] = [];
  const cors = { ...sessionCors, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type, X-CSRF-TOKEN' };
  await context.route('https://localhost:7249/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const path = new URL(request.url()).pathname; calls.push(path);
    const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers: cors, json: { status } });
    if (/\/(customers|users)\/me$/.test(path)) {
      if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
      if (state.unavailable) return fail(503);
      if (state.actor === 'anonymous') return fail(401);
      if (path.includes('/customers/')) return state.actor === 'customer' ? ok({ id: '00000000-0000-0000-0000-000000000001', fName: 'Test', lName: 'Customer', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' }) : fail(403);
      return state.actor !== 'customer' ? ok({ id: '00000000-0000-0000-0000-000000000002', name: 'Test Staff', email: 'staff@example.test', phone: '01000000000', role: state.actor === 'superAdmin' ? 0 : 1, deletedAt: null }) : fail(403);
    }
    if (path.endsWith('/auth/csrf')) return ok({ requestToken: 'fixture-proof' });
    if (path.endsWith('/logout')) { state.actor = 'anonymous'; return ok('00000000-0000-0000-0000-000000000001'); }
    if (/\/(login|register)$/.test(path)) {
      state.actor = path.includes('/users/') ? 'admin' : 'customer';
      return ok({ actorId: state.actor === 'admin' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001', expiresAt: '2099-01-01T00:00:00Z' });
    }
    return fail(404);
  });
  return { state, calls };
}
export async function seedRouting(page: Page, actor: TestActor = 'anonymous', language: 'ar' | 'en' = 'en') {
  await page.addInitScript(({ actor, language }) => {
    if (!localStorage.getItem('brouj.locale')) localStorage.setItem('brouj.locale', language);
    if (actor !== 'anonymous') localStorage.setItem('brouj.actor-hint', actor === 'customer' ? 'customer' : 'staff');
  }, { actor, language });
}
export async function signIn(page: Page) {
  await page.locator('#auth-email').fill('fixture@example.test');
  await page.locator('#auth-password').fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
