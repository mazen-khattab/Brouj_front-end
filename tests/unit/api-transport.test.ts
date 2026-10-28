import { afterEach, expect, test, vi } from 'vitest';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createApiTransport } from '../../src/API';
import { createCsrfCoordinator } from '../../src/Security/csrf';
import { createAuthenticationFailureChannel } from '../../src/Security/authenticationFailures';
import { ApiError, parseRetryAfter } from '../../src/Types/failures';
import type { ApiRequest } from '../../src/Types/transport';

const metadata = { operation: 'TestWrite', authenticated: true, skipAuthenticationRecovery: false };
const write: ApiRequest = { method: 'POST', path: '/api/v1/admin/cities', body: { name: 'Example' }, metadata };
const active: ReturnType<typeof createApiTransport>[] = [];
afterEach(() => { for (const transport of active.splice(0)) transport.dispose(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200, headers: Record<string, string> = {}): AxiosResponse {
  return { config, data, status, statusText: 'Test response', headers };
}
function ok(config: InternalAxiosRequestConfig, data: unknown = '00000000-0000-0000-0000-000000000001') {
  return response(config, { success: true, data, message: null });
}
function fixture(handler?: AxiosAdapter) {
  const calls: InternalAxiosRequestConfig[] = [];
  const security = createCsrfCoordinator();
  const auth = createAuthenticationFailureChannel();
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    return handler ? handler(config) : ok(config, config.url?.endsWith('/csrf') ? { requestToken: 'proof' } : 'result');
  };
  const transport = createApiTransport(adapter, security, auth);
  active.push(transport);
  return { transport, calls, security, auth };
}

test.each(['GET', 'HEAD', 'OPTIONS'] as const)('%s is safe and uses cookie credentials without proof', async (method) => {
  const { transport, calls } = fixture();
  await expect(transport.request({ ...write, method, path: '/api/v1/cities' })).resolves.toBe('result');
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ baseURL: 'https://localhost:7249', withCredentials: true, timeout: 15_000, withXSRFToken: false });
  expect(calls[0]?.headers.has('X-CSRF-TOKEN')).toBe(false);
  expect(calls[0]?.headers.has('Authorization')).toBe(false);
});

test('concurrent first writes await one bootstrap and attach its proof', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, calls } = fixture(async (config) => config.url?.endsWith('/csrf') ? gate.promise : ok(config));
  const results = Promise.all([transport.request(write), transport.request({ ...write, method: 'PATCH' }), transport.request({ ...write, method: 'DELETE' })]);
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  gate.resolve(ok(calls[0]!, { requestToken: 'shared-proof' }));
  await expect(results).resolves.toHaveLength(3);
  expect(calls.filter((config) => config.url?.endsWith('/csrf'))).toHaveLength(1);
  for (const config of calls.slice(1)) expect(config.headers.get('X-CSRF-TOKEN')).toBe('shared-proof');
  expect(localStorage.length).toBe(0);
});

test.each(['POST', 'PATCH', 'PUT', 'DELETE'] as const)('%s attaches proof', async (method) => {
  const { transport, calls } = fixture();
  await transport.request({ ...write, method });
  expect(calls).toHaveLength(2);
  expect(calls[1]?.headers.get('X-CSRF-TOKEN')).toBe('proof');
});

test('one canceled waiter does not cancel another write sharing bootstrap', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, calls } = fixture(async (config) => config.url?.endsWith('/csrf') ? gate.promise : ok(config));
  const abort = new AbortController();
  const canceled = expect(transport.request({ ...write, signal: abort.signal })).rejects.toMatchObject({ kind: 'canceled' });
  const surviving = transport.request(write);
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  abort.abort();
  await canceled;
  expect(calls[0]?.signal?.aborted).toBe(false);
  gate.resolve(ok(calls[0]!, { requestToken: 'shared' }));
  await surviving;
  expect(calls).toHaveLength(2);
});

test('all canceled waiters abort bootstrap and late proof cannot enter the cache', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, calls } = fixture(async (config) => config.url?.endsWith('/csrf') ? calls.length === 1 ? gate.promise : ok(config, { requestToken: 'fresh' }) : ok(config));
  const abort = new AbortController();
  const result = expect(transport.request({ ...write, signal: abort.signal })).rejects.toMatchObject({ kind: 'canceled' });
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  abort.abort();
  await result;
  expect(calls[0]?.signal?.aborted).toBe(true);
  gate.resolve(ok(calls[0]!, { requestToken: 'obsolete' }));
  await transport.request(write);
  expect(calls).toHaveLength(3);
  expect(calls[2]?.headers.get('X-CSRF-TOKEN')).toBe('fresh');
});

test('identity generation change rejects waiting writes even when bootstrap ignores abort', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, calls, security } = fixture(async (config) => config.url?.endsWith('/csrf') ? calls.length === 1 ? gate.promise : ok(config, { requestToken: 'new-session' }) : ok(config));
  const first = expect(transport.request(write)).rejects.toMatchObject({ kind: 'canceled' });
  const second = expect(transport.request(write)).rejects.toMatchObject({ kind: 'canceled' });
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  security.invalidate();
  await Promise.all([first, second]);
  gate.resolve(ok(calls[0]!, { requestToken: 'old-session' }));
  await transport.request(write);
  expect(calls).toHaveLength(3);
  expect(calls[2]?.headers.get('X-CSRF-TOKEN')).toBe('new-session');
});

test('a write created in an earlier generation cannot dispatch with a newly cached proof', async () => {
  const { transport, calls, security } = fixture();
  await transport.csrf();
  const result = expect(transport.request(write)).rejects.toMatchObject({ kind: 'canceled' });
  security.invalidate();
  await result;
  expect(calls).toHaveLength(1);
});

test.each([null, {}, { requestToken: '' }, { requestToken: 123 }, { requestToken: ' ' }, { requestToken: 'bad\r\nheader' }])('invalid proof %j fails closed', async (data) => {
  const { transport, calls } = fixture(async (config) => ok(config, data));
  await expect(transport.request(write)).rejects.toMatchObject({ kind: 'transport' });
  expect(calls).toHaveLength(1);
});

test('bootstrap failure stops unsafe dispatch, exposes Retry-After and never triggers auth recovery', async () => {
  const { transport, calls, auth } = fixture(async (config) => response(config, { title: 'Too many requests.', traceId: 'safe-trace' }, 429, { 'Retry-After': '12' }));
  const listener = vi.fn();
  auth.subscribe(listener);
  await expect(transport.request(write)).rejects.toMatchObject({ kind: 'transport', status: 429, retryAfter: 12, diagnosticTrace: 'safe-trace' });
  expect(calls).toHaveLength(1);
  expect(listener).not.toHaveBeenCalled();
});

test('a bootstrap 401 is not attributed to a protected business request', async () => {
  const { transport, auth, calls } = fixture(async (config) => response(config, {}, 401));
  const listener = vi.fn(); auth.subscribe(listener);
  await expect(transport.request(write)).rejects.toMatchObject({ status: 401 });
  expect(listener).not.toHaveBeenCalled();
  expect(calls).toHaveLength(1);
});

test.each(['login', 'logout', 'refresh', 'register'])('%s uses proof and invalidates it after an identity-changing request', async (action) => {
  const { transport, calls, security } = fixture();
  await transport.request({ ...write, path: '/api/v1/auth/customers/' + action,
    metadata: { ...metadata, authenticated: false, skipAuthenticationRecovery: true, changesIdentity: true } });
  expect(security.generation()).toBe(1);
  await transport.request(write);
  expect(calls.map((config) => config.url)).toEqual(['/api/v1/auth/csrf', '/api/v1/auth/customers/' + action, '/api/v1/auth/csrf', write.path]);
  expect(calls[1]?.headers.get('X-CSRF-TOKEN')).toBe('proof');
});

test('FormData is passed unchanged and has no forced JSON or multipart content type', async () => {
  const form = new FormData();
  form.append('File', new File(['image'], 'image.png', { type: 'image/png' }));
  form.append('AltText', 'Example');
  const { transport, calls } = fixture();
  await transport.request({ ...write, body: form });
  expect(calls[1]?.data).toBe(form);
  expect(calls[1]?.headers.get('Content-Type')).toBe(false);
  expect(calls[1]?.headers.get('X-CSRF-TOKEN')).toBe('proof');
});

test('feature errors and Problem Details remain distinct and never expose raw messages', async () => {
  const { transport } = fixture(async (config) => response(config, { success: false, code: 19, message: 'sensitive stack trace', errors: { name: ['Required.'], unsafe: ['System.DataException\nat secret()'] } }, 400));
  const error = await transport.request({ ...write, method: 'GET' }).catch((failure: unknown) => failure);
  expect(error).toMatchObject({ kind: 'feature', status: 400, featureCode: 19, fieldErrors: { name: ['Required.'] } });
  expect(error).toBeInstanceOf(ApiError);
  expect(JSON.stringify(error)).not.toContain('sensitive');
  expect((error as Error).message).not.toContain('stack');
});

test.each([null, 'database stack trace', [], { errors: { field: 'wrong-shape' }, traceId: '<script>' }])('malformed error %j becomes a safe transport failure', async (body) => {
  const { transport } = fixture(async (config) => response(config, body, 500));
  await expect(transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'transport', status: 500, fieldErrors: {}, diagnosticTrace: undefined });
});

test('unknown feature code keeps a generic presentation and malformed success is rejected', async () => {
  const failed = fixture(async (config) => response(config, { success: false, code: 9999, message: 'untrusted' }, 400));
  await expect(failed.transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'feature', featureCode: undefined });
  const malformed = fixture(async (config) => response(config, { success: true }));
  await expect(malformed.transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'transport', status: 200 });
});

test('validation Problem Details preserves bounded field errors without copying its detail', async () => {
  const { transport } = fixture(async (config) => response(config, { status: 400, title: 'Invalid', detail: 'private stack', traceId: 'trace-123', errors: { email: ['Invalid format.'] } }, 400));
  const failure = await transport.request({ ...write, method: 'GET' }).catch((error: unknown) => error);
  expect(failure).toMatchObject({ kind: 'transport', status: 400, featureCode: undefined, diagnosticTrace: 'trace-123', fieldErrors: { email: ['Invalid format.'] } });
  expect(JSON.stringify(failure)).not.toContain('private');
});

test.each([['ERR_NETWORK', 'network'], ['ECONNABORTED', 'transport'], ['ETIMEDOUT', 'transport']])('%s is normalized without retaining request credentials', async (code, kind) => {
  const { transport } = fixture(async () => { throw { isAxiosError: true, code, message: 'secret', config: { password: 'private' } }; });
  const error = await transport.request({ ...write, method: 'GET' }).catch((failure: unknown) => failure);
  expect(error).toMatchObject({ kind });
  expect(JSON.stringify(error)).not.toMatch(/secret|private|password|config/);
});

test('network abort and unknown exceptions are normalized', async () => {
  const aborted = fixture(async () => { throw new DOMException('private', 'AbortError'); });
  await expect(aborted.transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'canceled' });
  const unknown = fixture(async () => { throw new Error('private'); });
  await expect(unknown.transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'unknown' });
});

test('401 observation is opt-in, disposable and never replays the request', async () => {
  const { transport, auth, calls } = fixture(async (config) => response(config, { status: 401 }, 401));
  const listener = vi.fn(() => { throw new Error('observer'); });
  const unsubscribe = auth.subscribe(listener);
  await expect(transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ status: 401 });
  expect(listener).toHaveBeenCalledTimes(1);
  await expect(transport.request({ ...write, method: 'GET', metadata: { ...metadata, skipAuthenticationRecovery: true } })).rejects.toMatchObject({ status: 401 });
  unsubscribe();
  await expect(transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ status: 401 });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(calls).toHaveLength(3);
});

test('old private responses cannot reach the next identity or invoke its failure observer', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, security, calls, auth } = fixture(async () => gate.promise);
  const listener = vi.fn(); auth.subscribe(listener);
  const result = expect(transport.request({ ...write, method: 'GET' })).rejects.toMatchObject({ kind: 'canceled' });
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  security.invalidate();
  gate.resolve(ok(calls[0]!, { private: 'old' }));
  await result;
  expect(listener).not.toHaveBeenCalled();
});

test.each([400, 429, 500])('%s unsafe failures are never automatically retried', async (status) => {
  const { transport, calls } = fixture(async (config) => config.url?.endsWith('/csrf') ? ok(config, { requestToken: 'proof' }) : response(config, {}, status));
  await expect(transport.request(write)).rejects.toMatchObject({ status });
  expect(calls).toHaveLength(2);
});

test.each(['https://other.test/api/v1/cities', '//other.test/api/v1/cities', '/api/v1/../private', '/api/v1/cities?url=other', '/api/v1/cities\\private'])('rejects arbitrary path %s without dispatch', async (path) => {
  const { transport, calls } = fixture();
  await expect(transport.request({ ...write, path })).rejects.toBeInstanceOf(ApiError);
  expect(calls).toHaveLength(0);
});

test('disposing transport clears proof, rejects pending bootstrap and permits no further network work', async () => {
  const gate = deferred<AxiosResponse>();
  const { transport, calls } = fixture(async () => gate.promise);
  const result = expect(transport.request(write)).rejects.toMatchObject({ kind: 'canceled' });
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  transport.dispose();
  await result;
  gate.resolve(ok(calls[0]!, { requestToken: 'obsolete' }));
  await expect(transport.csrf()).rejects.toMatchObject({ kind: 'canceled' });
  await expect(transport.request(write)).rejects.toBeInstanceOf(ApiError);
  expect(calls).toHaveLength(1);
});

test('Retry-After accepts seconds and HTTP dates, rejecting malformed/negative input', () => {
  const now = Date.UTC(2026, 9, 29, 12);
  expect(parseRetryAfter('7', now)).toBe(7);
  expect(parseRetryAfter('Thu, 29 Oct 2026 12:00:09 GMT', now)).toBe(9);
  expect(parseRetryAfter('Thu, 29 Oct 2026 11:59:59 GMT', now)).toBe(0);
  for (const value of ['-1', '1.5', 'nonsense', '9007199254740992', 10, undefined]) expect(parseRetryAfter(value, now)).toBeUndefined();
});
