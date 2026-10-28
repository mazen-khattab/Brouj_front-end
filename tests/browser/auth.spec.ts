import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { sessionCors } from './sessionFixtures';

const customer = { id: '00000000-0000-0000-0000-000000000001', fName: 'Customer', lName: 'Fixture', email: 'customer@example.test', phone: '01000000000', identityNumber: '10000000000000' };
const staff = { id: '00000000-0000-0000-0000-000000000002', name: 'Staff fixture', email: 'staff@example.test', phone: '01000000000', role: 0, deletedAt: null };
const cors = { ...sessionCors, 'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS', 'access-control-allow-headers': 'Content-Type, X-CSRF-TOKEN' };
async function serverMock(context: BrowserContext) {
  const state = { actor: null as 'customer' | 'staff' | null, expired: false, profileStatus: 0, logoutStatus: 0, refreshStatus: 0, invalidLogin: false };
  const calls: { path: string; method: string; body: unknown }[] = [];
  const proof = () => state.actor && !state.expired ? state.actor + '-proof' : 'anonymous-proof';
  await context.route('https://localhost:7249/api/**', async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    calls.push({ path, method: request.method(), body: request.postData() ? request.postDataJSON() as unknown : undefined });
    const ok = (data: unknown) => route.fulfill({ headers: cors, json: { success: true, data, message: null } });
    const fail = (status: number) => route.fulfill({ status, headers: cors, json: { status } });
    if (path.endsWith('/auth/csrf')) return ok({ requestToken: proof() });
    if (/\/(customers|users)\/me$/.test(path)) {
      if (state.profileStatus) return fail(state.profileStatus);
      if (!state.actor || state.expired) return fail(401);
      const selected = path.includes('/customers/') ? 'customer' : 'staff';
      return selected === state.actor ? ok(selected === 'customer' ? customer : staff) : fail(403);
    }
    if (request.method() === 'POST' && request.headers()['x-csrf-token'] !== proof()) return fail(400);
    if (path.includes('/auth/')) {
      if (path.endsWith('/refresh')) {
        if (state.refreshStatus) return fail(state.refreshStatus);
        await new Promise((resolve) => setTimeout(resolve, 50));
        state.expired = false;
      } else if (path.endsWith('/logout')) {
        if (state.logoutStatus) return fail(state.logoutStatus);
        state.actor = null; state.expired = false; return ok(customer.id);
      } else {
        if (state.invalidLogin) return route.fulfill({ status: 401, headers: cors, json: { success: false, code: 1, message: 'Not shown', errors: null } });
        state.actor = path.includes('/users/') ? 'staff' : 'customer'; state.expired = false;
      }
      return ok({ actorId: state.actor === 'staff' ? staff.id : customer.id, expiresAt: '2099-01-01T00:00:00Z' });
    }
    if (path === '/api/v1/reservations/me') return state.expired || !state.actor ? fail(401) : ok({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 });
    return fail(404);
  });
  return { state, calls };
}
async function locale(page: Page, language: 'ar' | 'en', hint?: 'customer' | 'staff') {
  await page.addInitScript(({ language, hint }) => {
    localStorage.setItem('brouj.locale', language);
    if (hint) localStorage.setItem('brouj.actor-hint', hint);
  }, { language, hint });
}
async function protectedRead(page: Page, count = 1) {
  return page.evaluate(async (count) => {
    const path = '/src/Services/Reservations.ts';
    const { getMyReservations } = await import(path) as typeof import('../../src/Services/Reservations');
    return Promise.allSettled(Array.from({ length: count }, () => getMyReservations())).then((results) => results.map((result) => result.status));
  }, count);
}

for (const language of ['ar', 'en'] as const) {
  test(`authentication pages and validation review in ${language}`, async ({ page, context }, testInfo) => {
    await serverMock(context); await locale(page, language); await page.goto('/__auth');
    const english = language === 'en';
    const modes = [
      ['customer', english ? 'Customer sign in' : 'دخول العملاء'],
      ['register', english ? 'Create an account' : 'إنشاء حساب'],
      ['staff', english ? 'Staff sign in' : 'دخول فريق العمل'],
    ] as const;
    for (const [mode, label] of modes) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByLabel(english ? 'Email address' : 'البريد الإلكتروني', { exact: true })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('main img').evaluateAll(async (nodes) => { await Promise.all(nodes.map((node) => node instanceof HTMLImageElement ? node.decode() : Promise.resolve())); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('html')).toHaveAttribute('dir', english ? 'ltr' : 'rtl');
      expect(await page.locator('#auth-email').evaluate((element) => getComputedStyle(element).borderTopLeftRadius)).toBe('16px');
      await expect(page.locator('#auth-email')).toHaveAttribute('dir', 'ltr');
      await page.screenshot({ path: testInfo.outputPath(`auth-${language}-${mode}.png`), fullPage: true, animations: 'disabled' });
    }
    await page.getByRole('button', { name: english ? 'Create an account' : 'إنشاء حساب', exact: true }).click();
    await page.getByRole('button', { name: english ? 'Create account' : 'إنشاء الحساب', exact: true }).click();
    await expect(page.locator('#auth-fName')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#auth-fName')).toBeFocused();
    await page.locator('#auth-email').fill('preserved@example.test');
    await page.getByRole('button', { name: english ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية' }).click();
    await expect(page.locator('#auth-email')).toHaveValue('preserved@example.test');
    await expect(page.locator('#auth-fName-error')).toHaveText(english ? 'هذا الحقل مطلوب.' : 'This field is required.');
  });
}

test('registration submits only actual fields, clears credentials, requires logout, and hydrates SuperAdmin', async ({ page, context }) => {
  const server = await serverMock(context); await locale(page, 'en'); await page.goto('/__auth');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  for (const [field, value] of Object.entries({ fName: 'Customer', lName: 'Fixture', phone: '01000000000', identityNumber: '10000000000000', email: 'customer@example.test', password: 'test-password' })) await page.locator('#auth-' + field).fill(value);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
  const registration = server.calls.find((call) => call.path.endsWith('/register'))!;
  expect(Object.keys(registration.body as object).sort()).toEqual(['email', 'fName', 'identityNumber', 'lName', 'password', 'phone']);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toMatch(/test-password|customer@example|10000000000000/);
  await page.getByRole('button', { name: 'Staff sign in', exact: true }).click();
  await expect(page.locator('#auth-password')).toHaveCount(0);
  await expect(page.getByText('Sign out of the current session before signing in with another account.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#auth-email')).toHaveValue('');
  await expect(page.locator('#auth-password')).toHaveValue('');
  await page.locator('#auth-email').fill('staff@example.test'); await page.locator('#auth-password').fill('x');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Super administrator', { exact: true })).toBeVisible();
});

test('invalid credentials preserve edits and logout failure never claims server revocation', async ({ page, context }) => {
  const server = await serverMock(context); server.state.invalidLogin = true;
  await locale(page, 'en'); await page.goto('/__auth');
  await page.locator('#auth-email').fill('customer@example.test'); await page.locator('#auth-password').fill('x');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('The sign-in details are incorrect.')).toBeVisible();
  await expect(page.locator('#auth-email')).toHaveValue('customer@example.test');
  server.state.invalidLogin = false;
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
  server.state.logoutStatus = 500;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Server sign-out was not confirmed. Your current session is retained; please retry sign-out.')).toBeVisible();
  await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
  server.state.logoutStatus = 0;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#auth-password')).toHaveValue('');
});

test('native browser concurrent 401s use one refresh and one replay per request', async ({ page, context }) => {
  const server = await serverMock(context); server.state.actor = 'customer';
  await locale(page, 'en', 'customer'); await page.goto('/__auth');
  await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
  server.state.expired = true;
  expect(await protectedRead(page, 3)).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
  expect(server.calls.filter((call) => call.path.endsWith('/refresh'))).toHaveLength(1);
  expect(server.calls.filter((call) => call.path.endsWith('/reservations/me'))).toHaveLength(6);
});

for (const channel of ['broadcast', 'storage'] as const) {
  test(`two tabs serialize refresh and invalidate logout using ${channel}`, async ({ context, page }) => {
    if (channel === 'storage') await context.addInitScript(() => Object.defineProperty(window, 'BroadcastChannel', { value: undefined, configurable: true }));
    const server = await serverMock(context); server.state.actor = 'customer';
    await locale(page, 'en', 'customer'); await page.goto('/__auth');
    await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
    const peer = await context.newPage(); await peer.goto('/__auth');
    await expect(peer.getByText('You are signed in as Customer Fixture.')).toBeVisible();
    server.state.expired = true;
    await Promise.all([protectedRead(page), protectedRead(peer)]);
    await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
    await expect(peer.getByText('You are signed in as Customer Fixture.')).toBeVisible();
    expect(server.calls.filter((call) => call.path.endsWith('/refresh'))).toHaveLength(1);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(peer.locator('#auth-email')).toBeVisible();
    await expect(peer.getByText('You are signed in as Customer Fixture.')).toHaveCount(0);
  });
}

test('without Web Locks, expired sessions require manual sign-in and never rotate automatically', async ({ context, page }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true }));
  const server = await serverMock(context); server.state.actor = 'customer'; server.state.expired = true;
  await locale(page, 'en', 'customer'); await page.goto('/__auth');
  await expect(page.getByText('Automatic session renewal is unavailable in this browser. Sign out, then sign in again.')).toBeVisible();
  expect(server.calls.filter((call) => call.path.endsWith('/refresh'))).toHaveLength(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#auth-email')).toBeVisible();
});

test('profile server outage offers safe retry without showing anonymous login or guessing refresh', async ({ context, page }) => {
  const server = await serverMock(context); server.state.profileStatus = 500; server.state.actor = 'customer';
  await locale(page, 'en', 'customer'); await page.goto('/__auth');
  await expect(page.getByRole('button', { name: 'Check session again' })).toBeVisible();
  await expect(page.locator('#auth-password')).toHaveCount(0);
  server.state.profileStatus = 0;
  await page.getByRole('button', { name: 'Check session again' }).click();
  await expect(page.getByText('You are signed in as Customer Fixture.')).toBeVisible();
  expect(server.calls.filter((call) => call.method === 'POST')).toHaveLength(0);
});
