import { expect, test } from './sessionFixtures';

const cors = {
  'access-control-allow-origin': 'https://localhost:5173',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'Content-Type, X-CSRF-TOKEN',
  'access-control-expose-headers': 'Retry-After',
  'cache-control': 'no-store',
};

test('real browser transport sends cookies and CSRF with a browser-generated multipart boundary', async ({ page, context }) => {
  let bootstrapCalls = 0;
  let uploadHeaders: Record<string, string> = {};
  let uploadBody = '';
  const mutationId = '00000000-0000-0000-0000-000000000001';
  await context.addCookies([{ name: '__Host-brouj-fixture', value: 'test-only-cookie', url: 'https://localhost:7249', httpOnly: true, secure: true, sameSite: 'Strict' }]);
  await page.route('https://localhost:7249/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.url().endsWith('/customers/me')) return route.fulfill({ status: 403, headers: cors, json: { status: 403 } });
    if (request.url().endsWith('/users/me')) return route.fulfill({ headers: cors, json: { success: true, data: { id: mutationId, name: 'Staff fixture', email: 'staff@example.test', phone: '01000000000', role: 1, deletedAt: null }, message: null } });
    if (request.url().endsWith('/auth/csrf')) {
      bootstrapCalls += 1;
      return route.fulfill({ headers: cors, json: { success: true, data: { requestToken: 'browser-fixture-proof' }, message: null } });
    }
    expect(request.method()).toBe('POST');
    expect(request.url()).toBe('https://localhost:7249/api/v1/admin/projects/' + mutationId + '/images');
    uploadHeaders = await request.allHeaders();
    uploadBody = request.postData() ?? '';
    return route.fulfill({ headers: cors, json: { success: true, data: mutationId, message: null } });
  });
  await page.goto('/');
  if (test.info().project.name.includes('mobile')) await page.getByRole('button', { name: 'القائمة', exact: true }).click();
  // Wait for the actual mounted session rather than importing a second HMR-versioned singleton.
  await expect(page.getByRole('button', { name: 'تسجيل الخروج', exact: true })).toBeVisible();
  const result = await page.evaluate(async (id) => {
    const servicePath = '/src/Services/Projects.ts';
    const { addProjectImage } = await import(servicePath) as typeof import('../../src/Services/Projects');
    return addProjectImage({ id, body: { file: new File(['browser fixture'], 'fixture.png', { type: 'image/png' }), altText: 'Architectural fixture' } });
  }, mutationId);
  expect(result).toBe(mutationId);
  expect(bootstrapCalls).toBe(1);
  expect(uploadHeaders['x-csrf-token']).toBe('browser-fixture-proof');
  expect(uploadHeaders.cookie).toContain('__Host-brouj-fixture=test-only-cookie');
  expect(uploadHeaders['content-type']).toMatch(/^multipart\/form-data; boundary=.+/);
  expect(uploadBody).toContain('name="File"; filename="fixture.png"');
  expect(uploadBody).toContain('name="AltText"');
  expect(uploadBody).toContain('Architectural fixture');
  expect([...uploadBody.matchAll(/;\sname="([^"]+)"/g)].map((match) => match[1])).toEqual(['File', 'AltText']);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain('browser-fixture-proof');
});

test('real HTTP 429 exposes Retry-After and safe bilingual presentation without a bootstrap', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://localhost:7249/api/**', async (route) => {
    if (/\/(customers|users)\/me$/.test(route.request().url())) return route.fulfill({ status: 401, headers: cors, json: { status: 401 } });
    requests.push(route.request().url());
    return route.fulfill({ status: 429, headers: { ...cors, 'Retry-After': '9' },
      json: { status: 429, title: 'Untrusted diagnostic must not be shown', detail: 'private stack', traceId: 'browser-safe-trace' } });
  });
  await page.goto('/');
  const failure = await page.evaluate(async () => {
    const citiesPath = '/src/Services/Cities.ts';
    const failuresPath = '/src/i18n/apiFailures.ts';
    const localePath = '/src/i18n/instance.ts';
    const { getCities } = await import(citiesPath) as typeof import('../../src/Services/Cities');
    const { apiFailureMessage } = await import(failuresPath) as typeof import('../../src/i18n/apiFailures');
    const { createLocaleInstance } = await import(localePath) as typeof import('../../src/i18n/instance');
    try { await getCities(); throw new Error('Expected a rejected request'); }
    catch (error: unknown) {
      const normalized = error as import('../../src/Types/failures').ApiError;
      const message = apiFailureMessage(normalized);
      return { kind: normalized.kind, status: normalized.status, retryAfter: normalized.retryAfter,
        diagnosticTrace: normalized.diagnosticTrace, message: normalized.message,
        en: createLocaleInstance('en').t(message.key, { ns: message.namespace }),
        ar: createLocaleInstance('ar').t(message.key, { ns: message.namespace }) };
    }
  });
  expect(failure).toMatchObject({ kind: 'transport', status: 429, retryAfter: 9, diagnosticTrace: 'browser-safe-trace',
    en: 'Too many requests. Wait before trying again.', ar: 'عدد الطلبات كبير. يرجى الانتظار قبل المحاولة مجددًا.' });
  expect(JSON.stringify(failure)).not.toMatch(/Untrusted|private stack/);
  expect(requests).toEqual(['https://localhost:7249/api/v1/cities']);
});
