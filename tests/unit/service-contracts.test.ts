import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as API from '../../src/API';
import matrix from '../../docs/contracts/api-ui-matrix.json';
import inventory from '../../docs/contracts/backend-schemas.json';
import { apiPaths } from '../../src/Router/routePaths';
import type { RequestOptions } from '../../src/Types/transport';
import { approvedQuery } from '../../src/Services/query';
import { isRecord } from '../../src/Types/failures';

const modules = import.meta.glob('../../src/Services/*.ts');
const guid = '00000000-0000-0000-0000-000000000001';
const schemaMap = new Map(inventory.schemas.map((schema) => [schema.name, schema]));
let transport: ReturnType<typeof API.createApiTransport>;
let calls: InternalAxiosRequestConfig[];
let result: unknown;
beforeEach(() => {
  calls = [];
  transport = API.createApiTransport(async (config) => {
    calls.push(config);
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data: config.url?.endsWith('/csrf') ? { requestToken: 'fixture-proof' } : result, message: null } } satisfies AxiosResponse;
  });
  // Keep all service and transport behavior real; the only substituted I/O is the Axios adapter.
  vi.spyOn(API, 'apiRequest').mockImplementation(transport.request);
});
afterEach(() => { transport.dispose(); });

function sample(type: string): unknown {
  if (type.endsWith('?')) return sample(type.slice(0, -1));
  const list = type.match(/^IReadOnly(?:List|Collection)<(.+)>$/);
  if (list) return [sample(list[1]!)];
  if (type.startsWith('PaginationResult<')) return { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 };
  if (type === 'Guid') return guid;
  if (type === 'DateTimeOffset') return '2026-10-29T12:00:00+02:00';
  if (type === 'string') return 'example <&> / ?';
  if (['decimal', 'int', 'long'].includes(type)) return 2;
  if (type === 'bool') return false;
  if (type === 'IFormFile') return new File(['image fixture'], 'fixture.png', { type: 'image/png' });
  const enumeration = inventory.enums.find((item) => item.name === type);
  if (enumeration) return enumeration.members[0]!.value;
  const schema = schemaMap.get(type);
  if (!schema) throw new Error('Unmapped fixture type: ' + type);
  return Object.fromEntries(schema.properties.map((property) => [property.name, sample(property.csharpType)]));
}

for (const operation of matrix.operations) {
  test(operation.method + ' ' + operation.route + ' maps the verified body/query and unwraps its result', async () => {
    const module = await modules['../../src/' + operation.service + '.ts']!() as Record<string, unknown>;
    const name = operation.action[0]!.toLowerCase() + operation.action.slice(1);
    const run = module[name] as (args?: unknown, options?: RequestOptions) => Promise<unknown>;
    expect(typeof run).toBe('function');
    const routeParameters = [...operation.route.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
    const args: Record<string, unknown> = Object.fromEntries(routeParameters.map((key) => [key, 'route/value ?#&']));
    if (operation.body) args.body = sample(operation.body);
    if (operation.query) args.query = { ...(sample(operation.query) as object), unapproved: 'must-not-leak' };
    result = sample(operation.response.slice('ApiResponse<'.length, -1));
    const controller = new AbortController();
    const actual = Object.keys(args).length ? await run(args, { signal: controller.signal }) : await run({ signal: controller.signal });
    expect(actual).toEqual(result);
    const request = calls.find((config) => !config.url?.endsWith('/csrf'))!;
    expect(request.method?.toUpperCase()).toBe(operation.method);
    expect(request.url).toBe(operation.route.replace(/\{\w+\}/g, () => encodeURIComponent('route/value ?#&')));
    expect(request.signal).toBe(controller.signal);
    if (operation.query) {
      const expected = sample(operation.query);
      expect(request.params).toEqual(expected);
      expect(request.params).not.toHaveProperty('unapproved');
    } else expect(request.params).toBeUndefined();
    if (operation.contentType === 'multipart/form-data') {
      expect(request.data).toBeInstanceOf(FormData);
      const form = request.data as FormData;
      const keys = [...form.keys()];
      expect(keys).toEqual(operation.body === 'AddStageItemImageRequest' ? ['File', 'Description'] : ['File', 'AltText']);
      expect(form.get('File')).toBeInstanceOf(File);
      expect(request.headers.get('Content-Type')).toBe(false);
    } else if (operation.body) expect(JSON.parse(request.data as string)).toEqual(args.body);
    else expect(request.data).toBeUndefined();
    const unsafe = operation.method !== 'GET';
    expect(calls.filter((config) => config.url?.endsWith('/csrf'))).toHaveLength(unsafe ? 1 : 0);
    expect(request.headers.get('X-CSRF-TOKEN')).toBe(unsafe ? 'fixture-proof' : undefined);
    expect((request as InternalAxiosRequestConfig & { brouj: object }).brouj).toMatchObject({
      authenticated: operation.policy !== 'Anonymous', skipAuthenticationRecovery: operation.route.startsWith('/api/v1/auth/'),
    });
    if (operation.response === 'ApiResponse<Guid>') expect(actual).toBe(guid);
  });
}

test('query filtering keeps false/zero, omits null/undefined and never guesses an active filter', () => {
  expect(approvedQuery({ isActive: false, pageNumber: 0, search: null, unused: undefined }, ['isActive', 'pageNumber', 'search', 'unused'])).toEqual({ isActive: false, pageNumber: 0 });
  expect(approvedQuery({ isActive: null }, ['isActive'])).toEqual({});
});

test('route builders reject empty/dot traversal segments and encode arbitrary text', () => {
  for (const id of ['', '.', '..', '\ud800']) expect(() => apiPaths.Cities.getCityById(id)).toThrow();
  expect(apiPaths.Cities.getCityById('id/next?x#y')).toBe('/api/v1/cities/id%2Fnext%3Fx%23y');
});

test('metadata uploads omit nullable text and never send unapproved fields', async () => {
  result = guid;
  const { addProjectImage } = await import('../../src/Services/Projects');
  const body = { file: new File(['fixture'], 'image.png'), altText: null, unsafeUrl: 'https://other.test' };
  await addProjectImage({ id: guid, body });
  const form = calls[1]?.data as FormData;
  expect([...form.keys()]).toEqual(['File']);
});

test('all operation identifiers and source properties have explicit mappings', () => {
  expect(matrix.operations).toHaveLength(101);
  expect(new Set(matrix.operations.map((operation) => operation.service + '.' + operation.action)).size).toBe(101);
  expect(isRecord(apiPaths)).toBe(true);
});
